-- 0051 Wochentexte der Testphase kuerzen
-- ----------------------------------------------------------------
-- Issue #364. Die Testphase zeigt ihren Wochenplan jetzt als Tabelle - vorher
-- stand an ihrer Stelle ein Fliesstext. Damit tragen die beiden Wochentexte
-- Angaben, die schon in der Tabelle daneben stehen:
--
--   "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"
--     -> "Entlastung mit 60 % vom Arbeitsgewicht"
--        Was danach kommt, ist die naechste Zeile der Tabelle.
--
--   "Testwoche: keine Vorgabe, der 1RM-Test laeuft ueber die Uebungsseite"
--     -> "Keine Vorgabe, laeuft ueber die Uebungsseite"
--        Dass es die Testwoche ist, sagt die Zeile selbst ("1RM-Test").
--
-- Gleiche Texte wie in src/engine/weekPlan.ts (buildTestPhaseWeekPlan). Neue
-- Journeys bekommen sie ueber den Bauweg; die laufende Journey traegt ihren
-- Wochenplan seit Migration 0038 eingefroren in phases.week_plan und wird
-- deshalb hier nachgezogen.
--
-- Nur Text der Anzeige: Saetze, Wiederholungen, RIR und Lastanteil bleiben
-- unangetastet, der Coach liest die Wochentexte ohnehin nicht.
--
-- Archivierte und abgeschlossene Journeys bleiben als Aufzeichnung unberuehrt
-- (wie in Migration 0038). Ihre Testphase ist vergangen und zeigt gar keine
-- Wochentabelle mehr.
--
-- Idempotent: getroffen wird ueber den alten Wortlaut. Ein zweiter Lauf findet
-- ihn nicht mehr und aendert nichts.

update public.phases p
   set week_plan = (
         select jsonb_agg(
                  case
                    when w->>'note' = 'Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche'
                      then jsonb_set(w, '{note}', to_jsonb('Entlastung mit 60 % vom Arbeitsgewicht'::text))
                    when w->>'note' = 'Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite'
                      then jsonb_set(w, '{note}', to_jsonb('Keine Vorgabe, läuft über die Übungsseite'::text))
                    else w
                  end
                  order by (w->>'week')::int
                )
           from jsonb_array_elements(p.week_plan) as w
       )
  from public.journeys j
 where j.id = p.journey_id
   and j.status = 'active'
   and p.plan_builder = 'test'
   and p.week_plan is not null
   and exists (
         select 1
           from jsonb_array_elements(p.week_plan) as w
          where w->>'note' in (
                  'Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche',
                  'Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite'
                )
       );
