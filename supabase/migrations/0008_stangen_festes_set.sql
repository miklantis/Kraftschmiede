-- 0008 Festes Stangen-Set
-- ----------------------------------------------------------------
-- Die Stangen sind kuenftig ein fester, in der Oberflaeche nicht mehr
-- editierbarer Satz. Diese Migration bringt den Bestand je Nutzer auf genau
-- fuenf feste Stangen und markiert sie ueber die vorhandene Spalte `key`.
--
-- Bestehende Stangen werden per Gewicht uebernommen (Name/Key/Position gesetzt),
-- damit die Verweise aus `exercises.bar_id` und `session_exercises.bar_id`
-- erhalten bleiben. Fehlende Stangen (SZ-Curl 8 kg, Kurz 15 kg) werden angelegt.
-- Idempotent: mehrfaches Ausfuehren aendert nichts mehr. Erwartete Ausgabe im
-- SQL-Editor: "No rows returned".
--
-- Nur Nutzer mit vorhandenem Stangen-Bestand werden beruecksichtigt, damit keine
-- Stangen in leere Konten geschrieben werden.

-- 20 kg -> Standard (Default)
update public.inventory_bars
   set key = 'standard', name = 'Standard', is_default = true, position = 1
 where id in (
   select distinct on (user_id) id
     from public.inventory_bars
    where weight = 20
    order by user_id, position, id
 );

-- 10 kg -> Leicht
update public.inventory_bars
   set key = 'leicht', name = 'Leicht', is_default = false, position = 2
 where id in (
   select distinct on (user_id) id
     from public.inventory_bars
    where weight = 10
    order by user_id, position, id
 );

-- 12,5 kg -> SZ
update public.inventory_bars
   set key = 'sz', name = 'SZ', is_default = false, position = 3
 where id in (
   select distinct on (user_id) id
     from public.inventory_bars
    where weight = 12.5
    order by user_id, position, id
 );

-- 8 kg -> SZ-Curl (anlegen, falls noch nicht vorhanden)
insert into public.inventory_bars (user_id, key, name, weight, is_default, position)
select u.id, 'sz-curl', 'SZ-Curl', 8, false, 4
  from auth.users u
 where exists (
         select 1 from public.inventory_bars b where b.user_id = u.id
       )
   and not exists (
         select 1 from public.inventory_bars b
          where b.user_id = u.id and (b.key = 'sz-curl' or b.weight = 8)
       );

-- 15 kg -> Kurz (anlegen, falls noch nicht vorhanden)
insert into public.inventory_bars (user_id, key, name, weight, is_default, position)
select u.id, 'kurz', 'Kurz', 15, false, 5
  from auth.users u
 where exists (
         select 1 from public.inventory_bars b where b.user_id = u.id
       )
   and not exists (
         select 1 from public.inventory_bars b
          where b.user_id = u.id and (b.key = 'kurz' or b.weight = 15)
       );
