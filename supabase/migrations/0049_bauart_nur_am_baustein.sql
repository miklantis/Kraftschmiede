-- 0049 Bauart-Vermerk aus den Vorlagenphasen entfernen
-- ----------------------------------------------------------------
-- Issue #342 (Konzept docs/Konzept-Bausteine-Datenstruktur.md, Abschnitt 9 -
-- die dortige Festlegung "alle vier Felder bekommen beide Tabellen" wird fuer
-- `journey_template_phases` revidiert).
--
-- Was: `plan_builder`, `load_builder` und `careful` entfallen an
-- `journey_template_phases`. Die Vorlagenphase nennt ab jetzt nur noch ihren
-- Baustein (`focus`); die Bauart kommt beim Journey-Start aus `phase_types`.
--
-- Warum: Dieselbe Aussage stand an zwei Orten - als Vorgabe am Baustein und als
-- Kopie an der Vorlagenphase. Der Bestand ist geprueft: ueber alle sechs
-- Vorlagenphasen und acht Bausteine weicht keine einzige Zeile ab. Die
-- Doppelung traegt also nichts, kann aber auseinanderlaufen. Zweiter Grund ist
-- der geplante Journey-Editor (docs/Idee-Journey-Editor.md): Solange die
-- Vorlagenphase ihre Bauart selbst traegt, koennte ein Editor eine Vorlage
-- speichern, deren Bauart nicht zum gewaehlten Baustein passt. Ohne die Felder
-- ist dieser Fehler nicht mehr moeglich.
--
-- Was ausdruecklich bleibt: An `phases` bleiben alle drei Felder unveraendert.
-- Das ist der Vertrag mit dem Coach (Konzept Abschnitt 2): Im Training wird
-- ausschliesslich die Phasenzeile gelesen, nie der Baustein nachgeschlagen. Die
-- laufende Journey friert ihren Stand ein - das ist der Zweck der Kopie.
--
-- Fuer wen: alle Nutzer.
--
-- Wirkung: keine sichtbare. Der Journey-Start liest ab jetzt die Bausteine mit
-- und setzt die Bauart beim Anlegen der Phase von dort - mit demselben Ergebnis
-- wie die bisherige Kopie aus der Vorlagenzeile. Der Offline-Speicher bekommt
-- dafuer eine neue Versionsmarke (src/lib/offline.ts), damit gecachte Vorlagen
-- ohne die Felder nicht als "keine Bauart" gelesen werden.
--
-- Idempotent: die Vorpruefung laeuft nur, solange es die Spalten noch gibt,
-- danach "drop column if exists". Mehrfaches Ausfuehren aendert nichts.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- ----------------------------------------------------------------
-- 1. Vorpruefung: deckt sich jede Vorlagenphase mit ihrem Baustein?
-- ----------------------------------------------------------------
-- Was hier weggeworfen wird, ist danach nicht mehr rekonstruierbar. Also erst
-- nachrechnen, was der Journey-Start kuenftig setzen wuerde - und nur dann
-- loeschen, wenn dabei genau der heutige Stand herauskommt.
--
-- Die Regel ist dieselbe wie in `buildPhaseFromType` (src/engine/phaseBuild.ts):
-- kein Vermerk ohne die zugehoerige Liste. `careful` haengt an keiner Liste und
-- kommt unveraendert aus dem Baustein.

do $$
declare
  abweichungen integer;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'journey_template_phases'
       and column_name = 'plan_builder'
  ) then
    raise notice 'Bauart-Vermerk bereits entfernt - Vorpruefung uebersprungen.';
    return;
  end if;

  select count(*) into abweichungen
    from public.journey_template_phases tp
    join public.phase_types pt
      on pt.user_id = tp.user_id and pt.key = tp.focus
   where tp.plan_builder is distinct from
           (case when tp.week_plan is null then null else pt.plan_builder end)
      or tp.load_builder is distinct from
           (case when tp.load_plan is null then null else pt.load_builder end)
      or tp.careful is distinct from pt.careful;

  if abweichungen > 0 then
    raise exception
      'Abbruch: % Vorlagenphase(n) tragen eine andere Bauart als ihr Baustein. Erst klaeren, welche Seite stimmt, und die abweichende Seite angleichen - danach diese Migration erneut ausfuehren.',
      abweichungen;
  end if;
end $$;

-- ----------------------------------------------------------------
-- 2. Die drei Spalten entfernen
-- ----------------------------------------------------------------
-- Die CHECK-Listen aus Migration 0044 fallen mit ihren Spalten ohnehin weg; sie
-- werden trotzdem eigens genannt, damit die Absicht in der Datei steht.

alter table public.journey_template_phases
  drop constraint if exists journey_template_phases_plan_builder_check;
alter table public.journey_template_phases
  drop constraint if exists journey_template_phases_load_builder_check;

alter table public.journey_template_phases
  drop column if exists plan_builder,
  drop column if exists load_builder,
  drop column if exists careful;
