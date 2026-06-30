# ADR-0013 – Deploy-Concurrency mit cancel-in-progress

**Status:** akzeptiert
**Datum:** 2026-06-24

## Kontext

Der Deploy auf GitHub Pages läuft automatisch beim Push auf `main`. Bei vielen dichten
Pushes hintereinander stauten sich die Deploys (`cancel-in-progress: false`), und der
reine Veröffentlichungs-Schritt (`actions/deploy-pages`) scheiterte transient. Folge: die
Live-Version blieb hinter dem Code zurück, obwohl der Build grün war.

## Entscheidung

In `.github/workflows/deploy.yml` gilt `cancel-in-progress: true`. Ein neuer Push bricht
einen überholten, noch laufenden Deploy ab, statt ihn zu stapeln.

## Konsequenzen

- Bei schnellen aufeinanderfolgenden Pushes wird immer der jeweils neueste Stand
  veröffentlicht; ältere laufende Deploys werden abgebrochen.
- Ein Redeploy von identischem `dist` erzeugt keinen neuen Service Worker und damit keinen
  Update-Hinweis.
