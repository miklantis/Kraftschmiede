-- 0042 Ziel-Score am Uebungskatalog entfernen
-- ----------------------------------------------------------------
-- Issue #298 (Vorhaben #296). Der Ziel-Score war eine Stellschraube pro Uebung
-- ohne Wochenbezug – und in genau den Phasen wirkungslos, in denen am meisten
-- hingeschaut wird: Wo ein Wochenplan gilt (Kraft, Schnellkraft, Test), kommt
-- die Ziel-Anstrengung aus der Wochenzeile der Phase (phases.week_plan). Ueberall
-- sonst gilt seit dieser Auslieferung systemweit fest Score 3 (RIR 2),
-- nachzulesen als DEFAULT_TARGET_SCORE in src/engine/score.ts.
--
-- Alle 22 Uebungen standen auf dem Standardwert 3 – der Regler wurde nie
-- benutzt. Das Coach-Verhalten aendert sich damit um exakt null; es faellt nur
-- die Stellschraube weg.
--
-- Keine Lesestelle im Code greift noch auf die Spalte zu: Popup "Uebung
-- anpassen", Coach-Rechnung (lib/coach.ts, engine/progression.ts) und die
-- Uebungs-Schemas sind in derselben Auslieferung umgestellt.
--
-- Nicht betroffen ist `sets.target_score`: Diese Spalte haelt die Ziel-
-- Anstrengung des einzelnen Satzes fest und bleibt bestehen.
--
-- Die frueheren Seed-Migrationen (0010, 0020, 0040) schreiben die Spalte noch,
-- laufen aber vorher – ein Neuaufbau allein aus den Migrationen bleibt gueltig.
--
-- Sicher wiederholbar (drop column if exists).

begin;

alter table public.exercises drop column if exists target_score;

commit;
