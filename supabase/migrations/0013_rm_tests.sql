-- 0013 1RM-Tests
-- ----------------------------------------------------------------
-- Das 1RM einer Uebung ist ein beweisgebundener Rekord: die Automatik im
-- normalen Training hebt ihn nur bei wenigen Wiederholungen an und senkt ihn
-- nie (siehe Version 1.6.2). Damit der Nutzer seinen Stand bewusst messen und
-- auch nach unten korrigieren kann, gibt es den 1RM-Test - eine kleine, eigene
-- Messung auf der Uebungs-Detailseite.
--
-- Struktur: je Zeile ein Test, an eine Uebung gebunden (loescht mit der Uebung
-- mit, daher on delete cascade). Gespeichert wird der beste Satz des Tests
-- (weight x reps), das daraus geschaetzte 1RM (est_rm) und der Rekord VOR dem
-- Test (previous_rm, null wenn es noch keinen gab) - damit spaeter im Verlauf
-- die Richtung (hoch/runter) ohne Nachrechnen sichtbar ist.
--
-- Bewusst KEINE Verbindung zu sessions: ein Test ist keine Trainingseinheit.
-- Kalender, Journey-Woche, Haeufigkeitsziel und Coach lesen weiter nur die
-- Einheiten; der Test taucht nur in der Rueckschau auf.
--
-- RLS und Grants wie bei allen Tabellen (strikt auf die eigene user_id). Kein
-- Seed. Idempotent (create if not exists, drop policy if exists).
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- 1. Tabelle
create table if not exists public.rm_tests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  date        date not null,
  weight      numeric not null,
  reps        integer not null,
  est_rm      numeric not null,
  previous_rm numeric,
  created_at  timestamptz not null default now()
);

-- Zugriffe filtern je Uebung (Detailseite) bzw. je Nutzer und Datum (Verlauf).
create index if not exists rm_tests_user_exercise_idx
  on public.rm_tests (user_id, exercise_id);
create index if not exists rm_tests_user_date_idx
  on public.rm_tests (user_id, date);

-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
alter table public.rm_tests enable row level security;

drop policy if exists "rm_tests_select_own" on public.rm_tests;
create policy "rm_tests_select_own" on public.rm_tests
  for select using (auth.uid() = user_id);

drop policy if exists "rm_tests_insert_own" on public.rm_tests;
create policy "rm_tests_insert_own" on public.rm_tests
  for insert with check (auth.uid() = user_id);

drop policy if exists "rm_tests_update_own" on public.rm_tests;
create policy "rm_tests_update_own" on public.rm_tests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rm_tests_delete_own" on public.rm_tests;
create policy "rm_tests_delete_own" on public.rm_tests
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.rm_tests to authenticated;
