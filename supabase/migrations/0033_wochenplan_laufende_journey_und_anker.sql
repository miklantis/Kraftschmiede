-- 0033 Wochenplan der laufenden Journey und verwaiste Phasen-Anker
-- ----------------------------------------------------------------
-- Issue #235. Zwei Luecken, die zwischen Migration 0031 und der Auslieferung
-- des zugehoerigen Codes entstanden sind: in der Zwischenzeit wurde die
-- laufende Journey gewechselt.
--
--   1. Wochenplan der laufenden Journey.
--      0031 hat die damals laufende Journey gefuellt. Die neue Journey
--      ("Wiedereinstieg & Aufbau") entstand danach - aber noch mit dem Code
--      von vor der Auslieferung, der den Plan beim Journey-Start nicht
--      mitkopiert hat. Ihre Kraft- und Testphase stehen deshalb ohne Plan da.
--      Das Kopieren beim Start ist inzwischen in Ordnung
--      (src/lib/journeyWrite.ts); hier wird nur der Bestand nachgezogen.
--      Gerechnet wird wie in 0031: Zuordnung ueber Art (Kraft/Schnellkraft vs.
--      Test) und Phasenlaenge. Archivierte Journeys bleiben als Aufzeichnung
--      unberuehrt.
--   2. Verwaiste Phasen-Anker.
--      Beim Journey-Start ohne Lastfaktor raeumt die App die Referenzgewichte.
--      Sie hat dabei nur reference_weight geleert, nicht den mit 0031 neu
--      dazugekommenen Phasenbezug reference_phase_id. Uebrig blieben fuenf
--      Hauptuebungen, die auf eine Phase der abgeloesten Journey zeigen, ohne
--      Gewicht dahinter - fuer den kommenden Kraftzyklus ein Anker, der auf
--      nichts zeigt. Der Code raeumt jetzt beides zusammen
--      (clearReferenzgewichte in src/lib/journeyStore.ts); hier wird der
--      Bestand bereinigt.
--
-- Idempotent: die Plaene setzen feste Werte, die Bereinigung greift nur bei
-- Zeilen ohne Referenzgewicht. Mehrfaches Ausfuehren aendert nach dem ersten
-- Lauf nichts mehr.

-- ----------------------------------------------------------------
-- 1. Wochenplaene der Phasen aktiver Journeys nachziehen
-- ----------------------------------------------------------------

drop table if exists pg_temp.wochenplaene;

create temporary table wochenplaene (art text, wochen integer, plan jsonb);

insert into wochenplaene (art, wochen, plan) values
  ('kraft', 3, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 3, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('kraft', 4, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 3, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 4, "sets": 4, "reps": 2, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('kraft', 5, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Gleiche Wiederholungen, Gewicht darf steigen"}, {"week": 3, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 4, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 5, "sets": 4, "reps": 2, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('kraft', 6, '[{"week": 1, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Startgewicht setzen, alle Sätze sauber"}, {"week": 2, "sets": 4, "reps": 5, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Gleiche Wiederholungen, Gewicht darf steigen"}, {"week": 3, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 4, "sets": 4, "reps": 4, "repsMax": null, "rir": 2, "loadPct": 1, "note": "Gleiche Wiederholungen, Gewicht darf steigen"}, {"week": 5, "sets": 4, "reps": 3, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Eine Wiederholung weniger, dafür schwerer"}, {"week": 6, "sets": 4, "reps": 2, "repsMax": null, "rir": 1, "loadPct": 1, "note": "Schwerste Woche der Phase"}]'::jsonb),
  ('test',  1, '[{"week": 1, "sets": 3, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach Ruhetage und 1RM-Test"}]'::jsonb),
  ('test',  2, '[{"week": 1, "sets": 3, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach Ruhetage und 1RM-Test"}, {"week": 2, "sets": 3, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach Ruhetage und 1RM-Test"}]'::jsonb);

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
-- 2. Verwaiste Phasen-Anker bereinigen
-- ----------------------------------------------------------------

update public.exercises
   set reference_phase_id = null
 where reference_phase_id is not null
   and reference_weight is null;
