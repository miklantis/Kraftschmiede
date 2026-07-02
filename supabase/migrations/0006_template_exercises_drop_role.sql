-- 0006 – template_exercises.role entfernen
--
-- Die Rolle einer Uebung in einer Vorlage (primary/secondary/core) war reines
-- Anzeige-/Ordnungsraster und wurde von Coach, Empfehlung, Aufwaermen und Live
-- nie ausgewertet. Mit Version 1.3.16 ist sie aus der App vollstaendig
-- entfernt (kein Rollen-Dropdown mehr, keine gruppierte Detailansicht); die
-- Spalte lag seitdem ungenutzt mit ihrem Default 'primary' in der Tabelle.
-- Diese Migration zieht sie sauber.
--
-- Die inline definierte CHECK-Beschraenkung (role in ('primary','secondary',
-- 'core')) faellt mit der Spalte automatisch weg. Idempotent: laeuft nur, wenn
-- die Spalte noch existiert. Kein Datenverlust von Belang, da der Wert
-- funktionslos war.

alter table public.template_exercises
  drop column if exists role;
