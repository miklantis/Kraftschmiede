-- 0003 Typfelder am Uebungskatalog aufraeumen – Lieferung 3 (Abschluss)
-- Konzept: docs/Konzept-Typfelder-Aufraeumen.md, Abschnitt 3 (Schritte 5-6) + 8.
--
-- Entfernt die nun ungenutzten Altspalten `kind` und `category` vom Uebungskatalog.
-- Voraussetzung: Der zugehoerige Code (Version 1.2.60) ist bereits ausgeliefert; keine
-- Lesestelle greift mehr auf diese Spalten zu. Ausfuehren erst NACH dem Update auf 1.2.60.
--
-- Sicher wiederholbar (drop column if exists). CHECK-Constraints fallen mit der Spalte weg.

begin;

alter table public.exercises drop column if exists kind;
alter table public.exercises drop column if exists category;

commit;
