-- Wasserwerte (ECW/ICW) als Rohwerte zur Koerperzusammensetzung.
-- Extrazellulaeres und intrazellulaeres Wasser in kg, beide numeric und
-- nullable (aeltere Messungen tragen diese Werte nicht). Dienen dazu, die
-- ECW/TBW-Verschiebung einer Messung nachvollziehen zu koennen; es werden nur
-- Rohwerte gespeichert, keine abgeleiteten Groessen.
alter table public.composition
  add column if not exists ecw_kg numeric,
  add column if not exists icw_kg numeric;
