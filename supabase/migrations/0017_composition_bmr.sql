-- Grundumsatz (BMR) als Rohwert zur Koerperzusammensetzung.
-- Gemessener Basalstoffwechsel in kcal/Tag, numeric und nullable (aeltere
-- Messungen tragen den Wert nicht). Wird wie die uebrigen Messwerte von Hand
-- gepflegt; es wird nur der Rohwert gespeichert, nichts abgeleitet.
alter table public.composition
  add column if not exists bmr_kcal numeric;
