-- 0004 Workouts editierbar & Journey-Zuordnung – Lieferung 1
-- Konzept: docs/Konzept-Workouts-und-Journey-Zuordnung.md, Abschnitt 4.
--
-- Dieser Schritt legt den Unterbau: die Verknuepfungstabelle journey_workouts,
-- das Soft-Archiv-Feld templates.active und die Namens-Eindeutigkeit pro Nutzer.
-- Kein sichtbares Verhalten aendert sich (keine Lesestelle wertet die neuen
-- Strukturen aus). Sicher wiederholbar: idempotent geschrieben.

begin;

-- 1. Soft-Archiv fuer Workouts (statt hartem Loeschen, wie bei Uebungen).
--    Default true, damit die bestehenden V1-Workouts aktiv bleiben.
alter table public.templates
  add column if not exists active boolean not null default true;

-- 2. Namens-Eindeutigkeit pro Nutzer ueber ALLE Workouts (inkl. archivierter),
--    damit ein Reaktivieren nie mit einem gleichnamigen Workout kollidiert.
--    Vorab pruefen und mit klarer Meldung abbrechen, falls der Altbestand schon
--    doppelte Namen traegt – der Unique-Index kaeme sonst kommentarlos zu Fall.
do $$
declare
  dopp integer;
begin
  select count(*) into dopp
    from (
      select user_id, name
        from public.templates
       group by user_id, name
      having count(*) > 1
    ) d;
  if dopp > 0 then
    raise exception 'Abbruch: % doppelte(r) Workout-Name(n) vorhanden. Namen eindeutig machen, bevor der Unique-Index gesetzt wird.', dopp;
  end if;
end $$;

create unique index if not exists templates_unique_user_name
  on public.templates (user_id, name);

-- 3. journey_workouts – ordnet Workouts der aktiven Journey zu (reine Ja/Nein-Menge,
--    bewusst ohne position: die Empfehlungsreihenfolge bestimmt der Coach). Beim
--    Entfernen einer Journey oder eines Workouts raeumt sich die Zuordnung mit auf.
create table if not exists public.journey_workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  journey_id  uuid not null references public.journeys(id) on delete cascade,
  template_id uuid not null references public.templates(id) on delete cascade,
  unique (user_id, journey_id, template_id)
);

-- 4. Row Level Security + Grant fuer die neue Tabelle (gleiches Muster wie in
--    0001 fuer alle Tabellen: vier Policies strikt auf die eigene user_id).
alter table public.journey_workouts enable row level security;

drop policy if exists "journey_workouts_select_own" on public.journey_workouts;
create policy "journey_workouts_select_own" on public.journey_workouts
  for select using (auth.uid() = user_id);

drop policy if exists "journey_workouts_insert_own" on public.journey_workouts;
create policy "journey_workouts_insert_own" on public.journey_workouts
  for insert with check (auth.uid() = user_id);

drop policy if exists "journey_workouts_update_own" on public.journey_workouts;
create policy "journey_workouts_update_own" on public.journey_workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "journey_workouts_delete_own" on public.journey_workouts;
create policy "journey_workouts_delete_own" on public.journey_workouts
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.journey_workouts to authenticated;

commit;
