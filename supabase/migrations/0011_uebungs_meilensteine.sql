-- 0011 Uebungs-Meilensteine
-- ----------------------------------------------------------------
-- Pro Uebung kann der Nutzer eigene Meilensteine anlegen: ein Name und ein
-- Ziel-1RM in kg. Der Fortschritt wird gegen das vorhandene geschaetzte 1RM
-- der Uebung (exercises.rm) angezeigt; erreicht die Uebung das Ziel, haelt die
-- App das Erreichen-Datum in achieved_at fest. Reine Zusatz-Tabelle: der
-- Coach-Rechenkern bleibt unberuehrt (Meilensteine lesen exercises.rm nur).
--
-- Struktur: je Zeile ein Meilenstein, an eine Uebung gebunden (loescht mit der
-- Uebung mit, daher on delete cascade). RLS und Grants wie bei allen Tabellen
-- (strikt auf die eigene user_id). Kein Seed - jeder legt seine Meilensteine
-- selbst an. Idempotent (create if not exists, drop policy if exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.exercise_milestones (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  name        text not null,
  target_rm   numeric not null,
  achieved_at date,
  created_at  timestamptz not null default now(),
  position    integer not null default 0
);

-- Zugriffe filtern immer auf Nutzer + Uebung (Detailseite je Uebung).
create index if not exists exercise_milestones_user_exercise_idx
  on public.exercise_milestones (user_id, exercise_id);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.exercise_milestones enable row level security;

drop policy if exists "exercise_milestones_select_own" on public.exercise_milestones;
create policy "exercise_milestones_select_own" on public.exercise_milestones
  for select using (auth.uid() = user_id);

drop policy if exists "exercise_milestones_insert_own" on public.exercise_milestones;
create policy "exercise_milestones_insert_own" on public.exercise_milestones
  for insert with check (auth.uid() = user_id);

drop policy if exists "exercise_milestones_update_own" on public.exercise_milestones;
create policy "exercise_milestones_update_own" on public.exercise_milestones
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercise_milestones_delete_own" on public.exercise_milestones;
create policy "exercise_milestones_delete_own" on public.exercise_milestones
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.exercise_milestones to authenticated;
