-- 0038 Testphase der laufenden Journey: Entlastung, dann reine Testwoche
-- ----------------------------------------------------------------
-- Issue #244 (Teil von #240), Schritt 1. Gegenstueck zu Migration 0037: was
-- dort an den Vorlagen passiert, zieht hier die laufende Journey nach
-- ("Rueckkehr 2026", Testphase "Uebergang / Test").
--
--   1. Die Testphase bekommt eine zweite Woche (1 -> 2). Die Journey dauert
--      damit 14 statt 13 Wochen.
--   2. Ihr Wochenplan wird nach der neuen Bauregel gesetzt: Woche 1 Entlastung
--      (2 Saetze zu 3-5 Wiederholungen, 60 % vom Arbeitsgewicht), Woche 2 die
--      reine Testwoche ohne geplante Einheit (sets 0).
--
-- Warum die laufende Journey mitzieht: sie kaeme sonst aus der schwersten
-- Maximalkraft-Woche unerholt in den ersten 1RM-Test, und die bisherige
-- Entlastungseinheit der Kombiwoche fiele ersatzlos weg - schlechter als der
-- Stand vor dieser Aenderung. Zum Zeitpunkt der Migration steht die Journey in
-- Woche 10 von 13 (Maximalkraft, Woche 3 von 5); bis zur Testphase sind es rund
-- drei Wochen.
--
-- Archivierte und abgeschlossene Journeys bleiben als Aufzeichnung unberuehrt,
-- ebenso alle uebrigen Phasen der laufenden Journey - die Zeitachse davor
-- verschiebt sich nicht.
--
-- Idempotent: feste Werte, zugeordnet ueber Journey-Status und Fokus. Ein
-- zweiter Lauf findet den Stand schon vor und aendert nichts.

-- ----------------------------------------------------------------
-- 1. Testphase der aktiven Journey auf zwei Wochen
-- ----------------------------------------------------------------

update public.phases p
   set weeks = 2
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'test'
   and p.weeks = 1;

-- ----------------------------------------------------------------
-- 2. Wochenplan der Testphase nach der neuen Bauregel
-- ----------------------------------------------------------------
-- Gleiche Werte wie in Migration 0037 und in src/engine/weekPlan.ts
-- (buildTestPhaseWeekPlan).

drop table if exists pg_temp.testplaene_journey;

create temporary table testplaene_journey (wochen integer, plan jsonb);

insert into testplaene_journey (wochen, plan) values
  (1, '[{"week": 1, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb),
  (2, '[{"week": 1, "sets": 2, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"}, {"week": 2, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb),
  (3, '[{"week": 1, "sets": 2, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"}, {"week": 2, "sets": 2, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"}, {"week": 3, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb);

update public.phases p
   set week_plan = pl.plan
  from testplaene_journey pl,
       public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.focus = 'test'
   and pl.wochen = p.weeks
   and p.week_plan is distinct from pl.plan;
