-- 0034 Versehentlichen Journey-Wechsel zuruecknehmen
-- ----------------------------------------------------------------
-- Issue #236. Am 19.08.2026 wurde die laufende Journey versehentlich zweimal
-- gewechselt: "Rueckkehr 2026" -> "Maximalkraft / Peaking" (12:54) ->
-- "Wiedereinstieg & Aufbau" (12:55). Dabei wurde "Rueckkehr 2026" archiviert
-- und mit einem Enddatum versehen, obwohl sie weiterlaufen soll.
--
-- Beide neu entstandenen Journeys sind leer: keine Einheit und keine
-- Workout-Zuordnung haengt an ihnen (geprueft vor dem Eingriff). "Rueckkehr
-- 2026" hat ihre 30 Einheiten und ihre 6 zugewiesenen Workouts behalten - die
-- abgeloeste Journey behaelt ihre Zuordnungen. Es geht also nichts verloren.
--
--   1. Die beiden leeren Journeys werden geloescht; ihre Phasen haengen per
--      "on delete cascade" daran und verschwinden mit.
--   2. "Rueckkehr 2026" wird wieder aktiv: active = true, status = 'active',
--      end_date = null.
--   3. Die Anker-Vorbelegung aus 0031 wird wiederhergestellt. Der
--      Journey-Wechsel raeumt die Referenzgewichte (regulaeres Verhalten ohne
--      Lastfaktor-Journey), hier ist das unerwuenscht. Gesetzt werden wieder
--      die zuletzt gearbeiteten Gewichte, gebunden an die Phase
--      "Maximalkraft" dieser Journey.
--
-- Die Reihenfolge ist zwingend: erst die neue aktive Journey loeschen, dann
-- "Rueckkehr 2026" aktiv setzen - sonst verletzt das Update den Partial Unique
-- Index "genau eine aktive Journey pro Nutzer" (ADR-0004).
--
-- Einmalige Datenkorrektur an Nutzerdaten, ueber die festen Ids der drei
-- betroffenen Journeys. Auf einer neu aufgebauten Datenbank gibt es diese Ids
-- nicht - dort bleibt die Migration folgenlos. Mehrfaches Ausfuehren aendert
-- nach dem ersten Lauf nichts mehr.
--
-- Randnotiz zu 0033: die dort nachgezogenen Wochenplaene betrafen die
-- inzwischen geloeschte Journey "Wiedereinstieg & Aufbau". "Rueckkehr 2026"
-- traegt ihre Plaene bereits aus 0031, es ist also nichts nachzuziehen.

-- ----------------------------------------------------------------
-- 1. Die beiden versehentlich angelegten Journeys entfernen
-- ----------------------------------------------------------------

delete from public.journeys
 where id in (
   '599ac5b7-73e8-4037-8713-039dd13f1b76',  -- Maximalkraft / Peaking
   '492d3978-fb88-41c2-a12e-03f1006280de'   -- Wiedereinstieg & Aufbau
 );

-- ----------------------------------------------------------------
-- 2. "Rueckkehr 2026" wieder aufnehmen
-- ----------------------------------------------------------------

update public.journeys
   set active = true,
       status = 'active',
       end_date = null
 where id = '7539e4dc-7dfc-4a4a-addc-de08b200f090'
   and (active is distinct from true
        or status is distinct from 'active'
        or end_date is not null);

-- ----------------------------------------------------------------
-- 3. Anker der Hauptuebungen wiederherstellen
-- ----------------------------------------------------------------

with kraftphase as (
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
