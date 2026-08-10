-- 0023 Journey-Vorlage "Wiederaufbau nach Fasten"
-- ----------------------------------------------------------------
-- Ergaenzt fuer bestehende Nutzer, was neue Nutzer ueber den Seed bekommen
-- (src/seed/definitions.ts, Schluessel refeed_rebuild): eine 4-Wochen-Vorlage,
-- die das Arbeitsgewicht ueber den Lastfaktor selbst vorgibt
-- (0.65 / 0.80 / 0.95 / 1.00 des Referenzgewichts).
--
-- Der Seed in src/lib/seed.ts laeuft nur beim allerersten Start eines Nutzers
-- und traegt spaeter dazugekommene Vorlagen nicht nach - deshalb diese
-- Migration.
--
-- Die Vorlage wird direkt hinter "Wiedereinstieg & Aufbau" (reentry_build)
-- einsortiert, damit die Reihenfolge in der App der Seed-Reihenfolge
-- entspricht. Dafuer ruecken die nachfolgenden Vorlagen eine Position weiter.
--
-- Idempotent: alle drei Schritte sind durch das Vorhandensein der Vorlage
-- geschuetzt, mehrfaches Ausfuehren legt nichts doppelt an und verschiebt
-- keine Positionen erneut.

-- 1. Platz schaffen: bei Nutzern ohne die neue Vorlage alles hinter dem Anker
--    (reentry_build, ersatzweise die letzte Vorlage) eine Position nach hinten.
with anker as (
  select jt.user_id,
         coalesce(
           min(jt.position) filter (where jt.key = 'reentry_build'),
           max(jt.position)
         ) as pos
    from public.journey_templates jt
   group by jt.user_id
)
update public.journey_templates t
   set position = t.position + 1
  from anker a
 where t.user_id = a.user_id
   and t.position > a.pos
   and not exists (
     select 1 from public.journey_templates x
      where x.user_id = t.user_id and x.key = 'refeed_rebuild'
   );

-- 2. Die Vorlage je Nutzer anlegen, der bereits Vorlagen hat.
with anker as (
  select jt.user_id,
         coalesce(
           min(jt.position) filter (where jt.key = 'reentry_build'),
           max(jt.position)
         ) as pos
    from public.journey_templates jt
   group by jt.user_id
)
insert into public.journey_templates
  (user_id, key, name, tagline, for_whom, summary, position)
select
  a.user_id,
  'refeed_rebuild',
  'Wiederaufbau nach Fasten',
  'In vier Wochen zurück auf das Niveau vor der Pause',
  'Nach Fastenwoche, Krankheit oder kurzer Trainingspause, wenn die Kraft noch '
    || 'da ist, die ersten Einheiten aber nicht überziehen sollen.',
  'Diese Journey gibt das Gewicht selbst vor: In den ersten drei Wochen '
    || 'trainierst du mit 65, 80 und 95 Prozent des Gewichts von vor der Pause. '
    || 'Der Coach darf in dieser Zeit nicht darüber hinausgehen und steuert nur '
    || 'die Wiederholungen; nach unten reagiert er wie gewohnt, wenn Schmerz '
    || 'oder schlechte Erholung dazwischenkommen. Ab Woche vier bist du wieder '
    || 'beim alten Gewicht und der Coach arbeitet wieder normal. Bei allen '
    || 'anderen Vorlagen bestimmt er das Gewicht aus deiner letzten Leistung.',
  a.pos + 1
  from anker a
 where not exists (
   select 1 from public.journey_templates x
    where x.user_id = a.user_id and x.key = 'refeed_rebuild'
 );

-- 3. Die vier Phasen der Vorlage, je eine Woche, ohne geplanten Deload.
insert into public.journey_template_phases
  (user_id, journey_template_id, name, focus, weeks, sets_start, sets_end,
   deload_week, rep_target_min, rep_target_max, load_factor, position)
select t.user_id, t.id, p.name, p.focus, 1, p.sets_start, p.sets_end,
       null, p.rep_min, p.rep_max, p.load_factor, p.position
  from public.journey_templates t
  cross join (values
    ('Tasten',       'reentry',     2, 2, 8, 10, 0.65, 0),
    ('Reaktivieren', 'reentry',     3, 3, 6, 10, 0.80, 1),
    ('Anschluss',    'hypertrophy', 3, 4, 6, 10, 0.95, 2),
    ('Standort',     'test',        2, 3, 3,  6, 1.00, 3)
  ) as p(name, focus, sets_start, sets_end, rep_min, rep_max, load_factor, position)
 where t.key = 'refeed_rebuild'
   and not exists (
     select 1 from public.journey_template_phases ph
      where ph.journey_template_id = t.id and ph.position = p.position
   );
