-- 0046 Lastliste statt Lastfaktor (load_plan neu, load_factor entfaellt)
-- ----------------------------------------------------------------
-- Schritt 4 von "Bausteine in der Datenbank" (Issue #321/#325, Konzept
-- docs/Konzept-Bausteine-Datenstruktur.md, Abschnitte 7, 9 und 10).
--
-- Was: Die Last wandert als Liste an die Phase statt als einzelne Zahl. Beide
-- Phasen-Tabellen bekommen `load_plan` (jsonb, nullable) - je Phasenwoche eine
-- Zeile mit dem Anteil des eingefrorenen Referenzgewichts - und verlieren
-- `load_factor`. Ausserdem wird die CHECK-Liste von `focus` um `rebuild`
-- erweitert, damit der Wiederaufbau-Baustein ab Schritt 5 als Phasen-Fokus
-- erlaubt ist.
--
-- Warum: Neben einer Lastliste waere ein einzelner Faktor eine zweite Art,
-- dasselbe zu sagen - genau die doppelte Wahrheit, die dieses Vorhaben
-- abschafft. Eine gleichbleibende Last ist danach eine Liste mit lauter
-- gleichen Zeilen, "keine Vorgabe" ist eine leere Liste (null). Eine Formel
-- (Interpolation zwischen Start- und Zielanteil) kommt ausdruecklich nicht
-- wieder: sie war schon einmal gebaut und wurde zurueckgenommen (ADR-0018).
--
-- Fuer wen: alle Nutzer. Die laufende Journey traegt durchgehend den Lastfaktor
-- 1,0, was heute schon "keine Vorgabe" bedeutet und danach eine leere Liste
-- ist - fuer sie aendert sich nichts. Werte ungleich 1,0 gibt es nur in der
-- Vorlage "Wiederaufbau nach Fasten", die gerade nicht in Benutzung ist; sie
-- werden Wert fuer Wert in eine Liste umgeschrieben, damit die Vorlage bis zu
-- ihrem Umbau (Schritt 7) unveraendert arbeitet.
--
-- Reihenfolge: erst deployen, dann migrieren. Lesen ist unkritisch - eine
-- fehlende Lastliste heisst "keine Vorgabe" -, aber alter Code, der eine
-- Journey startet, wuerde in die verschwundene Spalte schreiben wollen. Nach
-- dem Deploy ist dieses Fenster zu.
--
-- Idempotent: add column if not exists, drop column if exists, die Umschreibung
-- laeuft nur, solange es die alte Spalte noch gibt und die Liste leer ist, und
-- die CHECKs werden vor dem Anlegen entfernt. Mehrfaches Ausfuehren aendert
-- nichts.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- ----------------------------------------------------------------
-- 1. Neue Spalte
-- ----------------------------------------------------------------
-- jsonb wie der Wochenplan (week_plan): eine Liste von Zeilen, deren Form der
-- Code haelt (src/engine/loadPlan.ts). Nullable, weil "keine Vorgabe" der
-- Normalfall ist - dann rechnet der Coach wie gewohnt aus der letzten Leistung.

alter table public.phases
  add column if not exists load_plan jsonb;

alter table public.journey_template_phases
  add column if not exists load_plan jsonb;

comment on column public.phases.load_plan is
  'Lastliste: je Phasenwoche [{"week":1,"loadPct":0.65}, ...]; null = keine Lastvorgabe.';
comment on column public.journey_template_phases.load_plan is
  'Lastliste: je Phasenwoche [{"week":1,"loadPct":0.65}, ...]; null = keine Lastvorgabe.';

-- ----------------------------------------------------------------
-- 2. Bestand umschreiben
-- ----------------------------------------------------------------
-- Ein Lastfaktor ungleich 1,0 wird zu einer Liste mit lauter gleichen Zeilen -
-- eine Zeile je Phasenwoche. Ein Faktor von 1,0 (und null) heisst schon heute
-- "keine Vorgabe" und wird zu keiner Liste; die Phase bleibt leer.
--
-- Laeuft nur, solange es die alte Spalte noch gibt. Ein zweiter Lauf findet sie
-- nicht mehr und ueberspringt den Block.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'journey_template_phases'
      and column_name = 'load_factor'
  ) then
    update public.journey_template_phases p
      set load_plan = (
        select jsonb_agg(
          jsonb_build_object('week', w, 'loadPct', p.load_factor) order by w
        )
        from generate_series(1, greatest(1, p.weeks)) as w
      )
      where p.load_plan is null
        and p.load_factor is not null
        and p.load_factor <> 1;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'phases'
      and column_name = 'load_factor'
  ) then
    update public.phases p
      set load_plan = (
        select jsonb_agg(
          jsonb_build_object('week', w, 'loadPct', p.load_factor) order by w
        )
        from generate_series(1, greatest(1, p.weeks)) as w
      )
      where p.load_plan is null
        and p.load_factor is not null
        and p.load_factor <> 1;
  end if;
end $$;

-- ----------------------------------------------------------------
-- 3. Alte Spalte entfernen
-- ----------------------------------------------------------------

alter table public.phases
  drop column if exists load_factor;

alter table public.journey_template_phases
  drop column if exists load_factor;

-- ----------------------------------------------------------------
-- 4. Fokus-Liste um den Wiederaufbau erweitern
-- ----------------------------------------------------------------
-- Damit fallen die drei Listen der gueltigen Baustein-Schluessel wieder
-- zusammen: CHECK, focusEnum (src/schemas/shared.ts) und die geseedeten Zeilen
-- in phase_types. Der Abgleichstest prueft genau das.
--
-- Die CHECKs aus 0001 tragen die von Postgres vergebenen Namen
-- (<tabelle>_focus_check); sie werden hier ersetzt.

alter table public.phases
  drop constraint if exists phases_focus_check;
alter table public.phases
  add constraint phases_focus_check
  check (focus in ('reentry','hypertrophy','strength','power','endurance','test','maintenance','rebuild'));

alter table public.journey_template_phases
  drop constraint if exists journey_template_phases_focus_check;
alter table public.journey_template_phases
  add constraint journey_template_phases_focus_check
  check (focus in ('reentry','hypertrophy','strength','power','endurance','test','maintenance','rebuild'));
