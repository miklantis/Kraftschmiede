# ADR-0009 – Mutationsreihenfolge vor resumePausedMutations

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Offline eingetragene Änderungen werden als pausierte TanStack-Mutationen gehalten und
bei Verbindung nachgereicht (siehe ADR-0001). Damit das auch einen App-Neustart
übersteht, müssen die Mutationen beim Wiederaufsetzen korrekt zugeordnet werden.

## Entscheidung

Pausierbare Mutationen müssen registriert sein, bevor `resumePausedMutations` aufgerufen
wird. Registrierungsreihenfolge und Mutations-Keys sind eine harte Invariante und werden
nicht verändert.

## Konsequenzen

- Offline erfasste Änderungen überleben einen App-Neustart und werden bei Reconnect
  korrekt hochgeladen.
- Änderungen an der Mutations-Registrierung sind heikel: Reihenfolge und Keys dürfen
  nicht angetastet werden, sonst bricht das Resume-Verhalten.
- Diese Invariante ist der sensibelste Punkt der Offline-Datenschicht.
