-- 0010 Uebungstyp Kurzhantel + Uebung "Curl (Kurzhantel)"
-- ----------------------------------------------------------------
-- Zwei Schritte:
-- 1) Der equipment-CHECK der exercises-Tabelle erlaubt jetzt zusaetzlich
--    'dumbbell' (Kurzhantel). Der Coach rechnet fuer solche Uebungen nicht mit
--    dem Plate-Loader, sondern waehlt die naechste vorhandene Kurzhantel-Stufe
--    (je Hand) aus inventory_dumbbells.
-- 2) Fuer jeden Nutzer mit einer vorhandenen Uebung "Barbell Curl" wird eine
--    neue Uebung "Curl (Kurzhantel)" angelegt (equipment='dumbbell', ohne
--    Stange). Sie startet ohne Historie; der Coach tastet sich hoch. Das
--    Startgewicht steht auf 10 kg je Hand und laesst sich in der App unter
--    "Uebung anpassen" aendern. Die feine Muskel-Map wird von der Langhantel-
--    Curl uebernommen, damit die neue Uebung in der Muscle-Map korrekt erscheint.
--
-- Idempotent: mehrfaches Ausfuehren legt die Uebung nicht doppelt an
-- (NOT EXISTS-Schranken). Erwartete Ausgabe im SQL-Editor je nach Bestand
-- "Success" mit oder ohne betroffene Zeilen.

-- 1. equipment-CHECK um 'dumbbell' erweitern.
alter table public.exercises drop constraint if exists exercises_equipment_check;
alter table public.exercises add constraint exercises_equipment_check
  check (equipment in ('barbell', 'plate', 'bar', 'band', 'bodyweight', 'dumbbell'));

-- 2. Uebung "Curl (Kurzhantel)" je Nutzer mit vorhandener "Barbell Curl" anlegen.
insert into public.exercises
  (user_id, key, name, profile, tier, equipment, bar_id, description,
   metric, muscle_groups, rep_range_min, rep_range_max, target_score,
   work_weight, recovery_hours, position)
select
  src.user_id,
  'dumbbell-curl',
  'Curl (Kurzhantel)',
  src.profile,
  src.tier,
  'dumbbell',
  null,
  src.description,
  src.metric,
  src.muscle_groups,
  src.rep_range_min,
  src.rep_range_max,
  src.target_score,
  10,
  src.recovery_hours,
  src.position + 1
from public.exercises src
where src.name = 'Barbell Curl'
  and not exists (
    select 1 from public.exercises e2
     where e2.user_id = src.user_id
       and (e2.key = 'dumbbell-curl' or e2.name = 'Curl (Kurzhantel)')
  );

-- 3. Feine Muskel-Map von der Langhantel-Curl uebernehmen.
insert into public.exercise_muscles (user_id, exercise_id, region_id, kategorie)
select nd.user_id, nd.id, em.region_id, em.kategorie
  from public.exercises nd
  join public.exercises src
    on src.user_id = nd.user_id and src.name = 'Barbell Curl'
  join public.exercise_muscles em on em.exercise_id = src.id
 where nd.name = 'Curl (Kurzhantel)'
   and not exists (
     select 1 from public.exercise_muscles e3 where e3.exercise_id = nd.id
   );
