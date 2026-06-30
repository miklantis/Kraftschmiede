# ADR-0004 – Eine aktive Journey pro Nutzer als DB-Constraint

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Ein Nutzer soll zu einem Zeitpunkt genau einer Journey folgen. Diese Invariante nur in
der Anwendungslogik zu prüfen, lässt Lücken: ein Bug oder ein paralleler Schreibvorgang
könnte zwei aktive Journeys erzeugen.

## Entscheidung

Die Invariante wird in der Datenbank erzwungen, über einen Partial Unique Index
`journeys_one_active_per_user` auf `user_id where active`. Damit kann es technisch nie
mehr als eine aktive Journey pro Nutzer geben.

## Konsequenzen

- Die Regel hält auch dann, wenn die Anwendungslogik einen Fehler hätte.
- Wo möglich werden Invarianten als DB-Constraints abgebildet, nicht nur im Code, weil
  die Datenbank die letzte verlässliche Schicht ist.
- Beim Wechsel der aktiven Journey muss die alte erst deaktiviert werden, sonst greift
  der Index.
