-- 0022 Lastfaktor je Phase und Referenzgewicht je Uebung
-- ----------------------------------------------------------------
-- Grundlage fuer Journeys, die das Arbeitsgewicht selbst vorgeben (z. B.
-- "Wiederaufbau nach Fasten"): statt aus der letzten Leistung abgeleitet zu
-- werden, ergibt sich das Gewicht beim Phasenwechsel aus
-- Referenzgewicht x Lastfaktor.
--
-- 1) journey_template_phases.load_factor / phases.load_factor
--    Anteil des Referenzgewichts, mit dem in dieser Phase gearbeitet wird.
--    Default 1.0 = volles Niveau, also das bisherige Verhalten. Alle
--    bestehenden Vorlagen und laufenden Journeys bleiben damit unveraendert.
-- 2) exercises.reference_weight
--    Eingefrorenes Arbeitsgewicht vom Start der Journey. Noetig, weil
--    work_weight nach jeder Einheit fortgeschrieben wird und der Stand vor der
--    Pause sonst nach der ersten abgesenkten Einheit verloren waere. Nullable:
--    ausserhalb einer Lastfaktor-Journey gibt es kein Referenzgewicht.
--
-- Idempotent: mehrfaches Ausfuehren aendert nichts (add column if not exists).

alter table public.journey_template_phases
  add column if not exists load_factor numeric not null default 1.0;

alter table public.phases
  add column if not exists load_factor numeric not null default 1.0;

alter table public.exercises
  add column if not exists reference_weight numeric;
