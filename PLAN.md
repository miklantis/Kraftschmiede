# Kraftschmiede V2 – Plan & Fortschritt (Betrieb & Weiterentwicklung)

Diese Datei ist die verbindliche Schritt-Liste und die Quelle der Wahrheit fuer den
Projektstand.

**Zu Sitzungsbeginn immer zuerst diese Datei lesen**, den Abschnitt „Aktueller Stand"
pruefen und erst dann weiterarbeiten. Nach jedem umgesetzten Schritt die passenden
Kaestchen abhaken und „Aktueller Stand" fortschreiben – im selben Commit wie die Aenderung
oder als eigener kleiner Commit.

Konvention: `- [ ]` offen, `- [x]` erledigt. Modus pro Feature: **erst Konzept gemeinsam
besprechen, dann bauen, dann auf der Live-Seite testen.**

Inhaltliche Quellen:
- `docs/Masterplan-V2.md` – Gesamtkonzept (Schema, Architektur).
- `docs/Designsystem.md` – Ueberblick ueber die wiederverwendbaren UI-Bausteine und
  Design-Tokens. Bei neuen Primitives hier eine Zeile ergaenzen.
- `docs/Konzept-PWA-Offline.md` – Konzept fuer das naechste Vorhaben (Offline-Huelle +
  Update-Hinweis).
- `docs/archive/PLAN-Migration-V1-zu-V2.md` – kompletter Migrationsverlauf V1->V2 (Historie,
  abgeschlossen). Bei Bedarf zum Nachschlagen, sonst nicht mehr aktiv gepflegt.

Referenz-App (nur lesen, niemals aendern): https://github.com/miklantis/Kraftschmiede
V1 ist abgeloest und laeuft nicht mehr produktiv. Das Repo bleibt als read-only Referenz,
vor allem um bei Bedarf Engine-/Coach-Logik nachzuschlagen, falls in V2 im Betrieb etwas
nicht rund laeuft.

---

## Aktueller Stand

- **Migration V1->V2 abgeschlossen.** V2 ist funktional und optisch auf V1-Paritaet, laeuft
  auf der normalisierten Datenbank und ist installierbar (Manifest/Icons/Vollbild). V2 ist
  die aktive App. Verlauf siehe `docs/archive/PLAN-Migration-V1-zu-V2.md`.
- **PWA (Offline-Huelle + Update-Hinweis) abgeschlossen.** Alle vier Lieferungen umgesetzt:
  Offline-Huelle (Service Worker, Precache der App-Shell, Supabase ausgenommen),
  Update-Erkennung beim Start, „Was ist neu"-Popup aus `public/changelog.json`, Feinschliff
  (kein Hinweis waehrend einer laufenden Einheit, Notbremse „App zuruecksetzen" in den
  Einstellungen, „Aktualisieren"-Knopf im Popup fixiert). Aktuelle Version 1.1.1. Details je
  Lieferung im Log unten. Konzept: `docs/Konzept-PWA-Offline.md`.
- **Naechster Schritt:** kein festgelegtes Vorhaben. Pflege/Bugfixing laufend; neue Features
  nach Konzept-vor-Code. Bei jeder Auslieferung die Versionsnummer in
  `public/changelog.json` fortschreiben (letzte Stelle pro normaler Auslieferung hoch,
  mittlere bei groesseren Features) und einen kurzen Nutzer-Eintrag ergaenzen.

---

## Offene Vorhaben

### PWA – Offline-Huelle & Update-Hinweis

Abgeschlossen (Lieferungen 1–4). Konzept: `docs/Konzept-PWA-Offline.md`. Verlauf je Lieferung
im Log unten.

- [x] Lieferung 1: Offline-Huelle (Service Worker, Precache der App-Shell, Supabase
  ausgenommen)
- [x] Lieferung 2: Update-Erkennung + Hinweis („Neue Version" + „Aktualisieren")
- [x] Lieferung 3: „Was ist neu" (Changelog-Datei + Anzeige im Hinweis)
- [x] Lieferung 4: Feinschliff (Optik, „nicht waehrend einer Einheit", Notbremse)

### Pflege / Bugfixing

Laufend, ergibt sich im Betrieb. Kein geplanter Block; einzelne Punkte werden hier
gefuehrt, sobald sie auftauchen.

- (noch keine offenen Punkte)

---

## Erledigt (Log)

Hier kommen abgeschlossene Bloecke mit Datum dazu.

- 2026-06-24 - PWA Lieferung 4 (Feinschliff), Version 1.1.1: (1) Der Update-Hinweis erscheint
  nicht mehr waehrend einer laufenden Einheit - `UpdateBanner` blendet sich aus, wenn
  `useLiveSession().session != null`. (2) Notbremse „App zuruecksetzen" in den Einstellungen
  unter „Daten · Sicherung" (neue Komponente `src/components/settings/AppReset.tsx`): leert
  Service Worker + Cache Storage und laedt frisch; ruft `resetServiceWorker()` in
  `src/lib/pwaUpdate.ts`. Beruehrt NICHT die Nutzerdaten (IndexedDB/TanStack). (3) Im Popup
  scrollt die Aenderungsliste intern (max-h), der „Aktualisieren"-Knopf bleibt sichtbar.
  changelog.json um Eintrag 1.1.1 ergaenzt (Nutzer-Stichpunkte zu 1 und 2). Konzept Abschnitt
  8: Nach-Update-Bestaetigung als getroffen (weggelassen) gefuehrt; damit ist das
  PWA-Vorhaben komplett. Validiert: tsc ohne Fehler, Build durch (SW erzeugt, changelog.json
  nicht precached), 297 Tests gruen. Betroffen: `src/lib/pwaUpdate.ts`,
  `src/components/training/UpdateBanner.tsx`, `src/components/settings/AppReset.tsx`,
  `src/routes/einstellungen.tsx`, `public/changelog.json`, `docs/Konzept-PWA-Offline.md`.

- 2026-06-24 - PWA Lieferung 3 („Was ist neu"): Der Hinweis-Streifen ist jetzt antippbar und
  oeffnet ein Popup auf dem `Overlay`-Primitive - Versionskennung im Kopf (z. B. „Version
  1.1.0 · 24. Juni 2026"), Aenderungsliste als Stichpunkte, „Aktualisieren" unten; der Knopf
  ist damit vom Streifen ins Popup gewandert. Neue Bausteine: `public/changelog.json`
  (Seed-Eintrag 1.1.0), Zod-Schema `src/schemas/changelog.ts` (im Barrel ergaenzt),
  Fetch-Helfer `src/lib/changelog.ts` (frisch aus dem Netz, cache no-store), Hook
  `src/hooks/useChangelog.ts` (laedt erst beim Oeffnen, gcTime 0 = nicht im Offline-Cache).
  `UpdateBanner` entsprechend umgebaut. Datei ist bewusst nicht im Precache (kein json-Glob),
  Build verifiziert (0 Treffer in sw.js). Versionsschema startet bei 1.1.0. Konzept Abschnitt
  8: Changelog-Format als getroffen gefuehrt; offen bleibt nur die Nach-Update-Bestaetigung
  (Lieferung 4). Validiert: tsc ohne Fehler, Build durch (SW erzeugt, changelog.json nicht
  precached), 297 Tests gruen. Betroffen: neue Dateien wie oben, `src/schemas/index.ts`,
  `src/components/training/UpdateBanner.tsx`, `docs/Konzept-PWA-Offline.md`.

- 2026-06-24 - PWA Lieferung 2 (Update-Erkennung + Hinweis): Beim App-Start registriert die
  App den Service Worker (Umstellung von `injectRegister: 'auto'` auf manuelle
  Registrierung) und erkennt eine wartende neue Huelle. Neue Bausteine: `src/lib/pwaUpdate.ts`
  (Registrierung + „neue Version wartet"-Signal als kleiner externer Store, DOM-frei, keine
  periodische Pruefung), Hook `src/hooks/useAppUpdate.ts` (liefert das Signal per
  `useSyncExternalStore` an die UI), darstellender Streifen
  `src/components/training/UpdateBanner.tsx` (Klar-Look wie JourneyStrip, „Neue Version
  verfuegbar" + Knopf „Aktualisieren"). Eingesetzt oben auf der Trainingsseite
  (`src/routes/index.tsx`), ueber Journey und Empfehlung; rendert nichts, solange kein Update
  wartet. „Aktualisieren" aktiviert die neue Huelle und laedt einmal neu. Entscheidung
  Pruef-Intervall (nur beim Start) ins Konzept Abschnitt 8 als getroffen uebernommen. Das
  Popup mit „Was ist neu" folgt in Lieferung 3; der Knopf wandert dann ins Popup. Validiert:
  tsc ohne Fehler, Build durch (SW weiter erzeugt, registerSW.js nicht mehr injiziert), 297
  Tests gruen. Betroffen: `vite.config.ts`, `src/vite-env.d.ts`, `src/main.tsx`,
  `src/routes/index.tsx`, neue Dateien wie oben, `docs/Konzept-PWA-Offline.md`.

- 2026-06-24 - PWA Lieferung 1 (Offline-Huelle): `vite-plugin-pwa` (Workbox) eingezogen und
  in `vite.config.ts` eingehaengt. Der beim Build erzeugte Service Worker vorcacht die
  App-Shell (index.html, JS-/CSS-Buendel, Icons, gebuendelte Schriften; 41 Eintraege,
  ~1 MB). `registerType: 'prompt'` (kein stilles Auto-Update, Update-UI folgt in Lieferung
  2), `injectRegister: 'auto'` (Registrierung automatisch in index.html), `manifest: false`
  (bestehendes `site.webmanifest` unberuehrt), `navigateFallback` auf die index.html unter
  der base fuer Deep-Links offline (koexistiert mit dem `dist/404.html`-Fallback des
  Deploys). Bewusst KEINE runtimeCaching-Regel: Supabase bleibt network-only, die
  Datenlogik allein bei der TanStack-Schicht. Validiert: tsc ohne Fehler, Build durch (SW
  erzeugt), 297 Tests gruen. Betroffen: `vite.config.ts`, `package.json`,
  `package-lock.json`. Deploy-Workflow unveraendert.

- 2026-06-24 - PWA-Konzept-Entscheidungen geklaert und in `docs/Konzept-PWA-Offline.md`
  eingepflegt: Update-Hinweis als Streifen oben auf der Trainingsseite, der ein Popup auf dem
  bestehenden `Overlay`-Primitive oeffnet (Desktop zentriert, Mobile Bodenblatt) mit
  scrollbarer „Was ist neu"-Liste und „Aktualisieren"-Knopf unten; Schliessen ueber
  X/Wegtippen, kein „Spaeter"-Knopf. Versionskennung im Schema `1.0.20` plus Datum, Vergabe
  durch den Coach. Abschnitt 8 von „offen" auf „getroffen + Restoffenes" umgestellt. Reine
  Doku, kein Code geaendert.

- 2026-06-24 - Designsystem-Dokument angelegt (`docs/Designsystem.md`): menschenlesbarer
  Ueberblick ueber die 25 UI-Primitives (wofuer/wann nehmen), Design-Tokens (Farben,
  Radien, Schatten) und die Feature-Ordner. Verweis im README und in den Quellen oben
  ergaenzt. Reine Doku, kein Code geaendert. Pflegeregel: bei neuen Primitives eine Zeile.
- 2026-06-24 - Einstellungen, Daten-Bereich neu gegliedert: aus dem losen Block „Daten"
  zwei Karten im Klar-Look gemacht - „Daten · Sicherung" (Export + Wiederherstellen) und
  „Daten · Coaching". Funktion unveraendert.
- 2026-06-24 - Loginscreen an den „Klar"-Look angepasst: Marken-Lockup (BrandMark im
  gruenen Kaestchen plus versaler Schriftzug) ueber weisser Karte auf der Canvas.
  Registrieren-Pfad entfernt (App nutzt ein bestehendes Konto, kein „Konto anlegen").
- 2026-06-24 - Neues Projekt „Betrieb & Weiterentwicklung" aufgesetzt. Migrationsverlauf
  nach `docs/archive/PLAN-Migration-V1-zu-V2.md` ausgelagert, schlanke neue PLAN.md
  gestartet. Migration V1->V2 gilt als abgeschlossen; aktueller Fokus ist die PWA.
