-- 0044 Bauart an die Phase schreiben (plan_builder, load_builder, careful)
-- ----------------------------------------------------------------
-- Schritt 2 von "Bausteine in der Datenbank" (Issue #321/#323, Konzept
-- docs/Konzept-Bausteine-Datenstruktur.md, Abschnitte 2, 9 und 11).
--
-- Was: Die Phasenzeile bekommt drei Felder, die festhalten, wie ihre Listen
-- entstanden sind: `plan_builder` (Bauregel der Wochenliste), `load_builder`
-- (Bauregel der Lastliste) und `careful` (steigert der Coach hier vorsichtig?).
-- Beide Phasen-Tabellen bekommen sie, weil die Vorlagenphase beim Journey-Start
-- unveraendert mitwandert.
--
-- Warum: Ein Wochenplan allein sagt nicht, was er tut. Kraft- und Testphasen
-- tragen beide einen und verhalten sich gegensaetzlich - die eine faehrt die
-- Last hoch, die andere entlastet auf 60 %. Bisher stand die Unterscheidung als
-- Fokus-Liste im Code (WEEK_PLAN_FOCUSES, LOAD_PLAN_FOCUSES) und musste neben
-- den Daten gepflegt werden. Ab hier sagt jede Phase selbst, wie sie gebaut
-- wurde.
--
-- Fuer wen: alle Nutzer. Der Nachtrag gilt auch fuer die laufende Journey; die
-- Regel dafuer ist mechanisch ableitbar (Konzept Abschnitt 11) und traegt genau
-- das ein, was heute im Code steht. Fachlich aendert sich nichts.
--
-- Wirkung: keine Verhaltensaenderung. Nach dieser Migration lesen
-- useFinishSession, phaseContext, suitability und der Coach den Vermerk statt
-- einer Fokus-Liste - mit demselben Ergebnis wie vorher.
--
-- Idempotent: add column if not exists, drop constraint if exists vor add, und
-- der Nachtrag laeuft nur, solange noch keine Zeile einen Vermerk traegt.
-- Mehrfaches Ausfuehren aendert nichts.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- ----------------------------------------------------------------
-- 1. Spalten
-- ----------------------------------------------------------------
-- Textspalten statt Enum-Typen: die Bauregeln sind ein Vertrag mit dem Code
-- (engine/weekPlan.ts), die CHECK-Liste haelt die gueltigen Namen fest - so wie
-- bei focus auch. `careful` ist not null mit Vorgabe false, damit keine Phase
-- ohne Aussage dasteht.

alter table public.phases
  add column if not exists plan_builder text,
  add column if not exists load_builder text,
  add column if not exists careful boolean not null default false;

alter table public.journey_template_phases
  add column if not exists plan_builder text,
  add column if not exists load_builder text,
  add column if not exists careful boolean not null default false;

comment on column public.phases.plan_builder is
  'Bauregel der Wochenliste (strength_ladder, power_ladder, test); null = keine Wochenliste.';
comment on column public.phases.load_builder is
  'Bauregel der Lastliste (rebuild_ramp); null = keine Lastvorgabe.';
comment on column public.phases.careful is
  'Steigert der Coach in dieser Phase vorsichtig (Wiedereinstieg, Wiederaufbau)?';
comment on column public.journey_template_phases.plan_builder is
  'Bauregel der Wochenliste (strength_ladder, power_ladder, test); null = keine Wochenliste.';
comment on column public.journey_template_phases.load_builder is
  'Bauregel der Lastliste (rebuild_ramp); null = keine Lastvorgabe.';
comment on column public.journey_template_phases.careful is
  'Steigert der Coach in dieser Phase vorsichtig (Wiedereinstieg, Wiederaufbau)?';

-- ----------------------------------------------------------------
-- 2. Gueltige Bauregel-Namen
-- ----------------------------------------------------------------
-- Dieselbe Liste wie in phase_types (Migration 0043) und im Code
-- (engine/weekPlan.ts). Sie steht bewusst als CHECK und nicht als
-- Fremdschluessel: die Bausteine liegen pro Nutzer (ADR-0002), ein Verweis
-- muesste ueber (user_id, key) laufen (Konzept Abschnitt 9).

alter table public.phases
  drop constraint if exists phases_plan_builder_check;
alter table public.phases
  add constraint phases_plan_builder_check
  check (plan_builder is null or plan_builder in ('strength_ladder', 'power_ladder', 'test'));

alter table public.phases
  drop constraint if exists phases_load_builder_check;
alter table public.phases
  add constraint phases_load_builder_check
  check (load_builder is null or load_builder in ('rebuild_ramp'));

alter table public.journey_template_phases
  drop constraint if exists journey_template_phases_plan_builder_check;
alter table public.journey_template_phases
  add constraint journey_template_phases_plan_builder_check
  check (plan_builder is null or plan_builder in ('strength_ladder', 'power_ladder', 'test'));

alter table public.journey_template_phases
  drop constraint if exists journey_template_phases_load_builder_check;
alter table public.journey_template_phases
  add constraint journey_template_phases_load_builder_check
  check (load_builder is null or load_builder in ('rebuild_ramp'));

-- ----------------------------------------------------------------
-- 3. Nachtrag fuer den Bestand
-- ----------------------------------------------------------------
-- Regel (Konzept Abschnitt 11), fuer beide Tabellen gleich:
--
--   focus = strength mit Wochenliste -> plan_builder = strength_ladder
--   focus = power    mit Wochenliste -> plan_builder = power_ladder
--   focus = test     mit Wochenliste -> plan_builder = test
--   focus = reentry                  -> careful = true
--   alle uebrigen                    -> leer bzw. false
--
-- load_builder bleibt ueberall leer: die einzige Lastlisten-Bauregel gehoert
-- zum Wiederaufbau-Baustein, den es als Phasen-Fokus noch nicht gibt.
--
-- Der Nachtrag laeuft nur, solange keine Zeile einen Vermerk traegt. Damit
-- bleibt ein zweiter Lauf folgenlos und ueberschreibt spaeter gesetzte Werte
-- nicht (etwa die Wiederaufbau-Phasen aus Schritt 5).

do $$
declare
  bereits_vermerkt boolean;
begin
  select exists (
    select 1 from public.phases
    where plan_builder is not null or load_builder is not null or careful
    union all
    select 1 from public.journey_template_phases
    where plan_builder is not null or load_builder is not null or careful
  ) into bereits_vermerkt;

  if bereits_vermerkt then
    raise notice 'Bauart bereits vermerkt - Nachtrag uebersprungen.';
    return;
  end if;

  update public.phases set
    plan_builder = case
      when week_plan is null then null
      when focus = 'strength' then 'strength_ladder'
      when focus = 'power' then 'power_ladder'
      when focus = 'test' then 'test'
      else null
    end,
    careful = (focus = 'reentry');

  update public.journey_template_phases set
    plan_builder = case
      when week_plan is null then null
      when focus = 'strength' then 'strength_ladder'
      when focus = 'power' then 'power_ladder'
      when focus = 'test' then 'test'
      else null
    end,
    careful = (focus = 'reentry');
end $$;
