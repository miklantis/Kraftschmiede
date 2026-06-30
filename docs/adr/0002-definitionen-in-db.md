# ADR-0002 – Definitionen in die Datenbank

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Übungen, Vorlagen und Journey-Definitionen müssen irgendwo liegen. Zwei Wege standen
zur Wahl: fest im Code als Import oder in der Datenbank. Eine Mischung aus beidem würde
zwei verschiedene Zugriffsmuster bedeuten.

## Entscheidung

Übungen, Vorlagen und Journey-Definitionen liegen in der Datenbank, nicht im Code. Die
App ist damit voll datengetrieben: alle Daten kommen über dasselbe Zugriffsmuster
(Query-Hooks). Die Definitionen liegen pro Nutzer (`user_id`/RLS) und werden beim ersten
Start aus einem Seed befüllt; damit sind sie später editierbar, falls gewünscht.

(Für Skill-Definitionen gilt eine eigene Abwägung, siehe ADR-0003.)

## Konsequenzen

- Einheitlicher Datenzugriff über Query-Hooks, keine Mischung aus Code-Imports und
  DB-Abfragen. Das dient der Wartbarkeit.
- Kosten: mehr Schema, vor allem bei verschachtelten Strukturen, also mehrere verbundene
  Tabellen.
- Definitionen sind pro Nutzer editierbar, ohne ein Deployment.
