# Kraftschmiede V2 – Plan & Fortschritt

Diese Datei ist die verbindliche Schritt-Liste fuer den Neubau von Kraftschmiede als
React/TypeScript-Web-App. Sie ist die Quelle der Wahrheit fuer den Projektstand.

**Zu Sitzungsbeginn immer zuerst diese Datei lesen**, den Abschnitt „Aktueller Stand"
pruefen und erst dann weiterarbeiten. Nach jedem umgesetzten Schritt die passenden
Kaestchen abhaken und „Aktueller Stand" aktualisieren – im selben Commit wie die
Aenderung oder als eigener kleiner Commit.

Konvention: `- [ ]` offen, `- [x]` erledigt. Modus pro Feature-Block: **erst Konzept
gemeinsam besprechen, dann bauen, dann auf der Live-Seite testen.**

Referenz-App (nur lesen, niemals aendern): https://github.com/miklantis/Kraftschmiede

---

## Aktueller Stand

- **Phase:** Phase 1 (V1-Look) und Navigations-Feinschliff abgeschlossen (2026-06-22). Die
  Shell folgt jetzt durchgehend dem V1-"Klar"-Look. Als Naechstes Phase 3 (Training).
- **Erledigt:** Phase 0 abgeschlossen (Fundament, Schema/RLS, Engine, Zod-Schemas, UI-Fundament,
  Offline-Grundgeruest, Live-Deploy). Schlichter Login als Voraussetzung fuer alle
  Schreibzugriffe (E-Mail/Passwort ueber Supabase Auth, AuthProvider + useAuth, AuthGate vor
  dem Router, Input-Primitive; Startseite zeigt angemeldete E-Mail und Abmelden). Definitionen-
  Seed: 7 Journey-Vorlagen (+ Phasen) und 2 Skill-Progressionen als Code, idempotenter Runner
  legt sie beim ersten Start mit user_id an. Datenstand-Anzeige auf der Startseite. V1-Import:
  uebersetzt den kompletten V1-Blob (camelCase) in die 23 normalisierten Tabellen (snake_case)
  und schluesselt jede Text-ID auf eine neue, client-seitig vergebene UUID um, in Fremd-
  schluessel-sicherer Reihenfolge; der Skill-Fortschritt haengt sich ueber den Skill-Schluessel
  an die geseedeten Skills. Knopf auf der Startseite: Datei waehlen, Vorschau (Zeilenzahl je
  Block) pruefen, bestaetigen; gesperrt, sobald schon Uebungen/Einheiten vorhanden sind.
  Phase 1 - Design-System: Token-Set (warmes Stone-Grau, weisser Hintergrund, Radius 10px,
  Charts, hell+dunkel) als Basis; Akzent = Markengruen #0c9d77; Nebenakzente Intensitaet/Teal,
  Skill/Blau, Yoga/Lila plus Ampel (gut/Warnung/Abweichung/Gefahr) als eigene Tokens; Schrift
  Inter (UI) + Spline Sans Mono (Zahlen) selbst gehostet (offline-fest); Dunkelmodus
  umschaltbar (hell/dunkel/system, gemerkt) ueber ThemeProvider + ThemeToggle.
  Phase 2 - Navigation/Shell: durchgaengige AppShell um alle Seiten (im __root). Eine
  gemeinsame Nav-Definition (src/lib/nav.ts) speist Sidebar (Desktop ab 960px, fix links,
  264px) und Bottom-Nav (Mobile darunter, sechs Punkte, nur Icons - Label als aria-label);
  Aktiv-Zustand ueber die Link-activeProps des Routers. Einstellungen separat ueber das Konto-
  Symbol (Sidebar-Fuss bzw. Mobile-Kopf), nicht in der Leiste - wie V1. Theme-Umschalter sitzt
  vorerst nur in den Einstellungen (aus Sidebar-Fuss und Mobile-Kopf wieder entfernt). Sieben
  Routen als deutsche Slugs: / = Training, /journey, /verlauf, /uebungen, /koerper, /skills,
  /einstellungen; die sechs Seiten vorerst schlanke Platzhalter (PagePlaceholder), echter
  Inhalt ab Phase 3. Der provisorische Startseiten-Inhalt (Konto/Abmelden, Verbindungs-
  Diagnose, Datenstand, V1-Import) ist nach /einstellungen umgezogen.
- **Entscheidung (Design, 2026-06-22 revidiert):** Globaler Look wird moeglichst 1:1 aus
  dem V1-"Klar"-Theme uebernommen statt eigener Luma-Interpretation. Heisst konkret:
  V1-Tokens (warmweisser Canvas `--bg #edeef1`, weisse Karten `--panel`, Akzent #0c9d77),
  V1-Radien (Karten 16px, Bedienelemente 11px, Pillen 20px), V1-Schatten (weich, kein
  harter Rahmen), Schrift System-UI fuer die Oberflaeche (Inter raus) und Spline Sans Mono
  fuer Zahlen. Die in der ersten Runde gebaute Luma-Geometrie (32px-Karten, Inter,
  Luma-Elevation) wird zurueckgedreht. shadcn/ui bleibt als Komponenten-Fundament
  (Mechanik/Barrierefreiheit), nur die Optik wird auf V1 gelegt. Dunkelmodus bleibt
  umschaltbar. Quelle der Wahrheit: V1-Dateien klar-tokens.css und klar-app.css (nur lesen).
- **Entscheidung (Phase 2):** Navigation 1:1 wie V1 - sechs Hauptpunkte (Training, Journey,
  Verlauf, Uebungen, Koerper, Skills), Einstellungen separat ueber das Konto-Symbol; Yoga
  bleibt kein eigener Punkt (spaeter Karte im Training). Umschaltpunkt 960px. / zeigt direkt
  Training (kein eigener Startbildschirm). Sidebar und Bottom-Nav teilen sich eine Nav-Liste,
  damit sie nicht auseinanderlaufen.
- **Als Naechstes:** Phase 3 - Training (Workout-Karten, Eignungs-/Erholungs-Check,
  Coach-Anbindung) gemeinsam abstimmen, dann umsetzen.
- **Bewusst noch nicht dabei:** JSON-Export-Haelfte und Import/Export-Politur (Phase 12),
  Abgleich alt/neu (Stichproben), vollstaendiges Konto-Panel (Phase 10), App-Huelle offline
  laden (PWA, Phase 13), sichtbare Offline-Anzeige (Phase 1/2).
- **Offene Grundsatzfragen:** Deploy/Test geklaert. In-App-Versionsanzeige (dreistellig,
  schlank) als spaeterer Komfort-Block vorgemerkt. Login ist eine Minimalversion; das
  vollstaendige Konto-/Sync-Panel bleibt Phase 10.

---

## Globaler Look zuerst

Vor den Feature-Bloecken steht die durchgaengige Gestaltung (Phase 1). Sie gilt fuer
alle Bloecke und wird einmal bewusst entschieden, bevor einzelne Seiten entstehen.

---

## Phase 0 – Schema und Fundament

- [x] Setup-Grundsatzentscheidungen bestaetigt (Stack, Offline-Zuschnitt, Deploy/Test-Weg)
- [x] Supabase-Projekt fuer V2 angelegt (eigene DB, getrennt von V1)
- [x] Schema/Tabellen/RLS umgesetzt (Skript in Supabase ausgefuehrt; 23 Tabellen mit RLS)
- [x] Invarianten als DB-Constraints (genau eine aktive Journey pro Nutzer, aktiv)
- [x] Vite + TypeScript (strict) aufgesetzt (minimales Skelett)
- [x] TanStack Router (file-based) eingerichtet (src/routes mit __root + index,
      generierter Routenbaum, Devtools nur im Dev)
- [x] Tailwind + shadcn/ui aufgesetzt (Tailwind v4 via Vite-Plugin; shadcn neutrale Basis,
      components.json, cn-Helfer, Button-Primitive, @-Pfadalias)
- [x] Supabase-Client + TanStack-Query-Setup (Verbindung steht, Health-Check sichtbar)
- [x] Engine nach TypeScript portiert (1RM, Plate-Loader, Aufwaerm-Generator,
      Doppelprogression, Phasenwechsel, Suitability, Volumen/Deload, Erholungs-Check,
      Skill-Advice) – modulare Bausteine unter src/engine/, Logik 1:1 aus V1
- [x] Engine-Unit-Tests laufen (Vitest), gruen – 88 Tests in 7 Dateien, Paritaet zu V1 belegt
- [x] Zod-Schemas fuer die Entitaeten (alle 23 Tabellen 1:1 gespiegelt: Row + Insert,
      jsonb-Wertobjekte; Typen abgeleitet; 13 Tests gruen)
- [x] Offline-Grundgeruest gelegt (persistenter Query-Cache in IndexedDB + Fortsetzen
      pausierter Mutationen, Skelett; Cache-Buster + Max-Alter 7 Tage)
- [x] **Live-Test-Deploy eingerichtet** (Workflow gepusht; baut bei jedem Push auf main
      und veroeffentlicht auf Pages. Letzter Handgriff beim Nutzer: Pages-Quelle auf
      „GitHub Actions" stellen)

## Phase 1 – Design-System (globaler Look)

Kursaenderung 2026-06-22: nicht mehr eigene Luma-Interpretation, sondern V1-"Klar"-Theme
moeglichst 1:1 uebernehmen. shadcn bleibt als Fundament (nur die Optik wird auf V1
zurueckgedreht). Quelle: V1-Dateien klar-tokens.css und klar-app.css (nur lesen).

- [x] Konzept abgestimmt (Entscheidung: V1-Look 1:1 statt eigener Luma-Stil)
- [x] V1-Tokens 1:1 als Tailwind-Theme (Farben `--bg`/`--panel`/`--accent`, Radien
      16/11/20px, weiche Schatten `--shadow-card`/`-hi`/`-pop`, reines Hell-Theme)
- [x] shadcn-Primitives (Button/Input/Card) von Luma-Geometrie auf V1-Optik zurueckgedreht
      (Karte 16px statt 32px, V1-Schatten statt Luma-Elevation, V1-Button/-Feld)
- [x] Schrift auf Sora (Oberflaeche) + Spline Sans Mono (Zahlen) umgestellt (Inter raus);
      Dunkelmodus entfernt (V1 hat keinen)

## Phase 2 – Navigation / Shell

- [x] Konzept abgestimmt (Seitenstruktur, Sidebar/Bottom-Nav, Verhalten Mobile/Desktop)
- [x] Routing-Geruest steht (7 Routen, deutsche Slugs, AppShell im __root, Platzhalter)
- [x] Sidebar (Desktop) + Bottom-Nav (Mobile) aus gemeinsamer Nav-Definition; Einstellungen
      ueber Konto-Symbol, Theme-Umschalter in Sidebar-Fuss/Mobile-Kopf
- [x] Shell-Optik auf V1 angeglichen (versaler Markenname, Nav 12px-Radius + warmes Grau,
      Bottom-Nav deckend weiss mit weichem Schatten, keine Luma-Transparenz)

## Phase 3 – Training

- [ ] Konzept abgestimmt
- [ ] Workout-Karten
- [ ] Suitability/Erholungs-Check
- [ ] Coach-Anbindung
- [ ] Live getestet

## Phase 4 – Verlauf

- [ ] Konzept abgestimmt
- [ ] Kalender + Listenansicht
- [ ] Session-Zusammenfassung
- [ ] Erste Charts
- [ ] Live getestet

## Phase 5 – Journey

- [ ] Konzept abgestimmt
- [ ] Phasen + Wochen-Platzierung (automatisch)
- [ ] Periodisierungschart
- [ ] Live getestet

## Phase 6 – Skills

- [ ] Konzept abgestimmt
- [ ] Manager-Ansicht (aktivieren, Phase anpassen, Fortschritt)
- [ ] Equipment-Tor
- [ ] Konsekutiv-Logik (Zaehler-Reset bei Fehlschlag)
- [ ] Live getestet

## Phase 7 – Yoga

- [ ] Konzept abgestimmt
- [ ] Karte im Training-Tab + Eintrag-Popup
- [ ] Live getestet

## Phase 8 – Uebungen (inkl. Muscle-Map)

- [ ] Konzept abgestimmt
- [ ] Uebungsliste
- [ ] Detailseite
- [ ] Generische MuscleMap-Komponente (Doku: docs/Muskel-Map.md)
- [ ] Live getestet

## Phase 9 – Koerper

- [ ] Konzept abgestimmt
- [ ] Body-Log
- [ ] InBody-Composition
- [ ] Verlaufscharts
- [ ] Live getestet

## Phase 10 – Einstellungen

- [ ] Konzept abgestimmt
- [ ] Inventar (Stangen, Scheiben, Equipment)
- [ ] Plate-Loader / Ladbarkeitspruefung
- [ ] Settings (Frequenzziel, Gewichtsschritt, 1RM-Formel, Timer)
- [ ] Sync-/Konto-Panel
- [ ] Live getestet

## Phase 11 – Live-Session (Kraft + Skill)

- [ ] Konzept abgestimmt
- [ ] Gefuehrter Ablauf, Saetze abhaken
- [ ] Pausen-/Rest-Timer (Satz/Uebung getrennt, Auto-Start)
- [ ] Audio/Vibration
- [ ] Start-/Ende-Dialoge, Bottom-Sheet
- [ ] Volles Offline-Zusammenspiel (Aufzeichnen ohne Netz, spaeter Sync)
- [ ] Live getestet

## Phase 12 – Migration + Import/Export

- [ ] Konzept abgestimmt
- [x] Definitionen aus V1-Code als DB-Seed (Journey-Vorlagen, Skills; idempotent, beim
      ersten Start mit user_id; temporaere Datenstand-Anzeige zum Pruefen)
- [x] Migrationsskript: V1-Blob -> normalisierte Zeilen, IDs umschluesseln (Import-
      Knopf auf der Startseite: Datei waehlen, Vorschau, bestaetigen; gesperrt, sobald
      Daten da sind)
- [ ] JSON-Import/Export (Export-Haelfte + Politur, wandert nach Einstellungen)
- [ ] Abgleich alt/neu (Anzahl Sessions/Saetze/Journeys + Stichproben)

## Phase 13 – Politur

- [ ] PWA
- [ ] iOS-Safari-Fixes
- [ ] Bugfixing
- [ ] Paritaetsdurchlauf gegen V1

---

## Erledigt (Log)

Hier kommen abgeschlossene Bloecke mit Datum dazu, sobald sie fertig sind.

- 2026-06-22 - Navigation/Shell auf V1-Look feinjustiert (Stil, keine Struktur-/Funktions-
  aenderung): Sidebar.tsx - Markenname versal mit Sperrung in V1-Grau (#5c5c61), Logo auf
  size-9 + rounded-control (11px), Nav-Eintraege rounded-xl (12px) statt rounded-2xl, Text
  15px, inaktiver Ink warmes Grau #6c685f (V1-Wert), Hover bg-primary/6 + Text dunkel, Aktiv
  bg-primary/10 + Akzenttext (V1-Toenungen), Zahnrad im Fuss rounded-control statt rund.
  BottomNav.tsx - deckend weiss (bg-card) statt halbtransparentem Weichzeichner, weicher
  oberer Schatten (0 -6px 20px -14px rgba(20,24,40,.25), V1-Wert), inaktive Icons hellgrau
  #b0b0b6 (V1-Wert), V1-naehere Polsterung. Struktur (sechs Punkte, Konto-Symbol, 960px)
  unveraendert. Typecheck, Build und 109 Tests gruen.

- 2026-06-22 - Phase 1 auf V1-Look umgesetzt: src/index.css komplett auf das V1-"Klar"-
  Theme umgestellt (feste Hex-Werte aus klar-tokens.css: Canvas #edeef1, Karte #fff,
  Akzent #0c9d77, Linie #e4e4e8, Feld-Fuellung #fafafa, plus die Marken-Nebenfarben
  good/warning/deviation/danger/intensity/skill/yoga 1:1). Radien als Tailwind-Utilities
  rounded-card 16px / rounded-control 11px / rounded-pill 20px; weiche Schatten als
  shadow-card/-hi/-pop (V1-Werte). Reines Hell-Theme: .dark-Block, @custom-variant dark
  und alle dark:-Klassen entfernt, ThemeProvider/ThemeToggle/useTheme samt src/lib/theme.tsx
  und src/components/ThemeToggle.tsx geloescht, ThemeProvider aus main.tsx und der
  Darstellungs-Umschalter aus /einstellungen entfernt (V1 hat keinen Dunkelmodus).
  Primitives auf V1-Optik zurueckgedreht: button.tsx (11px-Radius, 600er Schrift, kein
  Pillenrund/Druck-Versatz; default=gruen gefuellt, outline=weisse Karte mit Rahmen,
  ghost=Akzenttext, destructive=Rahmen+Danger), input.tsx (bg #fafafa, sichtbarer Rahmen,
  11px, Fokus faerbt Rahmen gruen), card.tsx (16px, shadow-card statt Luma-Elevation/Ring,
  Padding 16px). AccountButton von rounded-3xl auf rounded-control. Schrift: Sora (UI) statt
  Inter, Spline Sans Mono (Zahlen) bleibt; beide selbst gehostet (offline-fest). Neue
  Abhaengigkeit @fontsource-variable/sora, @fontsource-variable/inter entfernt.
  Typecheck, Build und 109 Tests gruen.

- 2026-06-22 - Kursaenderung Design (nur Doku, kein Code): Entscheidung revidiert - der
  globale Look folgt nicht mehr einer eigenen Luma-Interpretation, sondern wird moeglichst
  1:1 aus dem V1-"Klar"-Theme uebernommen (Tokens, Radien 16/11/20px, weiche Schatten,
  Schrift System-UI + Spline Sans Mono, Inter raus). shadcn/ui bleibt als Komponenten-
  Fundament, nur die Optik wird auf V1 zurueckgedreht. Phase 1 im Plan wieder geoeffnet,
  Masterplan (Abschnitte 1, 6, 8, Phase 1) entsprechend angepasst. Reihenfolge neu: erst
  Look auf V1, dann Navigation gegenpruefen, dann Phase 3. Der gebaute Luma-Stand bleibt
  vorerst live, bis Phase 1 neu umgesetzt ist.

- 2026-06-22 – Phase 2 (Navigation/Shell): AppShell um alle Seiten; gemeinsame Nav-Definition
  fuer Sidebar (Desktop ab 960px) und Bottom-Nav (Mobile, nur Icons); sechs Hauptpunkte,
  Einstellungen ueber Konto-Symbol; sieben Routen mit deutschen Slugs (/ = Training) als
  Platzhalter; Theme-Umschalter vorerst nur in den Einstellungen; provisorischer Startseiten-
  Inhalt nach /einstellungen umgezogen. Typecheck/Build/Tests gruen.

- 2026-06-22 - Phase 1 Feinschliff Geometrie (shadcn-Stil "Luma"): die echten Luma-Werte aus
  dem shadcn-Quellcode (radix-luma) uebernommen statt geschaetzt. Primitives umgestellt:
  src/components/ui/button.tsx (rounded-4xl/Pille, Zustaende, dezenter Druck-Effekt,
  Groessen xs/sm/default/lg/icon; Akzent bleibt bg-primary = #0c9d77), src/components/ui/
  input.tsx (rounded-3xl, gefuellt bg-input/50, transparenter Rahmen, Fokusring), neu
  src/components/ui/card.tsx (Card + Header/Title/Description/Action/Content/Footer;
  rounded-4xl/32px, shadow-md + ring-1 ring-foreground/5 als weiche Elevation, Padding ueber
  --card-spacing: 24px, size=sm 16px). Slot-Import auf das vorhandene @radix-ui/react-slot
  angepasst (kein zusaetzliches radix-ui-Metapaket); cn-font-heading entfernt (Inter als
  einzige UI-Schrift). Radius-Stufen rounded-3xl/4xl und --card-spacing kommen aus den
  Tailwind-v4-Defaults und sind im Build verifiziert (32px/24px/24px). Startseite: Status,
  Umschalter und Markenfarben-Streifen vorlaeufig in eine echte Luma-Karte gefasst, damit der
  Look live testbar ist. Typecheck, Build und 109 Tests gruen.

- 2026-06-22 - Phase 1 Design-System (globaler Look): src/index.css auf das abgestimmte
  Token-Set umgestellt (warmes Stone-Grau, weisser Hintergrund, Radius 0.625rem/10px, Chart-
  Ramp, vollstaendig hell und dunkel). Akzent bewusst auf Markengruen #0c9d77 gesetzt (ersetzt
  das Gruen aus dem Token-Paste), Gefahr auf #ef5b5b. Markenfarben als eigene Tokens mit fester
  Bedeutung ergaenzt und in @theme inline als Tailwind-Utilities verfuegbar gemacht: good,
  warning, deviation, danger, intensity (Teal), skill (Blau), yoga (Lila), je mit Foreground-
  Ton (im Dunkelmodus heller). Schrift Inter (UI) und Spline Sans Mono (Zahlen) selbst gehostet
  ueber @fontsource-variable (offline-fest), in @theme inline als --font-sans/--font-mono
  gesetzt, body auf font-sans. Umschaltbarer Dunkelmodus: src/lib/theme.tsx (ThemeProvider +
  useTheme, hell/dunkel/system, in localStorage gemerkt, reagiert auf Systemwechsel, setzt die
  dark-Klasse am html-Element); ThemeProvider aussen in main.tsx. src/components/ThemeToggle.tsx
  schaltet hell -> dunkel -> system durch (Lucide-Icons). Vorlaeufig auf der Startseite, dazu ein
  Markenfarben-Streifen zum Sichtpruefen; beides wandert mit Navigation/Einstellungen weiter.
  Neue Abhaengigkeiten: @fontsource-variable/inter, @fontsource-variable/spline-sans-mono.
  Typecheck, Build und Tests gruen.

- 2026-06-22 - V1-Import gebaut (Migrationsskript): src/lib/v1import.ts uebersetzt den kompletten
  V1-Blob (verschachtelt, camelCase) in die 23 normalisierten Tabellen (snake_case). analysiereV1
  parst und zaehlt je Themenblock fuer eine Vorschau (schreibt nichts); importiereV1 vergibt alle
  id-Werte client-seitig (crypto.randomUUID) und schluesselt jede V1-Text-ID auf die neue UUID um,
  in Fremdschluessel-sicherer Reihenfolge (Inventar -> Uebungen + feine Muskel-Map -> Vorlagen ->
  Journeys + Phasen -> Einheiten + Einheit-Uebungen + Saetze -> Skill-Fortschritt -> Body-Log ->
  Messungen). Drei Einheit-Typen behandelt: Kraft (entries -> session_exercises, warmup + work ->
  sets), Yoga (minutes, keine Saetze) und Skill (skillWork -> session_exercises ohne Katalogbezug,
  value/met -> sets). Skill-Fortschritt wird ueber den Skill-Schluessel an die in Schritt 2
  geseedeten Skills gehaengt; ohne Treffer wird der Eintrag uebersprungen und gemeldet. Defensive
  Lese-Helfer tolerieren fehlende/fremde Felder und beide Schreibweisen (camelCase/snake_case);
  Invariante \"genau eine aktive Journey\" wird beim Mappen durchgesetzt. UI src/components/V1Import.tsx
  auf der Startseite: JSON-Datei waehlen, Vorschau (Zeilenzahl je Block) pruefen, bestaetigen;
  bereitsImportiert() sperrt den Knopf, sobald schon Uebungen/Einheiten vorhanden sind, gegen
  versehentlichen Doppel-Import. 8 Unit-Tests fuer die Vorschau-Zaehlung (src/lib/__tests__/
  v1import.test.ts). Typecheck, Build und 109 Tests gruen.

- 2026-06-22 – Definitionen-Seed + Datenstand: die kuratierten Journey-Vorlagen (7, mit
  Phasen) und Skill-Progressionen (2: Strict Pull-Up 10 Phasen, Pushup 6 Phasen, jeweils
  mit Phasen-Uebungen und Equipment-Toren) als getypte Code-Daten unter src/seed/definitions.ts
  (1:1 aus V1). Idempotenter Runner src/lib/seed.ts (ensureDefinitionsSeeded) legt sie beim
  ersten Start mit der user_id an; laeuft nur, wenn noch keine Skills existieren. Inserts
  ueber die Zod-Insert-Typen, IDs werden per key/Position verknuepft. Skill-Phasen-Uebungen
  bekommen exercise_id vorerst null (Link zum Katalog folgt nach dem Import in den Feature-
  Phasen). Schemas um die abgeleiteten Typen Focus/Metric ergaenzt. Temporaere Datenstand-
  Anzeige src/components/Datenstand.tsx auf der Startseite: seedet beim ersten Aufruf und
  zeigt die Zeilenzahl je der 23 Tabellen, damit der Stand ohne Code-Lesen pruefbar ist.
  Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – Schlichter Login gebaut (Voraussetzung fuer alle RLS-geschuetzten
  Schreibzugriffe): Auth-Schicht src/lib/auth.tsx (AuthProvider + useAuth) ueber Supabase
  Auth mit Sitzungsverfolgung (getSession + onAuthStateChange), Anmelden
  (signInWithPassword), Konto anlegen (signUp, erkennt ausstehende E-Mail-Bestaetigung)
  und Abmelden; bekannte Fehlertexte ins Deutsche uebersetzt. Login-Bildschirm
  src/components/LoginScreen.tsx (E-Mail/Passwort, Umschalten Anmelden/Registrieren,
  Fehler-/Hinweiszeile). AuthGate src/components/AuthGate.tsx sitzt in main.tsx vor dem
  RouterProvider und laesst die App erst nach Anmeldung durch. Wiederverwendbares
  Input-Primitive src/components/ui/input.tsx. Startseite zeigt angemeldete E-Mail und
  Abmelden-Knopf. Bewusst eine Minimalversion; das volle Konto-/Sync-Panel bleibt Phase 10.
  Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – Offline-Grundgeruest gelegt (Phase 0 abgeschlossen): zentraler Query-Client
  unter src/lib/queryClient.ts (gcTime 7 Tage, staleTime 30 s, retry 1). Persistenter Cache
  in IndexedDB ueber src/lib/offline.ts (Async-Storage-Persister auf idb-keyval, Cache-Buster
  und Max-Alter 7 Tage). main.tsx auf PersistQueryClientProvider umgestellt; nach dem
  Wiederherstellen werden pausierte Mutationen fortgesetzt (resumePausedMutations). Damit
  ueberlebt der Lese-Cache einen App-Neustart, und ohne Netz angefallene Schreibvorgaenge
  werden bei Reconnect bzw. Neustart nachgeschickt – als Geruest; die echten Entitaets-Hooks
  folgen in den Feature-Phasen. Bewusst nicht dabei: App-Huelle offline laden (PWA, Phase 13)
  und sichtbare Offline-Anzeige (Phase 1/2). Neue Abhaengigkeiten:
  @tanstack/react-query-persist-client, @tanstack/query-async-storage-persister (beide 5.101.0),
  idb-keyval 6.2.5. Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – UI-Fundament aufgesetzt: TanStack Router file-based (src/routes mit
  __root + index, automatisch generierter Routenbaum, Router-Devtools nur im Dev,
  basepath an Vite-base gekoppelt fuer Pages). Tailwind v4 ueber @tailwindcss/vite,
  shadcn/ui mit neutraler Standardbasis (components.json, cn-Helfer, Button-Primitive,
  @-Pfadalias) – der eigentliche Look folgt bewusst erst in Phase 1. Startseite ist erste
  Route; Health-Check aus App.tsx dorthin ueberfuehrt und auf Tailwind/Button umgestellt,
  App.tsx entfernt. Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – Engine nach TypeScript portiert: reine Rechenlogik aus V1 als modulare
  Bausteine (1RM, Plate-Loader, Aufwaerm-Generator, Doppelprogression, Phasenwechsel,
  Suitability, Volumen/Deload, Erholungs-Check, Skills) unter src/engine/. 88 Vitest-Tests
  gruen; aus V1 portierte Tests belegen Paritaet. Typecheck und Build gruen.
- 2026-06-22 – Zod-Schemas der Entitaeten gebaut: alle 23 Tabellen 1:1 zur Datenbank
  gespiegelt (snake_case-Spaltennamen, Nullbarkeit, CHECK-Listen als Enums), je eine
  Lese-Form (Row) und eine Schreib-Form (Insert ohne id/created_at, Defaults optional).
  jsonb-Wertobjekte praezisiert (settings.timers/recovery_windows fest; body, general_warmup,
  suggestion, skill_progress.log vorlaeufig als lockere Objekte). Typen via z.infer
  abgeleitet. Abgelegt unter src/schemas/, gruppiert wie die DB-Abschnitte, mit Barrel.
  13 Schema-Tests gruen; Typecheck und Build gruen.
