-- 0064 Messgeraete fuer Koerpermessungen
-- ----------------------------------------------------------------
-- Vorhaben #494, Schritt 1 = #495.
--
-- Was: Eine neue Tabelle `measurement_devices` haelt die Koerpermessgeraete
-- fest, die der Nutzer selbst in den Einstellungen eintraegt (z. B. „InBody 570
-- – Studio Mitte“). Je Geraet nur ein Name.
--
-- Warum: Das Messgeraet im Studio wechselt gelegentlich, und verschiedene
-- Geraete messen unterschiedlich. Im naechsten Schritt (#496) laesst sich jede
-- Messung einem dieser Geraete zuordnen; dieser Schritt legt nur die Liste an.
--
-- Fuer wen: jeder Nutzer pflegt seine eigenen Geraete. Kein Seed – die Liste
-- startet leer. An den Nutzer gebunden (loescht mit dem Konto mit).
--
-- Ein Name kommt je Nutzer nur einmal vor, damit die Auswahl an der Messung
-- eindeutig bleibt. Leere Namen sind ausgeschlossen.
--
-- RLS und Grants wie bei allen Tabellen (strikt auf die eigene user_id).
-- Idempotent (create if not exists, drop policy if exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.measurement_devices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  constraint measurement_devices_user_name_key unique (user_id, name)
);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.measurement_devices enable row level security;

drop policy if exists "measurement_devices_select_own" on public.measurement_devices;
create policy "measurement_devices_select_own" on public.measurement_devices
  for select using (auth.uid() = user_id);

drop policy if exists "measurement_devices_insert_own" on public.measurement_devices;
create policy "measurement_devices_insert_own" on public.measurement_devices
  for insert with check (auth.uid() = user_id);

drop policy if exists "measurement_devices_update_own" on public.measurement_devices;
create policy "measurement_devices_update_own" on public.measurement_devices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "measurement_devices_delete_own" on public.measurement_devices;
create policy "measurement_devices_delete_own" on public.measurement_devices
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.measurement_devices to authenticated;
