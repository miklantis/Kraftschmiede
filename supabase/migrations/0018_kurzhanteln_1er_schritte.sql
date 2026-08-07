-- 0018 Kurzhanteln 1er-Schritte 2..10 kg
-- ----------------------------------------------------------------
-- Ergaenzt die bisher fehlenden ungeraden Kurzhantel-Gewichte 3, 5, 7 und 9 kg
-- im Inventar. Das erste Seed (0009) hatte nur gerade Werte (2..30 in 2er-
-- Schritten) angelegt; im realen Studio-Bestand gibt es die Kurzhanteln aber
-- von 2 bis 10 kg in 1er-Schritten. Werte ueber 10 kg bleiben unveraendert.
--
-- Nur fuer Nutzer mit bereits vorhandenem Inventar (an inventory_bars erkannt),
-- damit keine Gewichte in leere Konten geschrieben werden. Idempotent: fehlende
-- Gewichte werden ergaenzt, vorhandene bleiben unberuehrt.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

insert into public.inventory_dumbbells (user_id, weight, position)
select u.id, g.weight, g.weight::int
  from (select distinct user_id as id from public.inventory_bars) u
 cross join (
   select unnest(array[3, 5, 7, 9]) as weight
 ) g
 where not exists (
   select 1 from public.inventory_dumbbells d
    where d.user_id = u.id and d.weight = g.weight
 );
