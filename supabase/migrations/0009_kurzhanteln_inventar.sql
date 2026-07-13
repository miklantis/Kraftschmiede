-- 0009 Kurzhantel-Inventar
-- ----------------------------------------------------------------
-- Neue Inventar-Kategorie: Kurzhanteln (Dumbbells) mit festem Gewicht je
-- Stueck (keine Scheiben, keine Belade-Rechnung). Eigene Tabelle neben
-- inventory_kettlebells, weil der Coach spaeter fuer Kurzhantel-Uebungen eine
-- feste Gewichtsstufe je Hand waehlt statt mit dem Plate-Loader zu rechnen.
--
-- Struktur wie inventory_kettlebells (je Zeile ein verfuegbares Gewicht).
-- RLS und Grants wie bei allen Tabellen (strikt auf die eigene user_id).
-- Seed: 2..30 kg in 2er-Schritten fuer jeden Nutzer mit bereits vorhandenem
-- Inventar (an inventory_bars erkannt), damit keine Gewichte in leere Konten
-- geschrieben werden. Idempotent: fehlende Gewichte werden ergaenzt, vorhandene
-- bleiben unberuehrt. Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.inventory_dumbbells (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  weight   numeric not null,
  position integer not null default 0
);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.inventory_dumbbells enable row level security;

drop policy if exists "inventory_dumbbells_select_own" on public.inventory_dumbbells;
create policy "inventory_dumbbells_select_own" on public.inventory_dumbbells
  for select using (auth.uid() = user_id);

drop policy if exists "inventory_dumbbells_insert_own" on public.inventory_dumbbells;
create policy "inventory_dumbbells_insert_own" on public.inventory_dumbbells
  for insert with check (auth.uid() = user_id);

drop policy if exists "inventory_dumbbells_update_own" on public.inventory_dumbbells;
create policy "inventory_dumbbells_update_own" on public.inventory_dumbbells
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "inventory_dumbbells_delete_own" on public.inventory_dumbbells;
create policy "inventory_dumbbells_delete_own" on public.inventory_dumbbells
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.inventory_dumbbells to authenticated;

-- 3. Seed: 2..30 kg in 2er-Schritten je Nutzer mit vorhandenem Inventar.
--    Nur fehlende Gewichte werden ergaenzt (idempotent).
insert into public.inventory_dumbbells (user_id, weight, position)
select u.id, g.weight, (g.weight / 2)::int
  from (select distinct user_id as id from public.inventory_bars) u
 cross join (
   select generate_series(2, 30, 2) as weight
 ) g
 where not exists (
   select 1 from public.inventory_dumbbells d
    where d.user_id = u.id and d.weight = g.weight
 );
