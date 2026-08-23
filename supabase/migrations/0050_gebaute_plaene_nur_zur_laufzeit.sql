-- 0050 Gebaute Plaene aus den Vorlagenphasen entfernen
-- ----------------------------------------------------------------
-- Issue #343 (Konzept docs/Konzept-Bausteine-Datenstruktur.md, Abschnitte 5 und
-- 9 - die dortige Festlegung "die Vorlagenphase traegt ihre Listen mit" wird
-- fuer `journey_template_phases` revidiert).
--
-- Was: `week_plan` und `load_plan` entfallen an `journey_template_phases`. Die
-- Vorlagenphase nennt ab jetzt nur noch ihren Baustein (`focus`) und was jemand
-- tatsaechlich eingestellt hat; beide Listen entstehen erst beim Journey-Start
-- aus Baustein und Wochenzahl.
--
-- Warum: Beide Listen sind in der Vorlage vollstaendig ableitbar - aus der
-- Bauregel des Bausteins und der Wochenzahl der Phase. Genau das prueft der
-- Abgleichstest (src/seed/__tests__/abgleich.test.ts) Zeile fuer Zeile. Was ein
-- Test dauerhaft absichern muss, muss man nicht speichern.
--
-- Der staerkere Grund ist der geplante Journey-Editor
-- (docs/Idee-Journey-Editor.md): Die Wochenzahl ist der Regler, an dem ein
-- Nutzer am haeufigsten dreht, und jedes Drehen waere eine Gelegenheit, dass
-- gespeicherte Leiter und Phasenlaenge auseinanderlaufen. Ohne gespeicherte
-- Liste kann keine unpassend werden.
--
-- Was ausdruecklich bleibt: An `phases` bleiben beide Spalten unveraendert. Das
-- ist der Vertrag mit dem Coach (Konzept Abschnitt 2): Im Training wird
-- ausschliesslich die Phasenzeile gelesen, nie der Baustein nachgeschlagen. Die
-- laufende Journey friert ihre fertigen Listen ein - das ist der Zweck der
-- Kopie.
--
-- Nicht wiedergekommen ist der Fall "Phase nennt ihre Laststufen selbst"
-- (`loadPlanFromShares` im Code): Keine Vorlage nutzt ihn. Soll eine Vorlage
-- das kuenftig koennen, bekommt sie ein eigenes Feld, das ausdruecklich
-- "abweichende Stufen" heisst - und keine Kopie des Gebauten ist.
--
-- Fuer wen: alle Nutzer.
--
-- Wirkung: keine sichtbare. Der Journey-Start baut beide Listen beim Anlegen
-- der Phase (src/lib/journeyWrite.ts), mit demselben Ergebnis wie die bisherige
-- Kopie aus der Vorlagenzeile. Die Vorlagen-Auswahl rechnet ihre Wochentabelle
-- jetzt, statt sie zu lesen, und liest dafuer die Bausteine mit. Der
-- Offline-Speicher bekommt eine neue Versionsmarke (src/lib/offline.ts), damit
-- gecachte Vorlagen ohne die Spalten nicht als "keine Vorgabe" gelesen werden.
--
-- Idempotent: die Vorpruefung laeuft nur, solange es die Spalten noch gibt,
-- danach "drop column if exists". Mehrfaches Ausfuehren aendert nichts.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- ----------------------------------------------------------------
-- 1. Vorpruefung: laesst sich jede Liste aus ihrem Baustein wieder herstellen?
-- ----------------------------------------------------------------
-- Was hier weggeworfen wird, ist danach nicht mehr rekonstruierbar. Also erst
-- nachrechnen - und nur loeschen, wenn dabei der heutige Stand herauskommt.
--
-- Geprueft wird, was SQL pruefen kann: dass eine Liste genau dann da ist, wenn
-- der Baustein sie baut, dass sie so lang ist wie die Phase Wochen hat, und
-- dass die Lastrampe auf den Eckwerten des Bausteins anfaengt und aufhoert. Der
-- Vergleich Woche fuer Woche steht im Abgleichstest, weil die Bauregeln selbst
-- im Code stehen (src/engine/weekPlan.ts, src/engine/loadPlan.ts) - ihn hier
-- nachzubauen hiesse, dieselbe Rechnung ein zweites Mal zu pflegen.

do $$
declare
  abweichungen integer;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'journey_template_phases'
       and column_name = 'week_plan'
  ) then
    raise notice 'Gebaute Plaene bereits entfernt - Vorpruefung uebersprungen.';
    return;
  end if;

  select count(*) into abweichungen
    from public.journey_template_phases tp
    join public.phase_types pt
      on pt.user_id = tp.user_id and pt.key = tp.focus
   where
     -- Wochenliste: da genau dann, wenn der Baustein eine Bauregel nennt.
     (tp.week_plan is not null) is distinct from (pt.plan_builder is not null)
     -- ... und so lang wie die Phase Wochen hat.
     or (tp.week_plan is not null
         and jsonb_array_length(tp.week_plan) <> tp.weeks)
     -- Lastliste: da genau dann, wenn Bauregel und beide Eckwerte stehen.
     or (tp.load_plan is not null) is distinct from
          (pt.load_builder is not null
           and pt.load_start_default is not null
           and pt.load_end_default is not null)
     or (tp.load_plan is not null
         and jsonb_array_length(tp.load_plan) <> tp.weeks)
     -- ... und laeuft von der Start- auf die Ziellast des Bausteins.
     or (tp.load_plan is not null
         and (tp.load_plan -> 0 ->> 'loadPct')::numeric
               is distinct from pt.load_start_default)
     or (tp.load_plan is not null
         and (tp.load_plan -> (jsonb_array_length(tp.load_plan) - 1)
                ->> 'loadPct')::numeric
               is distinct from pt.load_end_default);

  if abweichungen > 0 then
    raise exception
      'Abbruch: % Vorlagenphase(n) tragen eine Liste, die ihr Baustein so nicht baut. Erst klaeren, welche Seite stimmt, und die abweichende Seite angleichen - danach diese Migration erneut ausfuehren.',
      abweichungen;
  end if;
end $$;

-- ----------------------------------------------------------------
-- 2. Die beiden Spalten entfernen
-- ----------------------------------------------------------------

alter table public.journey_template_phases
  drop column if exists week_plan,
  drop column if exists load_plan;
