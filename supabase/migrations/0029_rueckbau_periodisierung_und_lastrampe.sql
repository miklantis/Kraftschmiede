-- 0029 Ruecknahme der Auslieferungen vom 18.08.2026
-- ----------------------------------------------------------------
-- Der Nutzer laesst die App auf den Stand vom 17.08. zuruecksetzen (Issue #218).
-- Der Code geht ueber einen Revert zurueck, die Datenbank haengt nicht am
-- Deploy - deshalb macht diese Migration rueckgaengig, was 0026 bis 0028 auf
-- der Datenbank angerichtet haben:
--
--   1. 0026 hat die Phasen von sechs Journey-Vorlagen ersetzt (flachere
--      Satzrampen, konstante Kraftphasen, zusaetzliche Bloecke) und zwei
--      Zusammenfassungen umgeschrieben. Beides geht auf den Stand zurueck, den
--      der Seed vor dem 18.08. vorgab (src/seed/definitions.ts).
--   2. 0026 hat ausserdem die Phasen laufender Journeys angeglichen. Auch die
--      gehen wieder auf die Werte ihrer Vorlage zurueck.
--   3. 0027 hat intensity_start / intensity_end sowie den Phasenbezug des
--      Ankers (exercises.reference_phase_id) angelegt, 0028 hat die
--      Prozentwerte gefuellt. Ohne die Lastrampe im Code haben diese Spalten
--      keine Bedeutung mehr und werden entfernt.
--
-- 0026 bis 0028 bleiben als Verlauf im Repo stehen, weil sie ausgefuehrt
-- wurden. Wer das Schema neu aufbaut, laeuft ueber sie hinweg und landet mit
-- dieser Datei am selben Punkt wie die Live-Datenbank.
--
-- Idempotent: Vorlagen-Phasen werden komplett ersetzt (loeschen + neu
-- einfuegen), Updates setzen feste Werte, die Spalten werden mit
-- "if exists" entfernt. Mehrfaches Ausfuehren fuehrt zum selben Stand.
-- Vorlagen sind in der App nicht editierbar, es geht dabei nichts verloren.

-- ----------------------------------------------------------------
-- 1. Phasen der sechs umgebauten Vorlagen auf den Stand vor 0026
-- ----------------------------------------------------------------

delete from public.journey_template_phases p
 using public.journey_templates t
 where p.journey_template_id = t.id
   and t.key in (
     'reentry_build',
     'hypertrophy_block',
     'strength_peak',
     'conditioning',
     'block_3m',
     'periodized_6m'
   );

insert into public.journey_template_phases
  (user_id, journey_template_id, name, focus, weeks,
   sets_start, sets_end, deload_week, rep_target_min, rep_target_max,
   position, load_factor)
select t.user_id, t.id, n.name, n.focus, n.weeks,
       n.sets_start, n.sets_end, n.deload_week, n.rep_min, n.rep_max,
       n.pos, 1.0
  from public.journey_templates t
  join (
    values
      -- Wiedereinstieg & Aufbau (13 Wochen)
      ('reentry_build',     0, 'Wiedereinstieg',   'reentry',     2, 2, 2, null::integer, 5,  8),
      ('reentry_build',     1, 'Hypertrophie',     'hypertrophy', 5, 2, 6, 4,             8, 12),
      ('reentry_build',     2, 'Maximalkraft',     'strength',    5, 3, 5, 4,             4,  6),
      ('reentry_build',     3, 'Übergang / Test',  'test',        1, 2, 2, null,          2,  4),
      -- Hypertrophie-Block (9 Wochen)
      ('hypertrophy_block', 0, 'Akkumulation I',   'hypertrophy', 4, 3, 6, null,          8, 12),
      ('hypertrophy_block', 1, 'Deload',           'maintenance', 1, 2, 2, 1,             8, 10),
      ('hypertrophy_block', 2, 'Akkumulation II',  'hypertrophy', 4, 4, 6, 4,             8, 12),
      -- Maximalkraft / Peaking (9 Wochen)
      ('strength_peak',     0, 'Kraftbasis',       'strength',    4, 3, 5, null,          4,  6),
      ('strength_peak',     1, 'Intensivierung',   'power',       3, 3, 4, 3,             3,  5),
      ('strength_peak',     2, 'Peak & Test',      'test',        2, 2, 3, null,          2,  4),
      -- Kraftausdauer / Kondition (6 Wochen)
      ('conditioning',      0, 'Aufbau Kapazität', 'endurance',   3, 3, 5, null,         12, 18),
      ('conditioning',      1, 'Verdichtung',      'endurance',   3, 4, 6, 3,            12, 15),
      -- 3-Monats-Block (13 Wochen)
      ('block_3m',          0, 'Hypertrophie',     'hypertrophy', 6, 3, 6, 6,             8, 12),
      ('block_3m',          1, 'Maximalkraft',     'strength',    5, 3, 5, 5,             4,  6),
      ('block_3m',          2, 'Peak & Test',      'test',        2, 2, 3, null,          2,  4),
      -- 6-Monats-Periodisierung (24 Wochen)
      ('periodized_6m',     0, 'Wiedereinstieg',   'reentry',     2, 2, 2, null,          5,  8),
      ('periodized_6m',     1, 'Hypertrophie I',   'hypertrophy', 5, 3, 6, 5,             8, 12),
      ('periodized_6m',     2, 'Kraft I',          'strength',    4, 3, 5, 4,             4,  6),
      ('periodized_6m',     3, 'Hypertrophie II',  'hypertrophy', 5, 4, 6, 5,             8, 12),
      ('periodized_6m',     4, 'Maximalkraft',     'strength',    6, 3, 5, 6,             3,  5),
      ('periodized_6m',     5, 'Peak & Test',      'test',        2, 2, 3, null,          2,  4)
  ) as n (tkey, pos, name, focus, weeks, sets_start, sets_end, deload_week, rep_min, rep_max)
    on n.tkey = t.key;

-- ----------------------------------------------------------------
-- 2. Testwoche der Vorlage "Wiederaufbau nach Fasten"
-- ----------------------------------------------------------------
-- 0026 hatte dort die Standort-Woche auf konstant zwei Saetze gesetzt; vorher
-- stieg sie von 2 auf 3. Die Lastfaktor-Rampe aus 0022 bleibt unberuehrt.

update public.journey_template_phases p
   set sets_start = 2,
       sets_end = 3
  from public.journey_templates t
 where p.journey_template_id = t.id
   and t.key = 'refeed_rebuild'
   and p.focus = 'test';

-- ----------------------------------------------------------------
-- 3. Zusammenfassungen der beiden Vorlagen zuruecksetzen
-- ----------------------------------------------------------------

update public.journey_templates
   set summary = 'Ein kompletter Quartalszyklus: ein Hypertrophie-Block für '
     || 'Muskelmasse, ein Maximalkraft-Block für Last und eine kurze Peak- und '
     || 'Testphase. Jeweils mit Entlastungswoche, sodass der Fortschritt '
     || 'planbar bleibt.'
 where key = 'block_3m';

update public.journey_templates
   set summary = 'Ein langfristiger Plan über sechs Monate: sanfter Einstieg, '
     || 'zwei Hypertrophie-Blöcke und zwei Kraftblöcke im Wechsel, '
     || 'abgeschlossen durch eine Peak- und Testphase. Mehrere '
     || 'Entlastungswochen halten die Belastung nachhaltig.'
 where key = 'periodized_6m';

-- ----------------------------------------------------------------
-- 4. Phasen laufender Journeys auf die Vorlagenwerte zuruecksetzen
-- ----------------------------------------------------------------
-- Gegenstueck zu Abschnitt 4 aus 0026. Getroffen wird ueber Name, Fokus und
-- Phasenlaenge, weil eine laufende Journey eine Kopie der Vorlage ist und
-- keinen Verweis auf sie behaelt. Nur die Satzzahlen werden angefasst;
-- Phasenlaengen und Entlastungswochen hatte 0026 nicht veraendert.
-- Archivierte Journeys bleiben als Aufzeichnung unangetastet.

update public.phases p
   set sets_start = v.sets_start,
       sets_end = v.sets_end
  from public.journeys j,
       (values
          ('Wiedereinstieg',  'reentry',     2, 2, 2),
          ('Hypertrophie',    'hypertrophy', 5, 2, 6),
          ('Maximalkraft',    'strength',    5, 3, 5),
          ('Übergang / Test', 'test',        1, 2, 2),
          ('Akkumulation I',  'hypertrophy', 4, 3, 6),
          ('Deload',          'maintenance', 1, 2, 2),
          ('Akkumulation II', 'hypertrophy', 4, 4, 6),
          ('Kraftbasis',      'strength',    4, 3, 5),
          ('Intensivierung',  'power',       3, 3, 4),
          ('Peak & Test',     'test',        2, 2, 3),
          ('Aufbau Kapazität','endurance',   3, 3, 5),
          ('Verdichtung',     'endurance',   3, 4, 6),
          ('Hypertrophie',    'hypertrophy', 6, 3, 6),
          ('Hypertrophie I',  'hypertrophy', 5, 3, 6),
          ('Kraft I',         'strength',    4, 3, 5),
          ('Hypertrophie II', 'hypertrophy', 5, 4, 6),
          ('Maximalkraft',    'strength',    6, 3, 5)
       ) as v (name, focus, weeks, sets_start, sets_end)
 where j.id = p.journey_id
   and j.status = 'active'
   and p.name = v.name
   and p.focus = v.focus
   and p.weeks = v.weeks;

-- ----------------------------------------------------------------
-- 5. Spalten der Lastrampe entfernen (Ruecknahme von 0027 und 0028)
-- ----------------------------------------------------------------

alter table public.journey_template_phases
  drop column if exists intensity_start,
  drop column if exists intensity_end;

alter table public.phases
  drop column if exists intensity_start,
  drop column if exists intensity_end;

-- Der Phasenbezug des Ankers aus 0027 gehoert ebenfalls zur Lastrampe: ohne sie
-- setzt der Coach das Referenzgewicht wie vorher fort.
alter table public.exercises
  drop column if exists reference_phase_id;
