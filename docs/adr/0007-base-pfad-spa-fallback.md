# ADR-0007 – base-Pfad und SPA-Fallback für GitHub Pages

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Die App wird auf GitHub Pages unter einem Unterpfad ausgeliefert
(`https://miklantis.github.io/Kraftschmiede/`), nicht auf einer eigenen Domain im
Wurzelpfad. Eine Single-Page-App mit clientseitigem Routing braucht zudem einen
Fallback, damit tiefe Links beim direkten Aufruf nicht ins Leere laufen.

## Entscheidung

Der Vite-`base` ist `/Kraftschmiede/` und hängt an `import.meta.env.BASE_URL`. Der
SPA-Fallback läuft über eine Kopie der `dist/404.html` im Deploy-Workflow.

## Konsequenzen

- Alle Asset- und Routenpfade müssen den base-Pfad berücksichtigen; Pfade nie hart auf
  die Wurzel setzen.
- Direkt aufgerufene tiefe Links werden über die 404-Kopie korrekt an die App
  übergeben.
- Der Deploy-Workflow muss die 404-Kopie weiterhin erzeugen.
