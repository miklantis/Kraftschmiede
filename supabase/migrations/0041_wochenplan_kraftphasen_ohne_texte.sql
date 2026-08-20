-- 0041 Wochenplan der Kraftphasen ohne Erklaertexte
-- ----------------------------------------------------------------
-- Issue #275. Die Wochenzeilen der Kraft- und Schnellkraftphasen trugen bisher
-- kurze Erklaersaetze ("Startgewicht setzen, alle Saetze sauber", "Eine
-- Wiederholung weniger, dafuer schwerer", "Schwerste Woche der Phase" ...).
-- Sie sagen nichts, was Saetze, Wiederholungen und RIR nicht schon zeigen, und
-- machen die Phasenkarte unruhig. Der Code erzeugt sie ab sofort nicht mehr
-- (buildStrengthWeekPlan in src/engine/weekPlan.ts); hier wird der Bestand
-- nachgezogen.
--
-- Betroffen sind die Vorlagen (journey_template_phases) und die Phasen aktiver
-- Journeys (phases). Archivierte Journeys bleiben als Aufzeichnung unberuehrt.
-- Testphasen bleiben ebenfalls unberuehrt: dort tragen Entlastungs- und
-- Testwochentext echte Information.
--
-- Idempotent: es wird nur angefasst, wo noch ein nicht leerer Text steht.
-- Nach dem ersten Lauf aendert die Migration nichts mehr.

-- ----------------------------------------------------------------
-- 1. Vorlagen
-- ----------------------------------------------------------------

update public.journey_template_phases p
   set week_plan = (
     select jsonb_agg(jsonb_set(w.wert, '{note}', '""'::jsonb) order by w.pos)
       from jsonb_array_elements(p.week_plan) with ordinality as w(wert, pos)
   )
 where p.focus in ('strength', 'power')
   and jsonb_typeof(p.week_plan) = 'array'
   and exists (
     select 1
       from jsonb_array_elements(p.week_plan) as w(wert)
      where coalesce(w.wert->>'note', '') <> ''
   );

-- ----------------------------------------------------------------
-- 2. Phasen der aktiven Journeys
-- ----------------------------------------------------------------

update public.phases p
   set week_plan = (
     select jsonb_agg(jsonb_set(w.wert, '{note}', '""'::jsonb) order by w.pos)
       from jsonb_array_elements(p.week_plan) with ordinality as w(wert, pos)
   )
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus in ('strength', 'power')
   and jsonb_typeof(p.week_plan) = 'array'
   and exists (
     select 1
       from jsonb_array_elements(p.week_plan) as w(wert)
      where coalesce(w.wert->>'note', '') <> ''
   );
