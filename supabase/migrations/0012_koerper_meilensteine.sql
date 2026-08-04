-- 0012 Koerper-Meilensteine
-- ----------------------------------------------------------------
-- Pro Mess-Metrik (Gewicht/Fett/Muskel/Wasser/Phasenwinkel) kann der Nutzer
-- eigene Meilensteine anlegen: ein Name und ein Zielwert. Reine Richtwerte:
-- Es gibt KEIN Erreicht-Logging und keine Richtung. Der Nutzen liegt in der
-- grafischen Darstellung – im Mess-Chart lassen sich die Ziele der gewaehlten
-- Metrik als dezente Waagerechte ein-/ausblenden, sodass sichtbar wird, wo ein
-- Ziel liegt und wo der aktuelle Messwert steht.
--
-- Struktur: je Zeile ein Meilenstein, an eine Metrik (Text-Schluessel) und den
-- Nutzer gebunden. metric ist per CHECK auf die fuenf Chart-Metriken begrenzt.
-- RLS und Grants wie bei allen Tabellen (strikt auf die eigene user_id). Kein
-- Seed. Idempotent (create if not exists, drop policy if exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.composition_milestones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  metric     text not null check (metric in ('weight','fat','muscle','water','phase')),
  name       text not null,
  target     numeric not null,
  created_at timestamptz not null default now(),
  position   integer not null default 0
);

-- Zugriffe filtern immer auf Nutzer + Metrik (Abschnitt folgt der gewaehlten
-- Metrik der Mess-Karte).
create index if not exists composition_milestones_user_metric_idx
  on public.composition_milestones (user_id, metric);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.composition_milestones enable row level security;

drop policy if exists "composition_milestones_select_own" on public.composition_milestones;
create policy "composition_milestones_select_own" on public.composition_milestones
  for select using (auth.uid() = user_id);

drop policy if exists "composition_milestones_insert_own" on public.composition_milestones;
create policy "composition_milestones_insert_own" on public.composition_milestones
  for insert with check (auth.uid() = user_id);

drop policy if exists "composition_milestones_update_own" on public.composition_milestones;
create policy "composition_milestones_update_own" on public.composition_milestones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "composition_milestones_delete_own" on public.composition_milestones;
create policy "composition_milestones_delete_own" on public.composition_milestones
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.composition_milestones to authenticated;
