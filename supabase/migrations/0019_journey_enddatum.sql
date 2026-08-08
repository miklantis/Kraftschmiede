-- Enddatum einer Journey.
-- Wird beim automatischen Abschluss (die Einheit, die das Pensum der letzten
-- Journey-Woche erfuellt) auf das Datum dieser Einheit gesetzt, beim Wechsel auf
-- eine neue Journey auf den Wechseltag. Nullable, weil laufende Journeys und
-- Altbestand keinen Wert tragen. Grundlage fuer die Archiv-Liste (von-bis).
alter table public.journeys
  add column if not exists end_date date;
