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
- `docs/Masterplan-V2.md` – Gesamtkonzept (Schema, Architektur).
- `docs/Designsystem.md` – Ueberblick ueber die wiederverwendbaren UI-Bausteine und
  Design-Tokens. Bei neuen Primitives hier eine Zeile ergaenzen.
- `docs/Konzept-PWA-Offline.md` – Konzept des umgesetzten Offline-/Update-Vorhabens
  (abgeschlossen; als Referenz erhalten).
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
  Einstellungen, „Aktualisieren"-Knopf im Popup fixiert). Aktuelle Version 1.2.2. Details je
  Lieferung im Log unten. Konzept: `docs/Konzept-PWA-Offline.md`.
- **Naechster Schritt:** kein festgelegtes Vorhaben. Pflege/Bugfixing laufend; neue Features
  nach Konzept-vor-Code. Bei jeder Auslieferung die Versionsnummer in
  `public/changelog.json` fortschreiben (letzte Stelle pro normaler Auslieferung hoch,
  mittlere bei groesseren Features) und einen kurzen Nutzer-Eintrag ergaenzen. Aktuelle
  Version 1.2.4.
- **Konten per Einladung (Version 1.2.0) umgesetzt.** Neue Nutzer kommen ueber eine
  Supabase-Einladung dazu: Einladung im Dashboard verschicken, Eingeladener setzt ueber den
  Link aus der Mail sein Passwort und ist sofort angemeldet. Offene Selbstregistrierung
  bleibt aus. **Offen (Dashboard, nur durch Nutzer):** in Supabase „Allow new users to sign
  up\" ausschalten und Redirect-URL auf die Live-Adresse mit Marker `?einladung` setzen –
  siehe Eintrag im Log.

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
  Konzept: `docs/Konzept-PWA-Offline.md`.

---

## Erledigt (Log)

Hier kommen abgeschlossene Bloecke mit Datum dazu.

- 2026-06-24 - „Bildschirm wachhalten\" erklaert, Version 1.2.4: Das Setting war als
  blosses Label unklar (gilt es fuer die App oder nur fuers Training?). `SettingRow`
  (`src/components/ui/setting-list.tsx`) um einen optionalen `description`-Untertext
  erweitert (kleine graue Zeile unter dem Label) und beim Wachhalten-Schalter in
  `TimerSettings.tsx` genutzt: „Bildschirm bleibt nur waehrend einer laufenden Einheit an.\"
  Der Untertext ist allgemein wiederverwendbar fuer andere Settings. Validiert: tsc ohne
  Fehler, Build durch, 297 Tests gruen. Betroffen ausserdem `public/changelog.json`.

- 2026-06-24 - Erklaertext auf der Skills-Seite, Version 1.2.3: Neue Primitive `Prose`
  (`src/components/ui/prose.tsx`) fuer ruhigen Lauftext direkt auf dem Hintergrund (ohne
  Karte/Rahmen) - der Stil, den die Uebungs-Beschreibung schon hatte. Auf der Skills-Seite
  (`src/routes/skills.tsx`) oben unter dem Kopf ein kurzer Text „Was ist eine Skill?\";
  die Uebungs-Beschreibung (`src/routes/uebungen_.$exerciseId.tsx`) auf dieselbe Primitive
  umgestellt (Optik unveraendert). Designsystem-Inventar um eine Zeile ergaenzt. Validiert:
  tsc ohne Fehler, Build durch, 297 Tests gruen. Betroffen ausserdem
  `public/changelog.json`.

- 2026-06-24 - Journey-Block luftiger, Version 1.2.2: Das vertikale Padding des
  `JourneyStrip` oben auf der Trainingsseite war mit `py-3` (mobil) / `py-4` (Desktop) zu
  knapp; jetzt `py-[14px]` / `py-[18px]`. Horizontales Padding und alles andere unveraendert.
  changelog.json um Eintrag 1.2.2 ergaenzt. Validiert: tsc ohne Fehler, Build durch,
  297 Tests gruen. Betroffen: `src/components/training/JourneyStrip.tsx`,
  `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Update-Streifen umgestylt, Version 1.2.1: Der Hinweis „Neue Version
  verfuegbar" oben auf der Trainingsseite war eine weisse Karte mit Schatten; jetzt traegt
  er den Klar-Look des „Bereit fuers Training"-Banners auf der Koerper-Seite – hellgruene
  Flaeche (`bg-primary/10`), gruener Rahmen (`border-primary/25`), gruener Titel. Icon
  (Kreispfeil im gruenen Kaestchen) und Pfeil rechts als Tipp-Hinweis bleiben auf Wunsch
  erhalten; Groessen und Abstaende unveraendert. Nur die Optik der `UpdateBanner`-Karte
  geaendert, Logik (kein Hinweis waehrend laufender Einheit, „Was ist neu"-Popup) unberuehrt.
  changelog.json um Eintrag 1.2.1 ergaenzt. Validiert: tsc ohne Fehler, Build durch,
  297 Tests gruen. Betroffen: `src/components/training/UpdateBanner.tsx`,
  `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Konten per Einladung, Version 1.2.0: Neue Nutzer koennen jetzt per
  Supabase-Einladung dazukommen, ohne dass die offene Selbstregistrierung aufgeht. Ablauf:
  Einlader verschickt die Einladung im Supabase-Dashboard (Authentication -> Users ->
  Invite user); der Eingeladene oeffnet den Link aus der Mail, landet auf dem neuen
  Einladungs-Screen „Passwort festlegen\" (E-Mail steht fest, nur Anzeige = E-Mail-Check),
  vergibt sein Passwort zweimal und ist sofort angemeldet. Erkennung im AuthGate statt als
  Router-Route, weil der AuthGate vor dem Router sitzt und die Einladungs-Sitzung sonst nie
  ankaeme. Komponentenschnitt: gemeinsamer Karten-Rahmen `src/components/auth/AuthCard.tsx`
  (Lockup + weisse Karte), den `LoginScreen` und der neue `InviteScreen` teilen; Layout nur
  an einer Stelle. `src/lib/auth.tsx` um `invitePending`/`inviteEmail`, Einladungs-Erkennung
  im URL (`?einladung` bzw. `type=invite` in Hash/Query) und `setPassword` (via
  `updateUser`) erweitert. Validiert: tsc ohne Fehler, Build durch, 297 Tests gruen.
  Betroffen: neue Dateien `src/components/auth/AuthCard.tsx`,
  `src/components/InviteScreen.tsx`, dazu `src/lib/auth.tsx`,
  `src/components/LoginScreen.tsx`, `src/components/AuthGate.tsx`, `public/changelog.json`,
  `docs/Designsystem.md`, `PLAN.md`. OFFEN (nur im Supabase-Dashboard durch den Nutzer):
  „Allow new users to sign up\" ausschalten; Site-/Redirect-URL auf die Live-Adresse mit
  Marker `?einladung` setzen, damit der Einladungslink in der App als Einladung erkannt wird.

- 2026-06-24 - Mehr Abstand am Seitenende, Version 1.1.5: Auf Mobile klebte das letzte
  UI-Element beim Scrollen ganz nach unten zu dicht an der fixierten Bottom-Nav - deren
  Hoehe (Icons + Padding + Safe-Area des iPhones) frass den bisherigen Innenabstand
  (`pb-28`) fast auf. Zentral im Seitengeruest `src/components/shell/AppShell.tsx` den
  mobilen unteren Abstand des `main` auf `pb-40` erhoeht (Desktop `pb-[72px]` unveraendert,
  dort gibt es keine Bottom-Nav). Wirkt auf alle Mobile-Seiten gleichzeitig; Seiten mit
  Karten-Eigenabstand (z. B. Uebungen) bekommen dadurch nur etwas mehr Luft. changelog.json
  um Eintrag 1.1.5 ergaenzt. Validiert: tsc ohne Fehler, Build durch, 297 Tests gruen.
  Betroffen: `src/components/shell/AppShell.tsx`, `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - App-Version-Block ans Seitenende, Version 1.1.4: Reine Umsortierung in
  `src/routes/einstellungen.tsx` - der `AppVersionCard`-Block steht jetzt ganz unten (nach
  dem zweispaltigen Raster, volle Breite), statt direkt nach dem Konto-Block; entspricht der
  ueblichen Platzierung am Seitenende. Funktion und Komponente unveraendert. changelog.json
  um Eintrag 1.1.4 ergaenzt. Validiert: tsc ohne Fehler, Build durch, 297 Tests gruen.
  Betroffen: `src/routes/einstellungen.tsx`, `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - App-Version in den Einstellungen, Version 1.1.3: Direkt nach dem Konto-Block
  steht jetzt ein eigener Block „App-Version\" mit Version + Datum. Quelle ist
  `public/changelog.json` (dieselbe Datei wie „Was ist neu\", keine zweite Pflegestelle).
  Antippen oeffnet das „Was ist neu\"-Popup; der „Aktualisieren\"-Knopf darin erscheint nur,
  wenn gerade eine neue Huelle wartet, sonst reine Info. Komponentenschnitt: das Popup wurde
  aus `UpdateBanner` in einen wiederverwendbaren Baustein
  `src/components/training/WhatsNewSheet.tsx` herausgezogen (Props `open`, `onClose`,
  `showApply`, `onApply`); `UpdateBanner` nutzt ihn jetzt (Knopf an), die neue Karte
  `src/components/settings/AppVersionCard.tsx` ebenfalls (Knopf nur bei wartendem Update).
  Die Karte laedt die Version ueber eine eigene gecachte Query (`fetchLatestChangelog`),
  damit die Version dauerhaft sichtbar ist (nicht erst beim Oeffnen). Eingehaengt in
  `src/routes/einstellungen.tsx`. changelog.json um Eintrag 1.1.3 ergaenzt. Validiert: tsc
  ohne Fehler, Build durch, 297 Tests gruen. Betroffen: neue Dateien `WhatsNewSheet.tsx`,
  `AppVersionCard.tsx`, dazu `src/components/training/UpdateBanner.tsx`,
  `src/routes/einstellungen.tsx`, `public/changelog.json`, `docs/Designsystem.md`, `PLAN.md`.

- 2026-06-24 - Bugfix „Was ist neu\"-Popup, Version 1.1.2: Der „Aktualisieren\"-Knopf sass auf
  dem Handy zu dicht am unteren Rand (das Popup ist reiner Text, da wirkte der knappe
  Standardabstand des `Overlay` gedraengt). Loesung lokal in
  `src/components/training/UpdateBanner.tsx`: der Knopf liegt jetzt in einem Wrapper mit
  zusaetzlichem Abstand nach unten (`pb-3.5`, Desktop `pb-2`); das gemeinsame `Overlay`-
  Primitive bleibt unberuehrt, andere Dialoge aendern sich nicht. changelog.json um Eintrag
  1.1.2 ergaenzt. Validiert: tsc ohne Fehler, Build durch, 297 Tests gruen. Betroffen:
  `src/components/training/UpdateBanner.tsx`, `public/changelog.json`, `PLAN.md`.

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
