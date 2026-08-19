-- 0031 Wochenplan der Phase und Phasenbezug des Ankers
-- ----------------------------------------------------------------
-- Grundlage fuer den gesteuerten Kraftzyklus (Issue #225, Schritt 2 / #227):
-- eine Kraftphase gibt Woche fuer Woche Saetze, Wiederholungen und
-- Ziel-Anstrengung vor; gesteuert wird nur noch das Gewicht. Diese Migration
-- legt die Traeger dafuer an und fuellt sie. Der Code nutzt den Plan noch
-- nicht - bis Schritt 3 aendert sich am Verhalten der App nichts.
--
-- 1) journey_template_phases.week_plan / phases.week_plan (jsonb, nullable)
--    Der Wochenplan der Phase: je Woche Saetze, Wiederholungen (reps, bei
--    Bandangabe zusaetzlich repsMax), Ziel-Anstrengung als Wiederholungen in
--    Reserve (rir), Anteil am Arbeitsgewicht (loadPct) und ein kurzer
--    Wochenziel-Text (note). Leer/null = die Phase laeuft wie bisher ueber den
--    Coach. Die Form steht in src/engine/weekPlan.ts. Weil der Plan an der
--    Phase haengt, wandert er beim Journey-Start automatisch mit - ohne neue
--    Tabelle und ohne eigene Kopierlogik.
-- 2) exercises.reference_phase_id (uuid, nullable, FK auf phases)
--    Zu welcher Phase das eingefrorene reference_weight gehoert. Ohne diesen
--    Bezug laesst sich "Anker dieser Phase" nicht von "noch kein Anker"
--    unterscheiden, und die Last wuerde pro Einheit statt pro Woche steigen.
--    Verschwindet die Phase, faellt der Bezug auf null zurueck und der Anker
--    wird neu gesetzt. Diese Spalte gab es unter demselben Namen schon einmal
--    (Migration 0027), sie wurde mit 0029 wieder entfernt.
--
-- Gefuellt wird:
--   a) Wochenplaene der Kraft-, Schnellkraft- und Testphasen aller Vorlagen,
--      abgeleitet aus der jeweiligen Phasenlaenge. Der Seed
--      (src/seed/definitions.ts + src/lib/seed.ts) fuehrt dieselben Werte.
--   b) Dieselben Plaene fuer die Phasen laufender Journeys - konkret
--      "Maximalkraft" (5 Wochen) und "Uebergang / Test" (1 Woche) in
--      "Rueckkehr 2026". Archivierte und abgeschlossene Journeys bleiben als
--      Aufzeichnung unberuehrt. Phasenlaengen werden nicht angefasst, damit
--      sich die Zeitachse unter der laufenden Journey nicht verschiebt.
--   c) deload_week aller Kraftphasen (Fokus 'strength') auf null: die
--      Entlastung steckt kuenftig in der Kombiwoche der Testphase. Ohne das
--      haette die laufende Journey eine Entlastung in Woche 4, den Peak in
--      Woche 5 und den Deload der Kombiwoche direkt danach - zwei Entlastungen
--      in drei Wochen. Schnellkraftphasen ('power') behalten ihre
--      Entlastungswoche vorerst; das entscheidet Schritt 3 (#228).
--   d) Einmalige Anker-Vorbelegung fuer die laufende Journey: sie steht in
--      Woche 3 von 5 der Kraftphase, ein frisch aus dem 1RM gerechneter Anker
--      laege darunter und waere ein Rueckschritt. Deshalb bekommen die
--      Hauptuebungen ihr zuletzt gearbeitetes Gewicht als Anker (Bench Press
--      37,5 / Deadlift 50 / Bent Row 40 / Push Press 32,5 / Back Squat 27,5),
--      gebunden an die laufende Kraftphase.
--
-- Die Wiederholungsleitern: 3 Wochen 5,4,3 - 4 Wochen 5,4,3,2 - 5 Wochen
-- 5,5,4,3,2 - 6 Wochen 5,5,4,4,3,2. Durchgehend 4 Arbeitssaetze, RIR 2, in den
-- beiden schwersten Wochen RIR 1 (unter 4 Wochen nur in der letzten). Die
-- Kombiwoche der Testphase: 3 Saetze zu 3-5 Wiederholungen mit 60 % vom
-- Arbeitsgewicht, danach Ruhetage und der 1RM-Test.
--
-- Idempotent: Spalten mit "if not exists", Plaene und deload_week setzen feste
-- Werte, die Anker-Vorbelegung greift nur, solange noch kein Phasen-Anker
-- gesetzt ist (reference_phase_id is null) - ein zweiter Lauf ueberschreibt
-- also keinen inzwischen fortgeschriebenen Stand.

-- ----------------------------------------------------------------
-- 1. Neue Spalten
-- ----------------------------------------------------------------

alter table public.journey_template_phases
  add column if not exists week_plan jsonb;

alter table public.phases
  add column if not exists week_plan jsonb;

alter table public.exercises
  add column if not exists reference_phase_id uuid
    references public.phases(id) on delete set null;

-- ----------------------------------------------------------------
-- 2. Die Wochenplaene, einmal aufgeschrieben
-- ----------------------------------------------------------------
-- Zugeordnet wird ueber Art (Kraft/Schnellkraft vs. Test) und Phasenlaenge.
-- Als temporaere Tabelle, damit Vorlagen und laufende Journeys nachweislich
-- dieselben Werte bekommen; sie verschwindet mit der Sitzung von selbst.

drop table if exists pg_temp.wochenplaene;

create temporary table wochenplaene (art text, wochen integer, plan jsonb);

insert into wochenplaene (art, wochen, plan) values
  ('kraft', 3, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 3, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('kraft', 4, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 3, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 4, "sets": 4, "reps": 2, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('kraft', 5, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Gleiche Wiederholungen, Gewicht darf steigen"}, {"week": 3, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 4, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 5, "sets": 4, "reps": 2, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('kraft', 6, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Gleiche Wiederholungen, Gewicht darf steigen"}, {"week": 3, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 4, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Gleiche Wiederholungen, Gewicht darf steigen"}, {"week": 5, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 6, "sets": 4, "reps": 2, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('test',  1, '[{"week": 1, "sets": 3, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach Ruhetage und 1RM-Test"}]'::jsonb),
  ('test',  2, '[{"week": 1, "sets": 3, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach Ruhetage und 1RM-Test"}, {"week": 2, "sets": 3, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach Ruhetage und 1RM-Test"}]'::jsonb);

-- ----------------------------------------------------------------
-- 3. Wochenplaene setzen: Vorlagen und Phasen laufender Journeys
-- ----------------------------------------------------------------

update public.journey_template_phases p
   set week_plan = pl.plan
  from wochenplaene pl
 where p.focus in ('strength', 'power', 'test')
   and pl.art = (case when p.focus = 'test' then 'test' else 'kraft' end)
   and pl.wochen = p.weeks
   and p.week_plan is distinct from pl.plan;

update public.phases p
   set week_plan = pl.plan
  from wochenplaene pl,
       public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus in ('strength', 'power', 'test')
   and pl.art = (case when p.focus = 'test' then 'test' else 'kraft' end)
   and pl.wochen = p.weeks
   and p.week_plan is distinct from pl.plan;

-- ----------------------------------------------------------------
-- 4. Kraftphasen ohne Entlastungswoche
-- ----------------------------------------------------------------

update public.journey_template_phases
   set deload_week = null
 where focus = 'strength'
   and deload_week is not null;

update public.phases p
   set deload_week = null
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'strength'
   and p.deload_week is not null;

-- ----------------------------------------------------------------
-- 5. Einmalige Anker-Vorbelegung der laufenden Journey
-- ----------------------------------------------------------------
-- Anker sind die zuletzt gearbeiteten Gewichte, gebunden an die laufende
-- Kraftphase. Greift nur, solange die Uebung noch keinen Phasen-Anker traegt.

with kraftphase as (
    -- Die laufende Kraftphase der aktiven Journey ("Maximalkraft" in
    -- "Rueckkehr 2026"). Gaebe es mehrere, gilt die frueheste.
    select p.id, p.user_id
      from public.phases p
      join public.journeys j on j.id = p.journey_id
     where j.status = 'active'
       and p.focus = 'strength'
     order by p.position
     limit 1
  ),
  anker(uebung, gewicht) as (
    values
      ('bench_press', 37.5),
      ('deadlift',    50.0),
      ('bent_row',    40.0),
      ('push_press',  32.5),
      ('back_squat',  27.5)
  )
update public.exercises e
   set reference_weight = anker.gewicht,
       reference_phase_id = kraftphase.id
  from anker, kraftphase
 where e.key = anker.uebung
   and e.user_id = kraftphase.user_id
   and e.reference_phase_id is null;
