-- 0021 Muskelmasse als zusaetzlicher Messwert (Issues #46, #47)
-- ----------------------------------------------------------------
-- Bisher hielt die Messung nur die Skelettmuskelmasse (skeletal_muscle_kg).
-- Das Messgeraet weist daneben die Muskelmasse aus (Skelettmuskeln, glatte
-- Muskulatur und der Wassergehalt in den Muskeln). Sie bekommt eine eigene
-- Spalte, numeric und nullable – aeltere Messungen tragen den Wert nicht.
-- Es wird nur der Rohwert gespeichert, nichts abgeleitet.
--
-- Zusaetzlich erlaubt der CHECK auf composition_milestones.metric jetzt die
-- neue Chart-Metrik 'muscle_mass' sowie 'bmr' – BMR kam mit Migration 0017 als
-- Chart-Metrik dazu, blieb im CHECK von Migration 0012 aber aussen vor, sodass
-- sich fuer BMR kein Meilenstein speichern liess (Issue #47).
--
-- Idempotent (add column if not exists, drop constraint if exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Neue Wert-Spalte
alter table public.composition
  add column if not exists muscle_mass_kg numeric;

-- 2. Metrik-CHECK der Meilensteine auf die sieben Chart-Metriken erweitern
alter table public.composition_milestones
  drop constraint if exists composition_milestones_metric_check;

alter table public.composition_milestones
  add constraint composition_milestones_metric_check
  check (metric in ('weight','fat','muscle','muscle_mass','water','phase','bmr'));
