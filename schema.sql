-- Kraftschmiede – Supabase Schema
-- ----------------------------------------------------------------
-- Einmalig im Supabase Dashboard ausfuehren:
--   Linke Leiste -> "SQL Editor" -> "New query" -> dieses Skript einfuegen -> "Run".
-- Danach existiert die Tabelle app_state mit Row Level Security:
-- jede angemeldete Person sieht und aendert ausschliesslich ihre eigene Zeile.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Lesen nur die eigene Zeile
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own" on public.app_state
  for select using (auth.uid() = user_id);

-- Anlegen nur fuer sich selbst
drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own" on public.app_state
  for insert with check (auth.uid() = user_id);

-- Aktualisieren nur die eigene Zeile
drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
