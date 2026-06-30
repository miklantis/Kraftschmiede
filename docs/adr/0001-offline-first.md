# ADR-0001 – Offline-first mit Sync

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Im Gym wird ohne verlässliches Netz trainiert und aufgezeichnet. Eine reine
Online-App wäre dort unbrauchbar: Sätze müssen auch ohne Verbindung erfasst werden
können, ohne Datenverlust.

## Entscheidung

Offline-first mit Sync. Lokale Persistenz über IndexedDB und einen persistenten
TanStack-Query-Cache, dazu eine Mutations-Queue, die bei wiederhergestellter
Verbindung nachträglich hochlädt.

Pragmatischer Zuschnitt: Die Live-Session läuft voll offline, weil dort aufgezeichnet
wird. Für den Rest der App genügt ein offline lesbarer Cache.

## Konsequenzen

- Die Live-Session funktioniert ohne Netz vollständig; offline eingetragene Änderungen
  werden bei Reconnect nachgereicht.
- Dies ist der größte einzelne Aufwandstreiber des Projekts.
- Die Offline-Datenschicht (TanStack-Persistenz) und die Offline-Hülle (Service Worker)
  sind getrennte Mechanismen, die sich nicht in die Quere kommen dürfen. Supabase wird
  bewusst nicht vom Service Worker gecacht.
- Die harte Anforderung an die Mutationsreihenfolge ergibt sich hieraus, siehe ADR-0009.
