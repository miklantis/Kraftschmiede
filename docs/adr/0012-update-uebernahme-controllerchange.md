# ADR-0012 – Update-Übernahme über controllerchange statt festem Timeout

**Status:** akzeptiert
**Datum:** 2026-06-24

## Kontext

Beim Übernehmen einer neuen Version lädt die App neu, damit die neue Service-Worker-Hülle
greift. Ein anfänglich genutzter fester Timeout-Reload (1,2 s) konnte auf der
installierten PWA, vor allem iOS, zu früh zuschlagen: die Seite lud neu, bevor der neue
Service Worker aktiv war, der alte Stand kam zurück, und der Update-Hinweis erschien
erneut. Symptom: der Hinweis bleibt scheinbar stehen.

## Entscheidung

`applyUpdate` (`src/lib/pwaUpdate.ts`) lädt bei `controllerchange` neu – das zuverlässige
Signal, dass die neue Hülle die Kontrolle übernommen hat. Eine großzügige Frist (5 s)
dient nur noch als allerletzte Notreserve, falls das Signal ausbleibt. Mehrfach-Reload ist
über ein `applying`-Flag und `{ once: true }` abgesichert.

## Konsequenzen

- Die Übernahme greift erst, wenn die neue Hülle wirklich aktiv ist; kein Zurückfallen auf
  den alten Stand.
- Die Notbremse „App zurücksetzen" in den Einstellungen bleibt der Ausweg für einen echten
  Hänger.
- Eine Änderung dieser Mechanik greift jeweils erst ab der nächsten Übernahme, nicht für
  die laufende.
