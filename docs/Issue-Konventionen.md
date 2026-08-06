# Issue-Konventionen

Fortschritt und Planung laufen über GitHub Issues im Repo, nicht mehr über eine
`PLAN.md`. Diese Datei hält die Konventionen fest.

## Struktur

Jedes Vorhaben (Feature, Bugfix, Pflegepunkt) ist ein **Hauptvorhaben-Issue**:
kurze Beschreibung/Ziel, Link zum Konzept-Dokument in `docs/` falls vorhanden.

Hat ein Vorhaben mehrere Lieferungen, bekommt jeder Schritt ein eigenes
**Schritt-Issue** als natives Sub-Issue des Hauptvorhabens (GitHub-Eltern-Kind-
Verknüpfung, keine Textverweise). Das Hauptvorhaben-Issue zeigt dadurch
automatisch den Fortschritt („x von y Schritten erledigt"). Bei mehrstufigen
Vorhaben werden die absehbaren Schritt-Issues gleich nach dem Konzept-Gespräch
alle angelegt, bleiben aber änderbar, wenn sich der Zuschnitt beim Bauen
verschiebt.

Kleine, einstufige Bugfixes/Pflegepunkte bekommen kein Sub-Issue, sondern nur
das Hauptvorhaben-Issue direkt.

## Status

Offen = laufend/geplant, geschlossen = abgeschlossen. Kein separates
Status-Label nötig.

## Labels

- Ebene: `vorhaben` (Hauptvorhaben-Issue) / `schritt` (Sub-Issue)
- Art, nur am Hauptvorhaben-Issue: `typ:feature`, `typ:bugfix`, `typ:pflege`

## Ablauf

1. Konzept-Gespräch im Chat (Konzept vor Code), nicht im Issue.
2. Nach Konsens: Hauptvorhaben-Issue anlegen, bei mehreren Schritten die
   Schritt-Issues als Sub-Issues.
3. Pro Schritt: bauen, validieren, pushen, Kommentar ins Schritt-Issue (kurz:
   was geändert wurde, Commit-Verweis, was live testbar ist), Schritt-Issue
   schließen.
4. Letzter Schritt fertig: zusammenfassender Kommentar im Hauptvorhaben-Issue,
   dann schließen.
5. Sitzungsbeginn: offene Issues aus dem Repo abrufen und kurz zusammenfassen,
   statt `PLAN.md` zu lesen.

## Historie vor der Umstellung

Der bisherige Verlauf (bis Version 1.10.1) steht weiterhin in
`docs/archive/PLAN-Log-Archiv-*.md` und in den Beschreibungen unter
„Abgeschlossene Vorhaben" der letzten `PLAN.md`-Fassung (siehe Git-Historie
dieser Datei vor ihrer Entfernung). Ab hier läuft die Planung ausschließlich
über Issues.
