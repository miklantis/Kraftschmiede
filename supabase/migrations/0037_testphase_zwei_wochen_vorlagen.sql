-- 0037 Testphase der Vorlagen: Entlastung, dann reine Testwoche
-- ----------------------------------------------------------------
-- Issue #244 (Teil von #240), Schritt 1. Die bisherige Kombiwoche war
-- gleichzeitig Entlastung und Testwoche - zu wenig Erholung und zu wenig Zeit,
-- wenn vier bis fuenf Hauptuebungen zu testen sind. Ab hier gilt die Bauregel:
-- die letzte Woche einer Testphase ist die reine Testwoche, jede Woche davor
-- ist Entlastung.
--
-- Diese Datei zieht die Vorlagen nach:
--
--   1. "Wiedereinstieg & Aufbau": die Testphase "Uebergang / Test" bekommt eine
--      zweite Woche (1 -> 2). Die Journey dauert damit 14 statt 13 Wochen.
--   2. Wochenplaene aller Testphasen der Vorlagen nach der neuen Bauregel:
--      Entlastungswochen mit 2 Saetzen zu 3-5 Wiederholungen und 60 % vom
--      Arbeitsgewicht (bisher 3 Saetze - bei drei Einheiten in der Woche waere
--      die Summe sonst groesser als in einer Kraftwoche), die letzte Woche als
--      reine Testwoche ohne geplante Einheit (sets 0).
--
-- "Wiederaufbau nach Fasten" behaelt ihre einwoechige Testphase ("Standort"):
-- die drei Wochen davor laufen ohnehin bei 65/80/95 %, eine Entlastung waere
-- Erholung von etwas, das nie belastet hat. Ihr Wochenplan wird trotzdem neu
-- gesetzt - aus der bisherigen Kombiwoche wird die reine Testwoche.
--
-- Dieselben Werte rechnet der Code in src/engine/weekPlan.ts
-- (buildTestPhaseWeekPlan); die Erstbefuellung bleibt damit deckungsgleich.
-- Die Typ-Liste der Phasen (focus) wird nicht angefasst: es bleibt bei 'test',
-- es kommt kein neuer Phasentyp dazu.
--
-- Idempotent: die Aenderungen setzen feste Werte anhand von Vorlagen-Schluessel
-- und Fokus. Ein zweiter Lauf findet den Stand schon vor und aendert nichts.

-- ----------------------------------------------------------------
-- 1. Testphase der Vorlage "Wiedereinstieg & Aufbau" auf zwei Wochen
-- ----------------------------------------------------------------

update public.journey_template_phases p
   set weeks = 2
  from public.journey_templates t
 where t.id = p.journey_template_id
   and t.key = 'reentry_build'
   and p.focus = 'test'
   and p.weeks <> 2;

-- ----------------------------------------------------------------
-- 2. Wochenplaene der Testphasen nach der neuen Bauregel
-- ----------------------------------------------------------------
-- Zugeordnet ueber die Phasenlaenge, wie in Migration 0031.

drop table if exists pg_temp.testplaene;

create temporary table testplaene (wochen integer, plan jsonb);

insert into testplaene (wochen, plan) values
  (1, '[{"week": 1, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb),
  (2, '[{"week": 1, "sets": 2, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"}, {"week": 2, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb),
  (3, '[{"week": 1, "sets": 2, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"}, {"week": 2, "sets": 2, "reps": 3, "repsMax": 5, "rir": 3, "loadPct": 0.6, "note": "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche"}, {"week": 3, "sets": 0, "reps": 1, "repsMax": null, "rir": 0, "loadPct": 1, "note": "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite"}]'::jsonb);

update public.journey_template_phases p
   set week_plan = pl.plan
  from testplaene pl
 where p.focus = 'test'
   and pl.wochen = p.weeks
   and p.week_plan is distinct from pl.plan;
