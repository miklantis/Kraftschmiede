-- 0007 Aktiv/Inaktiv am Uebungskatalog entfernen – Lieferung 2 (Abschluss)
--
-- Entfernt die ungenutzte Spalte `exercises.active`. Uebungen werden seit Version 1.3.29
-- nicht mehr in aktiv/inaktiv getrennt: die Gruppe „Inaktiv / Swaps“ ist raus, alle
-- Uebungen sind normal gruppiert und im Editor waehlbar. Keine Lesestelle im Code greift
-- noch auf die Spalte zu.
--
-- Nachtrag: Dieser Eingriff wurde am 06.07.2026 direkt im Supabase-SQL-Editor ausgefuehrt,
-- die Datei fehlte seitdem im Repo (Luecke bei Nummer 0007). Damit war ein Neuaufbau der
-- Datenbank allein aus den Migrationen nicht mehr deckungsgleich mit dem Ist-Zustand –
-- 0001 legt die Spalte an, niemand entfernte sie wieder. Die Datei wird hier
-- nachgezogen. Auf der bestehenden Datenbank ist sie ein No-Op.
--
-- Das Soft-Archiv der Workouts (`templates.active`, Migration 0004) ist davon nicht
-- betroffen und bleibt unveraendert.
--
-- Sicher wiederholbar (drop column if exists). Der CHECK-Constraint faellt mit der Spalte weg.

begin;

alter table public.exercises drop column if exists active;

commit;
