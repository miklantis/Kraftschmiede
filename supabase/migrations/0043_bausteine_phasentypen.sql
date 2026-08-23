-- 0043 Bausteine (phase_types): Tabelle anlegen und seeden
-- ----------------------------------------------------------------
-- Schritt 1 von "Bausteine in der Datenbank" (Issue #321/#322, Konzept
-- docs/Konzept-Bausteine-Datenstruktur.md, Abschnitte 2 bis 5).
--
-- Was: Eine neue Stammdaten-Tabelle `phase_types` haelt je Baustein einer
-- Journey-Phase fest, womit eine Phase dieses Typs anfaengt (Wochen, Saetze,
-- Band, Entlastung, Last) und was daran einstellbar ist. Sie sagt ausdruecklich
-- nicht, wie gerechnet wird: der Steuerweg steht als Schluesselwort in der
-- Zeile (`plan_builder`, `load_builder`), die Rechnung bleibt im Code.
--
-- Warum: Bisher stehen diese Werte im Code (Wiederholungsbaender, Anzeigenamen,
-- Steuerweg-Listen) und getippt in den Vorlagenphasen. Ab hier ist die Tabelle
-- die Quelle; der Code wird in den Folgeschritten davon entlastet.
--
-- Fuer wen: pro Nutzer geseedet wie Uebungen und Vorlagen (ADR-0002), damit die
-- Bausteine spaeter je Konto anpassbar sind. Neue Nutzer bekommen sie ueber den
-- Seed (src/seed/definitions.ts, phaseTypeSeeds); diese Migration zieht sie fuer
-- bestehende Nutzer nach.
--
-- Wirkung: keine. Nach diesem Schritt existieren die acht Bausteine als Daten,
-- gelesen werden sie noch nirgends. Der Schritt ist bewusst folgenlos.
--
-- Idempotent: create if not exists, drop policy if exists, und der Seed legt je
-- Nutzer nur fehlende Schluessel an. Mehrfaches Ausfuehren aendert nichts.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- ----------------------------------------------------------------
-- 1. Tabelle
-- ----------------------------------------------------------------
-- Einzelne Spalten statt einem jsonb-Feld: ein Baustein hat wenige, feste
-- Eigenschaften, so sind sie im SQL lesbar und per CHECK pruefbar.
-- Die Sperren (sets_locked, rep_band_locked) gehoeren bewusst in die Daten und
-- nicht erst in die Oberflaeche: sie halten fest, wo eine Einstellung
-- wirkungslos waere (ADR-0018).

create table if not exists public.phase_types (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,

  -- Schluessel, identisch mit phases.focus. Der Vertrag mit dem Code: neue
  -- Zeilen kann sich niemand ausdenken, die Engine wuesste nichts damit anzufangen.
  key                text not null
                       check (key in ('endurance','hypertrophy','reentry','maintenance',
                                      'strength','power','test','rebuild')),
  name               text not null,
  summary            text not null,
  position           integer not null default 0 check (position >= 0),

  -- Steuerweg: gibt eine Wochenliste Saetze und Wiederholungen vor (plan) oder
  -- steuert der Coach (coach)?
  control            text not null check (control in ('coach','plan')),
  -- Welche Wochenliste bzw. Lastliste beim Anlegen einer Phase gebaut wird.
  -- Die Bauregeln selbst stehen im Code.
  plan_builder       text check (plan_builder in ('strength_ladder','power_ladder','test')),
  load_builder       text check (load_builder in ('rebuild_ramp')),
  -- Vorsichtige Steigerung des Coaches (Wiedereinstieg und Wiederaufbau).
  careful            boolean not null default false,

  weeks_min          integer not null,
  weeks_max          integer not null,
  weeks_default      integer not null,

  -- Satzrampe von der ersten zur letzten Phasenwoche; sets_max begrenzt die
  -- einstellbare Satzzahl. sets_locked: die Saetze kommen aus der Wochenliste.
  sets_start_default integer not null,
  sets_end_default   integer not null,
  sets_max           integer not null,
  sets_locked        boolean not null default false,

  -- Vorgabe-Wiederholungsband und der Korridor, in dem es verstellt werden darf.
  -- null/null = die Uebung behaelt ihr eigenes Band (Erhaltung).
  rep_min_default    integer,
  rep_max_default    integer,
  rep_bound_min      integer,
  rep_bound_max      integer,
  -- true = das Band hat in diesem Steuerweg keine Wirkung (ADR-0018).
  rep_band_locked    boolean not null default false,

  deload_allowed     boolean not null default false,
  deload_default     integer,

  -- Start- und Ziellast der Rampe; nur bei gesetztem load_builder.
  load_start_default numeric,
  load_end_default   numeric,

  -- Reiner Hinweistext ohne Wirkung; das System prueft die Abfolge nicht.
  placement_hint     text,

  unique (user_id, key),

  -- Steuerweg und Bauregel gehoeren zusammen.
  constraint phase_types_plan_stimmig
    check ((control = 'plan') = (plan_builder is not null)),
  -- Gesperrte Saetze hat genau, wer eine Wochenliste baut - und umgekehrt.
  constraint phase_types_saetze_stimmig
    check (sets_locked = (plan_builder is not null)),
  -- Ein Band ruht nur dort, wo eine Wochenliste die Wiederholungen vorgibt.
  constraint phase_types_band_ruht_nur_im_plan
    check (not rep_band_locked or plan_builder is not null),

  constraint phase_types_wochen_stimmig
    check (weeks_min >= 1 and weeks_min <= weeks_default and weeks_default <= weeks_max),
  constraint phase_types_saetze_grenzen
    check (sets_start_default >= 1 and sets_end_default >= 1
           and sets_max >= greatest(sets_start_default, sets_end_default)),

  -- Band: entweder beide Werte oder keiner, und min <= max.
  constraint phase_types_band_paarig
    check ((rep_min_default is null) = (rep_max_default is null)
           and (rep_min_default is null or rep_min_default <= rep_max_default)),
  -- Korridor: nur wo es ein Band gibt, und er muss es einschliessen.
  constraint phase_types_korridor_stimmig
    check ((rep_bound_min is null) = (rep_bound_max is null)
           and (rep_bound_min is null
                or (rep_min_default is not null
                    and rep_bound_min <= rep_min_default
                    and rep_max_default <= rep_bound_max))),

  -- Entlastung nur wo erlaubt, innerhalb der Phase und nie in ihrer letzten
  -- Woche - dort wuerde sie verpuffen und die Phase auf einer Absenkung enden.
  constraint phase_types_entlastung_stimmig
    check ((deload_allowed or deload_default is null)
           and (deload_default is null
                or (deload_default >= 1 and deload_default < weeks_default))),

  -- Last: paarig, nur mit Lastliste, aufsteigend und hoechstens volles Niveau.
  constraint phase_types_last_stimmig
    check ((load_start_default is null) = (load_end_default is null)
           and (load_builder is not null) = (load_start_default is not null)
           and (load_start_default is null
                or (load_start_default > 0
                    and load_start_default <= load_end_default
                    and load_end_default <= 1)))
);

-- Gelesen wird je Nutzer in Reihenfolge der Auswahl.
create index if not exists phase_types_user_position_idx
  on public.phase_types (user_id, position);

-- ----------------------------------------------------------------
-- 2. Row Level Security + Grants (vier Policies, strikt auf die eigene user_id)
-- ----------------------------------------------------------------

alter table public.phase_types enable row level security;

drop policy if exists "phase_types_select_own" on public.phase_types;
create policy "phase_types_select_own" on public.phase_types
  for select using (auth.uid() = user_id);

drop policy if exists "phase_types_insert_own" on public.phase_types;
create policy "phase_types_insert_own" on public.phase_types
  for insert with check (auth.uid() = user_id);

drop policy if exists "phase_types_update_own" on public.phase_types;
create policy "phase_types_update_own" on public.phase_types
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "phase_types_delete_own" on public.phase_types;
create policy "phase_types_delete_own" on public.phase_types
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.phase_types to authenticated;

-- ----------------------------------------------------------------
-- 3. Seed: die acht Bausteine je Nutzer mit vorhandenen Vorlagen
-- ----------------------------------------------------------------
-- Werte 1:1 aus Abschnitt 4 und 5 des Konzepts und deckungsgleich mit
-- src/seed/definitions.ts (phaseTypeSeeds). Nur fehlende Schluessel werden
-- angelegt, bestehende Zeilen bleiben unangetastet.

insert into public.phase_types
  (user_id, key, name, summary, position, control, plan_builder, load_builder, careful,
   weeks_min, weeks_max, weeks_default,
   sets_start_default, sets_end_default, sets_max, sets_locked,
   rep_min_default, rep_max_default, rep_bound_min, rep_bound_max, rep_band_locked,
   deload_allowed, deload_default,
   load_start_default, load_end_default, placement_hint)
select u.id, b.key, b.name, b.summary, b.position, b.control, b.plan_builder,
       b.load_builder, b.careful,
       b.weeks_min, b.weeks_max, b.weeks_default,
       b.sets_start_default, b.sets_end_default, b.sets_max, b.sets_locked,
       b.rep_min_default, b.rep_max_default, b.rep_bound_min, b.rep_bound_max,
       b.rep_band_locked,
       b.deload_allowed, b.deload_default,
       b.load_start_default, b.load_end_default, b.placement_hint
  from (select distinct user_id as id from public.journey_templates) u
 cross join (
   values
     ('endurance', 'Kraftausdauer',
      'Viele Wiederholungen bei moderatem Gewicht: baut Kapazität und Durchhaltevermögen auf, ohne schwer zu werden.',
      0, 'coach', null::text, null::text, false,
      3, 8, 4,
      2, 4, 6, false,
      12, 18, 10, 25, false,
      true, 3,
      null::numeric, null::numeric, null::text),

     ('hypertrophy', 'Hypertrophie',
      'Muskelaufbau über das Volumen: mittleres Wiederholungsband, die Satzzahl steigt über die Wochen.',
      1, 'coach', null, null, false,
      3, 8, 5,
      2, 6, 8, false,
      8, 12, 6, 15, false,
      true, 4,
      null, null, null),

     ('reentry', 'Wiedereinstieg',
      'Vorsichtiger Start nach einer Pause: wenige Sätze, und gesteigert wird nur, wenn die letzte Einheit leicht und schmerzfrei war.',
      2, 'coach', null, null, true,
      1, 4, 2,
      2, 2, 3, false,
      5, 8, 5, 12, false,
      false, null,
      null, null, null),

     ('maintenance', 'Erhaltung',
      'Hält das Erreichte mit wenig Aufwand: niedrige Satzzahl, und jede Übung behält ihr eigenes Wiederholungsband.',
      3, 'coach', null, null, false,
      1, 12, 3,
      3, 3, 5, false,
      null, null, null, null, false,
      true, null,
      null, null, null),

     ('strength', 'Maximalkraft',
      'Schwere Wochenleiter mit fester Satzzahl: das Gewicht steigt Woche für Woche, die Wiederholungen gehen zurück.',
      4, 'plan', 'strength_ladder', null, false,
      3, 6, 5,
      4, 4, 4, true,
      4, 6, null, null, true,
      false, null,
      null, null, null),

     ('power', 'Intensivierung',
      'Kurz und schwer nach einer Kraftphase: eine eigene, steilere Leiter bis in den Einzelversuch.',
      5, 'plan', 'power_ladder', null, false,
      3, 4, 3,
      4, 4, 4, true,
      3, 5, null, null, true,
      false, null,
      null, null, null),

     ('test', 'Test/Peak',
      'Ausgeruht messen: eine Entlastung stellt frei, danach wird das Maximum getestet.',
      6, 'plan', 'test', null, false,
      1, 2, 2,
      2, 2, 2, true,
      2, 4, null, null, true,
      false, null,
      null, null, null),

     ('rebuild', 'Wiederaufbau',
      'Zurück auf das Niveau vor der Pause: die Phase gibt das Gewicht Woche für Woche vor, von 65 auf 95 Prozent des Referenzgewichts.',
      7, 'coach', null, 'rebuild_ramp', true,
      3, 6, 3,
      2, 4, 6, false,
      6, 10, 5, 15, false,
      false, null,
      0.65, 0.95,
      'Gehört an den Anfang der Journey – später gesetzt zieht er auf ein Niveau von vor mehreren Wochen zurück.')
 ) as b (key, name, summary, position, control, plan_builder, load_builder, careful,
         weeks_min, weeks_max, weeks_default,
         sets_start_default, sets_end_default, sets_max, sets_locked,
         rep_min_default, rep_max_default, rep_bound_min, rep_bound_max, rep_band_locked,
         deload_allowed, deload_default,
         load_start_default, load_end_default, placement_hint)
 where not exists (
   select 1 from public.phase_types pt
    where pt.user_id = u.id and pt.key = b.key
 );
