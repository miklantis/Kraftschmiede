-- 0048 Phasentyp per Fremdschluessel an die Bausteine binden
-- ----------------------------------------------------------------
-- Issue #341 (Konzept docs/Konzept-Bausteine-Datenstruktur.md, Abschnitt 9 -
-- die dortige Entscheidung "bewusst kein Fremdschluessel" wird hier revidiert).
--
-- Was: `phases.focus` und `journey_template_phases.focus` zeigen ab jetzt per
-- Fremdschluessel auf `phase_types`, gefuehrt ueber Nutzer plus Schluessel
-- (die Bausteine liegen pro Nutzer, ADR-0002). Die bisherigen CHECK-Listen an
-- beiden Phasentabellen entfallen dafuer.
--
-- Warum: Bisher hielten drei unabhaengige Stellen die gueltigen Typen fest -
-- die CHECK-Liste je Phasentabelle, das Enum im Code (`focusEnum`) und die
-- geseedeten Zeilen in `phase_types`. Liefen sie auseinander, merkte es nur der
-- Abgleichstest, und der erst beim naechsten Testlauf. Der Fremdschluessel
-- macht daraus ein "kann nicht passieren": eine Phase kann keinen Typ mehr
-- tragen, den es als Baustein nicht gibt. Zweiter Gewinn: ein Baustein, auf den
-- Phasen zeigen, laesst sich nicht mehr versehentlich loeschen - wichtig,
-- sobald Bausteine editierbar werden.
--
-- Zwei Stellen bleiben: `focusEnum` im Code (TypeScript sieht den
-- Fremdschluessel nicht) und der CHECK auf `phase_types.key`. Von drei Stellen
-- fallen zwei weg, nicht alle drei.
--
-- Fuer wen: alle Nutzer. Geprueft vor dem Anlegen: alle vier Phasen der
-- laufenden Journey und alle sechs Vorlagenphasen haben ihren passenden
-- Baustein, es ist also keine Datenkorrektur noetig.
--
-- Wirkung: keine sichtbare. Das Schreiben von Phasen bleibt unveraendert,
-- solange die Bausteine des Nutzers geseedet sind. Zwei Folgen im Betrieb:
-- der Seed legt die Bausteine jetzt vor den Journey-Vorlagen an (src/lib/seed.ts),
-- und eine Wiederherstellung scheitert, wenn die Sicherung keine Bausteine
-- enthaelt - frueher lief sie durch und hinterliess Phasen ohne Typ.
--
-- Bewusst NO ACTION statt RESTRICT: Beim Loeschen eines Kontos raeumt
-- `auth.users` beide Seiten per CASCADE ab. NO ACTION prueft erst am Ende der
-- Anweisung, wenn auch die Phasen weg sind; RESTRICT wuerde sofort pruefen und
-- das Loeschen abbrechen.
--
-- Idempotent: die Fremdschluessel werden nur angelegt, wenn es sie nicht schon
-- gibt, die CHECKs per "drop constraint if exists" entfernt.
-- Erwartete Ausgabe im SQL-Editor: "No rows returned".

-- ----------------------------------------------------------------
-- 1. Vorpruefung: zeigt jede Phase auf einen vorhandenen Baustein?
-- ----------------------------------------------------------------
-- Ohne diese Pruefung meldet erst der Fremdschluessel den Fehler, und zwar in
-- Postgres-Sprache. Hier steht stattdessen, was zu tun ist.

do $$
declare
  offene_phasen  integer;
  offene_vorlage integer;
begin
  select count(*) into offene_phasen
    from public.phases p
   where not exists (select 1 from public.phase_types pt
                      where pt.user_id = p.user_id and pt.key = p.focus);

  select count(*) into offene_vorlage
    from public.journey_template_phases tp
   where not exists (select 1 from public.phase_types pt
                      where pt.user_id = tp.user_id and pt.key = tp.focus);

  if offene_phasen > 0 or offene_vorlage > 0 then
    raise exception
      'Abbruch: % Phase(n) und % Vorlagenphase(n) haben keinen passenden Baustein. Erst die fehlenden Zeilen in phase_types anlegen (Migration 0043 erneut ausfuehren), dann diese Migration.',
      offene_phasen, offene_vorlage;
  end if;
end $$;

-- ----------------------------------------------------------------
-- 2. Fremdschluessel auf die Bausteine
-- ----------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'phases_focus_fkey'
       and conrelid = 'public.phases'::regclass
  ) then
    alter table public.phases
      add constraint phases_focus_fkey
      foreign key (user_id, focus)
      references public.phase_types (user_id, key);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'journey_template_phases_focus_fkey'
       and conrelid = 'public.journey_template_phases'::regclass
  ) then
    alter table public.journey_template_phases
      add constraint journey_template_phases_focus_fkey
      foreign key (user_id, focus)
      references public.phase_types (user_id, key);
  end if;
end $$;

-- Index auf der zeigenden Seite: ohne ihn muss Postgres beim Loeschen eines
-- Bausteins beide Phasentabellen komplett durchsehen.
create index if not exists phases_user_focus_idx
  on public.phases (user_id, focus);
create index if not exists journey_template_phases_user_focus_idx
  on public.journey_template_phases (user_id, focus);

-- ----------------------------------------------------------------
-- 3. Die alten CHECK-Listen entfernen
-- ----------------------------------------------------------------
-- Der Fremdschluessel trifft dieselbe Aussage strenger: er prueft nicht gegen
-- eine getippte Liste, sondern gegen die Bausteine des Nutzers.

alter table public.phases
  drop constraint if exists phases_focus_check;

alter table public.journey_template_phases
  drop constraint if exists journey_template_phases_focus_check;
