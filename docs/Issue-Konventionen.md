# Issue-Konventionen

Fortschritt und Planung laufen über GitHub Issues im Repo, nicht mehr über eine
`PLAN.md`. Diese Datei hält die Konventionen fest.

## Issue-Pflicht

Jede Änderung an der App bekommt ein Issue – ausnahmslos. Das gilt auch für
Einzeiler, Hotfixes, Textkorrekturen, Style-Anpassungen, Abhängigkeits-Updates
und alles, was der Nutzer nur beiläufig im Chat erwähnt. Kein Commit ohne
zugehöriges Issue. Wird beim Bauen zusätzlich etwas Ungeplantes geändert,
bekommt das ein eigenes Issue. Ausgenommen ist nur reine Doku- oder
Issue-Textpflege ohne Codeänderung.

## Planen und Umsetzen sind getrennt

Ein Issue anzulegen bedeutet nicht, es auch umzusetzen. Häufig wird nur geplant:
dann entstehen Issues, die offen liegen bleiben, ohne dass Code angefasst wird.
Gebaut wird erst auf ausdrückliche Ansage – und nur die Issues, die dabei
genannt werden. Ist unklar, ob nur geplant oder auch gebaut werden soll, vorher
fragen. Nach dem Anlegen kurz melden, welche Issues entstanden sind, und dort
aufhören.

Beim Umsetzen ist die Reihenfolge verbindlich: Issue anlegen (mit Labels) →
bauen → validieren → pushen → Kommentar mit Commit-Verweis → Issue schließen.
Wurde das Issue vor dem Push vergessen, wird es sofort nachträglich angelegt und
mit dem Commit verknüpft, bevor etwas anderes passiert.

Vor dem Anlegen kurz prüfen, ob zum Thema schon ein offenes Issue existiert –
dann dort weiterarbeiten statt ein Duplikat anzulegen.

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

Labels sind Pflicht: kein Issue ohne Ebenen-Label, kein Hauptvorhaben-Issue ohne
Art-Label. Passt keine der drei Arten, vor dem Anlegen kurz nachfragen statt zu
raten.

## Ablauf

1. Konzept-Gespräch im Chat (Konzept vor Code), nicht im Issue.
2. Nach Konsens: Hauptvorhaben-Issue anlegen, bei mehreren Schritten die
   Schritt-Issues als Sub-Issues.
3. Umsetzung startet erst auf ausdrückliche Ansage – die Issues können beliebig
   lange als reine Planung offen liegen bleiben.
4. Pro Schritt: bauen, validieren, pushen, Kommentar ins Schritt-Issue (kurz:
   was geändert wurde, Commit-Verweis, was live testbar ist), Schritt-Issue
   schließen.
5. Letzter Schritt fertig: zusammenfassender Kommentar im Hauptvorhaben-Issue,
   dann schließen.
6. Sitzungsbeginn: offene Issues aus dem Repo abrufen und kurz zusammenfassen,
   statt `PLAN.md` zu lesen.

## Historie vor der Umstellung

Der bisherige Verlauf (bis Version 1.10.1) steht weiterhin in
`docs/archive/PLAN-Log-Archiv-*.md` und in den Beschreibungen unter
„Abgeschlossene Vorhaben" der letzten `PLAN.md`-Fassung (siehe Git-Historie
dieser Datei vor ihrer Entfernung). Ab hier läuft die Planung ausschließlich
über Issues.
