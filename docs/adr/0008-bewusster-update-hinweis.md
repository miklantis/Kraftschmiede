# ADR-0008 – Bewusster Update-Hinweis statt stillem Auto-Update

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Als installierte PWA könnte die App neue Versionen still im Hintergrund übernehmen. Das
birgt das Risiko, dass sich Verhalten mitten in der Nutzung unerwartet ändert – gerade
während einer laufenden Trainings-Session unerwünscht.

## Entscheidung

Kein stilles Auto-Update. `vite-plugin-pwa` läuft mit `registerType: 'prompt'`. Neue
Versionen werden beim Start erkannt und über einen sichtbaren Hinweis angeboten
(Streifen oben auf der Trainingsseite plus „Was ist neu"-Popup), den der Nutzer bewusst
übernimmt. Die Registrierung erfolgt manuell über `src/lib/pwaUpdate.ts`, das UI-Signal
über `useAppUpdate`.

## Konsequenzen

- Updates greifen nur, wenn der Nutzer sie aktiv übernimmt; kein überraschender Wechsel
  mitten im Training.
- Die Update-Erkennung braucht einen Kaltstart mit neuer Service-Worker-Hülle; es gibt
  kein Hintergrund-Polling.
- `public/changelog.json` liegt bewusst nicht im Precache und wird beim Öffnen des
  Popups frisch geholt, damit der Changelog immer aktuell ist.
- Die Notbremse „App zurücksetzen" leert Service Worker und Cache Storage, ohne die
  Daten anzutasten.
