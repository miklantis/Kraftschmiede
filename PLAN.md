# Kraftschmiede V2 – Plan & Fortschritt (Betrieb & Weiterentwicklung)

Diese Datei ist die verbindliche Schritt-Liste und die Quelle der Wahrheit fuer den
Projektstand.

**Zu Sitzungsbeginn immer zuerst diese Datei lesen**, den Abschnitt „Aktueller Stand"
pruefen und erst dann weiterarbeiten. Nach jedem umgesetzten Schritt die passenden
Kaestchen abhaken und „Aktueller Stand" fortschreiben – im selben Commit wie die Aenderung
oder als eigener kleiner Commit.

Konvention: `- [ ]` offen, `- [x]` erledigt. Modus pro Feature: **erst Konzept gemeinsam
besprechen, dann bauen, dann auf der Live-Seite testen.**

Die Migration V1->V2 und das erste Vorhaben (PWA: Offline-Huelle + Update-Hinweis) sind
abgeschlossen. Ab hier laufender Betrieb: regelmaessige Updates, Bugfixes und neue Features –
jedes neue Feature und jede nennenswerte Aenderung nach Konzept-vor-Code, in kleinen, einzeln
testbaren Schritten. Bei jeder Auslieferung die Version in `public/changelog.json`
fortschreiben (siehe „Aktueller Stand").

Inhaltliche Quellen:
- `docs/Architektur.md` – Datenbank-Schema, Architektur-Leitplanken, Ist-Zustand.
- `docs/adr/` – getroffene Architektur-Entscheidungen und Betriebs-Lernpunkte (je
  Entscheidung eine kleine Datei).
- `docs/Designsystem.md` – Ueberblick ueber die wiederverwendbaren UI-Bausteine und
  Design-Tokens. Bei neuen Primitives hier eine Zeile ergaenzen.
- `docs/Muskel-Map.md` – Konzept der generischen Muscle-Map-Komponente.
- `docs/archive/` – abgeschlossene Konzepte als Referenz (Offline-Huelle, Einheit
  bearbeiten) und das Log-Archiv (`PLAN-Log-Archiv.md`).

---

## Aktueller Stand

- **App im laufenden Betrieb.** Funktional vollstaendig, laeuft auf der normalisierten
  Datenbank und ist installierbar (Manifest/Icons/Vollbild).
- **PWA (Offline-Huelle + Update-Hinweis) abgeschlossen.** Alle vier Lieferungen umgesetzt:
  Offline-Huelle (Service Worker, Precache der App-Shell, Supabase ausgenommen),
  Update-Erkennung beim Start, „Was ist neu"-Popup aus `public/changelog.json`, Feinschliff
  (kein Hinweis waehrend einer laufenden Einheit, Notbremse „App zuruecksetzen" in den
  Einstellungen, „Aktualisieren"-Knopf im Popup fixiert). Details je
  Lieferung im Log unten. Konzept: `docs/archive/Konzept-PWA-Offline.md`.
- **Vorhaben „Einheit bearbeiten" abgeschlossen (Schritt 2 komplett).** Kraft- (1.2.12),
  Skill- (1.2.15) und Yoga-Einheiten (1.2.16) lassen sich im Verlauf nachtraeglich korrigieren
  ueber ein Bearbeiten-Panel im Live-Look (Live-Karten wiederverwendet), offline-fest
  zurueckgeschrieben. Coach zieht nur bei der juengsten Kraft-Einheit nach; Skill-Phase bleibt
  unberuehrt; Yoga bearbeitet Minuten + Notiz. Damit ist das Vorhaben „Verlauf: Satz-Darstellung
  & Bearbeiten" insgesamt fertig (siehe Abgeschlossene Vorhaben).
- **Kein offenes Bau-Vorhaben.** Pflege/Bugfixing laufend; neue Features nach Konzept-vor-Code.
  Aktuelle Version: 1.2.51.
  Bei jeder Auslieferung die Versionsnummer in `public/changelog.json` fortschreiben (letzte
  Stelle pro normaler Auslieferung hoch, mittlere bei groesseren Features) und einen kurzen
  Nutzer-Eintrag ergaenzen.
- **Konten per Einladung (Version 1.2.0) umgesetzt und im Dashboard scharfgeschaltet.** Neue
  Nutzer kommen ueber eine Supabase-Einladung dazu: Einladung im Dashboard verschicken,
  Eingeladener setzt ueber den Link aus der Mail sein Passwort und ist sofort angemeldet. Die
  offene Selbstregistrierung ist im Supabase-Dashboard abgeschaltet („Allow new users to sign
  up\" aus), Site URL und Redirect-Liste sind auf die Live-Adresse mit Marker `?einladung`
  gesetzt. Damit ist der unter 1.2.0 vermerkte offene Dashboard-Schritt erledigt – siehe Log
  2026-06-24.

---

## Offene Vorhaben

### Pflege / Bugfixing

Laufend, ergibt sich im Betrieb. Kein geplanter Block; einzelne Punkte werden hier
gefuehrt, sobald sie auftauchen.

- (noch keine offenen Punkte)

---

## Abgeschlossene Vorhaben

Ueberblick der fertigen Vorhaben; der chronologische Verlauf steht im Log unten.

- PWA – Offline-Huelle & Update-Hinweis (Lieferungen 1–4, ab Version 1.1.0).
  Konzept: `docs/archive/Konzept-PWA-Offline.md`.
- Verlauf – Satz-Darstellung & Einheit bearbeiten. Schritt 1 (satzweise Anzeige, ab 1.2.9)
  und Schritt 2 (Einheit bearbeiten: Kraft 1.2.12, Skill 1.2.15, Yoga 1.2.16). Bearbeiten-Panel
  im Live-Look (Karten wiederverwendet), offline-festes Zurueckschreiben, Coach nur bei der
  juengsten Kraft-Einheit, Skill-Phase unberuehrt. Konzept: `docs/archive/Konzept-Einheit-bearbeiten.md`.

- Journey-Kurve – „jetzt“ automatisch mittig (Version 1.2.19). Ist die Periodisierungskurve
  auf dem Handy seitlich scrollbar (lange Journey), gleitet sie beim Oeffnen sanft so, dass
  die aktuelle Woche zentriert ist; am Anfang/Ende so weit wie moeglich, manuelles Scrollen
  bleibt unangetastet. Eingebaut ins gemeinsame Chart-Fundament (`ChartCanvas`, neue Prop
  `focusFraction`), nutzbar auch fuer den geplanten Uebungs-Verlaufschart.

---

## Erledigt (Log)

Hier kommen abgeschlossene Bloecke mit Datum dazu.

2026-07-01 — Uebungsdetail: Coach und Kennzahlen in einem Block (Version 1.2.51).
Die separate Statistik-Reihe (StatRow) entfaellt; ihre Werte wandern als eine
zeilenweise Reihe in die Coach-Karte (geschaetztes 1RM -> Label „1RM“, bestes Set,
6-Wochen-1RM-Trend -> Label „in 6 Wo.“, Trend farbig akzentuiert). Block zeigt sich
jetzt auch ohne Coach-Status, solange Kennzahlen vorliegen. Rechte Spalte nur noch
Muskel-Figur + „Uebung anpassen“; die Figur rueckt nach oben. Geaendert:
routes/uebungen_.$exerciseId.tsx, hooks/useExerciseDetail.ts (Labels), changelog.json.
StatRow-Primitive bleibt erhalten, aktuell ungenutzt.

2026-06-30 — Doku aufgeraeumt (kein App-Code).
Migrationshistorie docs/archive/PLAN-Migration-V1-zu-V2.md geloescht (Backup existiert).
Masterplan-V2.md zu docs/Architektur.md entkernt: Schema, Architektur-Leitplanken,
Entscheidungen und Risiken bleiben; Migrations- und Phasenplan-Teile entfernt, V1-Vergleiche
geglaettet. Abgeschlossene Konzepte (PWA-Offline, Einheit-bearbeiten) nach docs/archive/
verschoben. README neu (ohne V1/Migrationssprech). Doku-Verweise in PLAN.md und
Designsystem.md auf die neue Struktur gezogen. Log-Eintraege bleiben historisch unveraendert.

2026-06-30 — Repo/Adresse umbenannt von Kraftschmiede-v2 auf Kraftschmiede (1.2.48).
V1 ist abgeloest: V1-Repo geloescht, V1-Supabase (Projekt Fitness, eu-north-1) pausiert,
Code-Backup als ZIP gesichert. base-Pfad in vite.config.ts und navigateFallback von
/Kraftschmiede-v2/ auf /Kraftschmiede/ umgestellt, Titel in index.html und Kommentar in
main.tsx angepasst, Supabase-URLs in dieser Datei nachgezogen. Interne Schema-/Cache-Marker
(CACHE_BUSTER, EXPORT_SCHEMA_VERSION v2) bewusst unberuehrt. Supabase Site-/Redirect-URL im
Dashboard muss separat auf die neue Adresse umgestellt werden.

- 2026-06-29 - Einstellungen-Layout: alle Bloecke halbbreit im Raster, Version 1.2.47:
  "Daten · Coaching" und der App-Version-Block wieder in den `columns-2`-Container gelegt, so
  dass am Desktop alle Bloecke halbbreit im selben Raster liegen und kein Block die volle Breite
  nimmt. Korrigiert die vorherige Richtung (1.2.46, voll-breite Reihen). Am Handy unveraendert
  (Stapel). Reine Layout-Korrektur, keine Logik beruehrt.

- 2026-06-29 - Einstellungen-Layout: App-Block an Coaching anschliessen, Version 1.2.46:
  "Daten · Coaching" und der App-Version-Block aus dem `columns-2`-Raster herausgenommen und
  als Reihen ueber die volle Breite darunter gesetzt. Ursache war das CSS-`columns`-Masonry:
  die rechte Rasterspalte war laenger, daher begann der voll-breite App-Block erst unterhalb
  und wirkte am Desktop eingerueckt. Jetzt schliesst der App-Block luckenlos an Coaching an.
  Am Handy unveraendert (Stapel). Reine Layout-Korrektur, keine Logik beruehrt.

- 2026-06-29 - Versionsverlauf als Unterseite, Version 1.2.45: Der App-Version-Block in den
  Einstellungen fuehrt jetzt auf eine eigenstaendige Vollseite (Route `einstellungen_.version`)
  statt das WhatsNewSheet-Popup zu oeffnen. Die Seite zeigt alle Versionen aus changelog.json
  (newest-first) mit ihren Aenderungen als schlichten Text ohne Karten/Hintergruende, oben ein
  BackLink zu den Einstellungen. Neue Ladefunktion `fetchChangelogVersions` (alle Versionen);
  `fetchLatestChangelog` baut darauf auf. WhatsNewSheet/useChangelog bleiben unberuehrt - sie
  treiben weiter den Update-Hinweis beim App-Start (UpdateBanner). Der App-Version-Block selbst
  bleibt optisch und in Position unveraendert (war bereits einspaltig ueber volle Breite).

---

Ältere Einträge (vor 1.2.45) stehen im Archiv: `docs/archive/PLAN-Log-Archiv.md`.
Der nutzerverständliche Verlauf je Version liegt in `public/changelog.json`, die
getroffenen Entscheidungen und Betriebs-Lernpunkte in `docs/adr/`.
