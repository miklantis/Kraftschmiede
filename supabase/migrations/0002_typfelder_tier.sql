-- 0002 Typfelder am Uebungskatalog aufraeumen – Lieferung 1 (ueberlappend)
-- Konzept: docs/Konzept-Typfelder-Aufraeumen.md, Abschnitt 3.
--
-- Dieser Schritt fuegt das neue Feld `tier` hinzu und sichert die Barbell-Wahrheit in
-- `equipment`, ohne die Altfelder `category`/`kind` zu entfernen. Alt- und Neuform tragen
-- ueberlappend, damit der laufende Code unveraendert weiterlaeuft. Das Loeschen der alten
-- Spalten passiert erst in einer spaeteren Migration (Lieferung 3).
--
-- Sicher wiederholbar: idempotent geschrieben (if not exists / deterministischer Backfill).

begin;

-- 1. tier anlegen (Enum als CHECK-Constraint, bewusst erweiterbar).
alter table public.exercises
  add column if not exists tier text not null default 'main'
    check (tier in ('main', 'accessory'));

-- 2. Backfill tier aus kind: accessory -> accessory, alles andere -> main.
--    core/bodyweight ziehen ihre Einordnung ohnehin aus profile, daher sicher auf main.
update public.exercises
  set tier = case when kind = 'accessory' then 'accessory' else 'main' end;

-- 3. equipment an category angleichen: category ist hier die getraute Quelle.
--    Wo an der Langhantel gearbeitet wird, muss equipment = 'barbell' stehen, weil ab
--    Lieferung 2 die gesamte Stangen-/Rampen-/Plate-Logik allein daran haengt.
update public.exercises
  set equipment = 'barbell'
  where category = 'barbell' and equipment <> 'barbell';

-- 4. Verifikation vor jedem weiteren Schritt: keine vormals-Langhantel-Zeile darf ohne
--    equipment = 'barbell' zurueckbleiben. Weicht etwas ab, bricht die Migration ab und
--    macht den Datenstand sichtbar, bevor spaeter category faellt.
do $$
declare
  fehl integer;
begin
  select count(*) into fehl
    from public.exercises
    where category = 'barbell' and equipment <> 'barbell';
  if fehl > 0 then
    raise exception 'Abbruch: % Uebung(en) mit category=barbell haben equipment<>barbell. category/equipment vor dem Weitermachen pruefen.', fehl;
  end if;
end $$;

commit;
