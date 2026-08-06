-- 0014 Zeitraeume (Timeline-Marker)
-- ----------------------------------------------------------------
-- Ein Zeitraum markiert eine Spanne, in der etwas Besonderes lief - vor allem
-- Heilfasten, generisch auch Urlaub, Pause, Krankheit, Verletzung, Sonstiges.
-- Er macht die eigene Historie verstaendlich und gibt spaeteren Auswertungen
-- Kontext ("hier lagen zwei Wochen Fasten, kaum Training").
--
-- Struktur: je Zeile ein Marker mit Typ (feste Liste), Startdatum, optionalem
-- Enddatum (null = laeuft noch) und kurzer Notiz. An den Nutzer gebunden
-- (loescht mit dem Konto mit, on delete cascade).
--
-- Bewusst KEINE Verbindung zu sessions, Messungen oder Coach: der Marker ist
-- reiner Timeline-Kontext. Kalender, Journey-Woche, Haeufigkeitsziel und Coach
-- lesen ihn nicht; er taucht nur in der Rueckschau (Verlauf-Block) auf.
--
-- RLS und Grants wie bei allen Tabellen (strikt auf die eigene user_id). Kein
-- Seed. Idempotent (create if not exists, drop policy if exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.zeitraeume (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  typ         text not null
              check (typ in ('heilfasten','urlaub','pause','krankheit','verletzung','sonstiges')),
  start_datum date not null,
  end_datum   date,
  notiz       text,
  created_at  timestamptz not null default now(),
  -- Ende darf nicht vor dem Start liegen; null bleibt erlaubt (laeuft noch).
  constraint zeitraeume_ende_nach_start
    check (end_datum is null or end_datum >= start_datum)
);

-- Zugriff filtert je Nutzer, sortiert nach Start (Verlauf-Block, Kalender).
create index if not exists zeitraeume_user_start_idx
  on public.zeitraeume (user_id, start_datum);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.zeitraeume enable row level security;

drop policy if exists "zeitraeume_select_own" on public.zeitraeume;
create policy "zeitraeume_select_own" on public.zeitraeume
  for select using (auth.uid() = user_id);

drop policy if exists "zeitraeume_insert_own" on public.zeitraeume;
create policy "zeitraeume_insert_own" on public.zeitraeume
  for insert with check (auth.uid() = user_id);

drop policy if exists "zeitraeume_update_own" on public.zeitraeume;
create policy "zeitraeume_update_own" on public.zeitraeume
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "zeitraeume_delete_own" on public.zeitraeume;
create policy "zeitraeume_delete_own" on public.zeitraeume
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.zeitraeume to authenticated;
