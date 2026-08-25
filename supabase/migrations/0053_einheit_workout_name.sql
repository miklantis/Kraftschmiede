-- 0053 – Workout-Name an der Einheit
--
-- Was:   Neue Spalte `template_name` an `public.sessions` (Text, nullable).
--        Leer = noch nicht eingebrannt.
-- Warum: Eine abgeschlossene Journey ist ein Protokoll, kein Plan (ADR-0022).
--        Bisher steht der Workout-Name nur in `templates`; `sessions.template_id`
--        ist ein Verweis. Ein Umbenennen wirkte damit rueckwirkend bis in eine
--        laengst abgeschlossene Journey hinein. Beim Abschluss der Journey wird
--        der dann gueltige Name in ihre Einheiten geschrieben und ist ab da fest.
-- Fuer wen: jeder Nutzer; die Spalte gehoert zur Einheit und wandert damit
--        automatisch in Export und Wiederherstellung.
--
-- Bestand: Die Einheiten bereits abgeschlossener Journeys bekommen einmalig den
-- heute gueltigen Namen ihres Workouts. Das ist der Stand von heute, nicht der
-- von damals – bewusst in Kauf genommen, damit es keinen dauerhaften Sonderfall
-- "alt ohne Namen" gibt. Einheiten der laufenden Journey und freies Training
-- bleiben leer: dort brennt erst der Abschluss ein.
--
-- Zeilensicherheit und Rechte haengen an der Tabelle und gelten unveraendert
-- weiter; eine neue Spalte braucht dort nichts.
--
-- Idempotent: `add column if not exists`, und das Nachtragen fasst nur Zeilen an,
-- deren Name noch leer ist. Mehrfaches Ausfuehren aendert nach dem ersten Lauf
-- nichts mehr.

alter table public.sessions
  add column if not exists template_name text;

update public.sessions s
set template_name = t.name
from public.templates t
where s.template_id = t.id
  and s.template_name is null
  and s.journey_id is not null
  and exists (
    select 1
    from public.journeys j
    where j.id = s.journey_id
      and j.active is not true
  );
