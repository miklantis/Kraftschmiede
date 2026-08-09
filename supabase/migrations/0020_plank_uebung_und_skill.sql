-- 0020 Uebung "Plank" und Skill "Plank" mit fuenf Zeit-Stufen
-- ----------------------------------------------------------------
-- Ergaenzt fuer bestehende Nutzer, was neue Nutzer ueber den Seed bekommen:
-- 1) Katalog-Uebung "Plank" (Unterarmstuetz, Koerpergewicht, Metrik Dauer)
--    inklusive feiner Muskel-Map.
-- 2) Skill "Plank" mit fuenf Stufen (Spanplatte 1 Min, Eichenbrett 2 Min,
--    Stahltraeger 5 Min, Betonplatte 10 Min, Monolith 15 Min). Aufstieg nach
--    zwei aufeinanderfolgenden erfolgreichen Einheiten, kein Equipment noetig.
--    Die Phasen-Uebungen sind mit der Katalog-Uebung verknuepft, damit der
--    Uebungs-Verlauf die Skill-Einheiten findet.
--
-- Laeuft je Nutzer, der bereits Uebungen hat (also einen befuellten Katalog).
-- Idempotent: mehrfaches Ausfuehren legt nichts doppelt an (NOT EXISTS- bzw.
-- on-conflict-Schranken). Erwartete Ausgabe im SQL-Editor je nach Bestand
-- "Success" mit oder ohne betroffene Zeilen.

-- 1. Katalog-Uebung "Plank" je Nutzer anlegen.
insert into public.exercises
  (user_id, key, name, profile, tier, equipment, bar_id, description,
   metric, muscle_groups, rep_range_min, rep_range_max, target_score,
   work_weight, recovery_hours, position)
select
  u.user_id,
  'plank',
  'Plank',
  'core',
  'accessory',
  'bodyweight',
  null,
  'Unterarmstütz: Ellenbogen unter den Schultern, Unterarme flach am Boden, '
    || 'Füße hüftbreit auf den Zehen. Körper eine gerade Linie von Kopf bis '
    || 'Ferse, Bauch und Gesäß angespannt, Blick nach unten.',
  'duration',
  array['core']::text[],
  null,
  null,
  3,
  0,
  24,
  coalesce(u.max_position, 0) + 1
from (
  select user_id, max(position) as max_position
    from public.exercises
   group by user_id
) u
where not exists (
  select 1 from public.exercises e
   where e.user_id = u.user_id
     and (e.key = 'plank' or e.name = 'Plank')
);

-- 2. Feine Muskel-Map der neuen Uebung.
insert into public.exercise_muscles (user_id, exercise_id, region_id, kategorie)
select e.user_id, e.id, m.region_id, m.kategorie
  from public.exercises e
  cross join (values
    ('bauch', 'primaer'),
    ('bauch_seitlich', 'sekundaer'),
    ('gesaess', 'sekundaer'),
    ('schultern_vorne', 'stabilisierend'),
    ('quadrizeps', 'stabilisierend')
  ) as m(region_id, kategorie)
 where e.key = 'plank'
on conflict (exercise_id, region_id) do nothing;

-- 3. Skill "Plank" je Nutzer anlegen, der schon Skills hat.
insert into public.skills (user_id, key, name, category, image, position)
select s.user_id, 'plank', 'Plank', 'core', null,
       coalesce(s.max_position, 0) + 1
  from (
    select user_id, max(position) as max_position
      from public.skills
     group by user_id
  ) s
 where not exists (
   select 1 from public.skills s2
    where s2.user_id = s.user_id
      and (s2.key = 'plank' or s2.name = 'Plank')
 );

-- 4. Die fuenf Stufen des Skills.
insert into public.skill_phases
  (user_id, skill_id, label, description, consecutive_sessions, position)
select sk.user_id, sk.id, p.label, p.description, 2, p.position
  from public.skills sk
  cross join (values
    ('Spanplatte',
     'Der klassische Unterarmstütz: Ellenbogen unter den Schultern, Körper eine gerade Linie, Blick nach unten.',
     0),
    ('Eichenbrett', 'Zwei Minuten ohne durchhängende Hüfte.', 1),
    ('Stahlträger', 'Fünf Minuten am Stück. Ab hier hält der Kopf mit.', 2),
    ('Betonplatte', 'Zehn Minuten. Sobald die Hüfte absackt, sofort abbrechen.', 3),
    ('Monolith', 'Eine Viertelstunde unbeweglich. Endstufe.', 4)
  ) as p(label, description, position)
 where sk.key = 'plank'
   and not exists (
     select 1 from public.skill_phases sp
      where sp.skill_id = sk.id and sp.position = p.position
   );

-- 5. Phasen-Uebung je Stufe, verknuepft mit der Katalog-Uebung.
insert into public.skill_phase_exercises
  (user_id, skill_phase_id, name, metric, sets, target, tempo, exercise_id, position)
select sp.user_id, sp.id, 'Plank', 'duration', 1,
       case sp.position
         when 0 then 60
         when 1 then 120
         when 2 then 300
         when 3 then 600
         else 900
       end,
       null,
       ex.id,
       0
  from public.skill_phases sp
  join public.skills sk on sk.id = sp.skill_id and sk.key = 'plank'
  left join public.exercises ex
    on ex.user_id = sp.user_id and ex.key = 'plank'
 where not exists (
   select 1 from public.skill_phase_exercises spe
    where spe.skill_phase_id = sp.id
 );

-- 6. Bereits vorhandene Phasen-Uebungen ohne Katalog-Verknuepfung nachziehen.
update public.skill_phase_exercises spe
   set exercise_id = ex.id
  from public.skill_phases sp
  join public.skills sk on sk.id = sp.skill_id and sk.key = 'plank'
  join public.exercises ex on ex.user_id = sp.user_id and ex.key = 'plank'
 where spe.skill_phase_id = sp.id
   and spe.exercise_id is null;
