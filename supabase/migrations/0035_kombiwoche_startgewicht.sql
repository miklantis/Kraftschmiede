-- 0035 Startgewicht der Phase fuer die Kombiwoche
-- ----------------------------------------------------------------
-- Vierter Schritt des gesteuerten Kraftzyklus (Issue #225, Schritt 4 / #229):
-- die Kombiwoche der Testphase entlastet mit 60 % vom Startgewicht X der
-- vorangegangenen Kraftphase. X ist der Stand beim Eintritt in die Phase - der
-- Anker (reference_weight) laeuft danach mit der Rampe weiter und taugt nicht
-- mehr als Bezug.
--
-- 1) exercises.plan_start_weight (numeric, nullable)
--    Startgewicht X der Phase, an die der Anker gebunden ist
--    (reference_phase_id). Wird beim Eintritt der Uebung in eine Kraft-/
--    Schnellkraftphase einmal gesetzt und bleibt dann stehen, waehrend der
--    Anker weiterlaeuft. Mit dem Anker verschwindet es wieder (Journey-Wechsel,
--    Journey-Abschluss) - ohne Bindung hat es keine Bedeutung.
--
-- 2) Nachtrag fuer die laufende Journey: "Rueckkehr 2026" steht in der
--    Kraftphase und traegt Anker aus Migration 0031/0033, aber noch kein X. Fuer
--    diese Uebungen gilt der aktuelle Anker als Startgewicht - das war der
--    Stand, mit dem sie in die Phase eingestiegen sind. Ohne den Nachtrag wuerde
--    die Kombiwoche dort aus dem 1RM rechnen statt aus dem gefuehrten Stand.
--
-- Idempotent: Spalte mit "if not exists", der Nachtrag greift nur, solange noch
-- kein Startgewicht gesetzt ist (plan_start_weight is null) - ein zweiter Lauf
-- ueberschreibt also kein inzwischen fortgeschriebenes X.

-- ----------------------------------------------------------------
-- 1. Neue Spalte
-- ----------------------------------------------------------------

alter table public.exercises
  add column if not exists plan_start_weight numeric;

-- ----------------------------------------------------------------
-- 2. Nachtrag fuer bereits gebundene Anker
-- ----------------------------------------------------------------

update public.exercises e
   set plan_start_weight = e.reference_weight
  from public.phases p
  join public.journeys j on j.id = p.journey_id
 where p.id = e.reference_phase_id
   and j.status = 'active'
   and e.reference_weight is not null
   and e.plan_start_weight is null;
