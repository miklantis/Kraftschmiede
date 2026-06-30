# ADR-0003 – Skill-Definitionen als Seed, Fortschritt in der DB

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Skills (z. B. Klimmzug-Progression) bestehen aus zwei sehr unterschiedlichen Teilen:
einer stabilen Definition (Phasen, Übungen, Voraussetzungen) und dem laufenden
Fortschritt des Nutzers (welche Phase, wie viele Erfolge in Folge). Beide gleich zu
behandeln, würde der Natur der Daten nicht gerecht.

## Entscheidung

Die Skill-Definitionen liegen als Seed in DB-Tabellen (`skills`, `skill_phases`,
`skill_phase_exercises`, `skill_phase_equipment`) – einheitlicher Zugriff über
Query-Hooks und später editierbar. Der Fortschritt steht separat in `skill_progress`.

## Konsequenzen

- Konsistent zu ADR-0002: auch Skill-Definitionen kommen über dasselbe Zugriffsmuster.
- Der Fortschritt ist klar vom Stammdatum getrennt; `skill_progress` führt den
  Konsekutiv-Zähler (Reset bei Fehlversuch) und den Phasenstand.
- Das Schema für Skills ist verschachtelt (Skill → Phasen → Übungen + Equipment), also
  mehrere verbundene Tabellen.
