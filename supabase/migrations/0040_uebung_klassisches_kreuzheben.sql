-- 0040 Klassisches Kreuzheben als eigene Hauptuebung (Vorhaben #265)
-- ----------------------------------------------------------------------------
-- Bisher gab es nur eine Kreuzheb-Uebung, den Romanian Deadlift (Migration 0039).
-- Kuenftig wird zusaetzlich das klassische Kreuzheben vom Boden trainiert. Es
-- bekommt eine eigene Uebung, damit Gewichte, 1RM und Verlauf getrennt laufen.
--
-- Drei Schritte:
--   1. Schluessel-Tausch: der RDL bekommt den sprechenden key
--      'romanian_deadlift', damit 'deadlift' wieder das klassische Kreuzheben
--      bezeichnet. Funktional gleichwertig – beide Namen matchen weiterhin das
--      /deadlift/i im Code (reduzierte Aufwaermrampe in warmupFor, 72-h-Fenster
--      in suitability). Alle Verknuepfungen (Saetze, Meilensteine, 1RM-Tests,
--      Phasen-Anker) haengen an der Uebungs-ID, nicht am key.
--   2. Neue Uebung "Deadlift" als Hauptuebung, an derselben Stange wie der RDL,
--      Position direkt dahinter. Bewusst ohne Startgewicht: work_weight = 0 und
--      rm = null, der Wert entsteht ueber den ersten 1RM-Test. Bis dahin
--      schlaegt die Engine die leere Stange vor (suggestWeight: workWeight ||
--      bar.weight).
--   3. Muskel-Zuordnung fuer die Muscle-Map. Anders als beim RDL ist der
--      Quadrizeps hier primaer beteiligt.
--
-- Idempotent: Schritt 1 greift nur die RDL-Zeile (key + Name), Schritt 2 und 3
-- legen nur an, was fuer den jeweiligen Nutzer noch fehlt. Der Positions-Shift
-- laeuft nur, solange die neue Uebung fehlt.
-- Erwartete Ausgabe im SQL-Editor: "Success. No rows returned".

-- 1. RDL bekommt den sprechenden Schluessel
update public.exercises
set key = 'romanian_deadlift'
where key = 'deadlift'
  and name = 'Romanian Deadlift (RDL)';

-- 2a. Platz schaffen: alles ab Position 3 rueckt eine Stelle weiter,
--     solange die neue Uebung beim jeweiligen Nutzer noch fehlt.
update public.exercises e
set position = e.position + 1
where e.position >= 3
  and not exists (
    select 1 from public.exercises d
    where d.user_id = e.user_id and d.key = 'deadlift'
  );

-- 2b. Die neue Uebung, je Nutzer, der bereits den RDL hat
insert into public.exercises (
  user_id, key, name, profile, equipment, bar_id, description,
  muscle_groups, rep_range_min, rep_range_max, target_score,
  work_weight, recovery_hours, position, tier
)
select
  r.user_id,
  'deadlift',
  'Deadlift',
  'strength',
  'barbell',
  r.bar_id,
  'Klassisches Kreuzheben: Langhantel vom Boden, Hüfte und Knie strecken sich gemeinsam, Rücken gerade und Stange eng am Körper, bis zum aufrechten Stand; danach kontrolliert zurück auf den Boden.',
  array['back', 'legs', 'glutes'],
  4,
  8,
  3,
  0,
  72,
  3,
  'main'
from public.exercises r
where r.key = 'romanian_deadlift'
  and not exists (
    select 1 from public.exercises d
    where d.user_id = r.user_id and d.key = 'deadlift'
  );

-- 3. Muskel-Zuordnung der neuen Uebung
insert into public.exercise_muscles (user_id, exercise_id, region_id, kategorie)
select d.user_id, d.id, v.region_id, v.kategorie
from public.exercises d
cross join (values
  ('beinbeuger',    'primaer'),
  ('gesaess',       'primaer'),
  ('ruecken_mitte', 'primaer'),
  ('quadrizeps',    'primaer'),
  ('trapez',        'sekundaer'),
  ('latissimus',    'sekundaer'),
  ('bauch',         'stabilisierend'),
  ('waden',         'stabilisierend')
) as v(region_id, kategorie)
where d.key = 'deadlift'
  and not exists (
    select 1 from public.exercise_muscles m
    where m.exercise_id = d.id and m.region_id = v.region_id
  );
