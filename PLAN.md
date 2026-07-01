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
- **Vorhaben „Workouts editierbar & Journey-Zuordnung" (Version 1.3) begonnen.** Lieferung 1
  (1.3.0, Unterbau) und Lieferung 2 (1.3.1, Workouts-Seite lesend) umgesetzt: neuer
  Hauptnav-Punkt „Workouts", Bibliothek der aktiven Workouts (Name, Uebungen in Kurzform,
  Hinweis „journey-faehig"), lesende Detailseite mit nach Rolle gruppierten Uebungen. Als
  Naechstes Lieferung 3 (Workout-Editor: anlegen/bearbeiten/archivieren/reaktivieren).
  Konzept: `docs/Konzept-Workouts-und-Journey-Zuordnung.md`.
- **Kein offenes Bau-Vorhaben ausser 1.3.** Pflege/Bugfixing laufend; neue Features nach
  Konzept-vor-Code. Aktuelle Version: 1.3.1.
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

### Workouts editierbar & Journey-Zuordnung (Version 1.3, Konzept besprochen, 1.3.0 freigegeben)

Konzept: `docs/Konzept-Workouts-und-Journey-Zuordnung.md` (auf den besprochenen Stand
fortgeschrieben). Grundlegende Anpassung: Workouts (Vorlagen) werden bearbeitbar (neue
Workouts-Seite + Editor), und Workouts lassen sich der aktiven Journey zuordnen. Der
Charakter wird aus den Uebungen abgeleitet: **journey-faehig, wenn mindestens eine Uebung
das Profil `strength` hat** (Equipment egal). Die Periodisierung bleibt **profilbasiert wie
heute** (strength progressiv, core/bodyweight mitgefuehrt) – der Coach-Rechenkern bleibt
unangetastet. Die Rolle (primary/secondary/core) dient nur noch als Ordnungs-/Anzeigeraster.
Der Coach empfiehlt bei aktiver Journey aus deren zugewiesenen Workouts, sonst aus der ganzen
Bibliothek; jedes Workout bleibt frei startbar. Skills bleiben getrennt.

Versionierung: Lieferung 1 ist **1.3.0** (mittlere Stelle, **freigegeben**), die weiteren
Lieferungen laufen als 1.3.1, 1.3.2 … (Patch-Stelle). Bau in kleinen, einzeln testbaren
Schritten; die Empfehlung aendert ihr Verhalten erst mit Lieferung 5.

- [x] Lieferung 1 (1.3.0): Migration `journey_workouts` + `templates.active`
  + `unique(user_id, name)` + Schema + Lese-Hooks (inkl. `role` in `useTemplates`)
- [x] Lieferung 2 (1.3.x): Workouts-Seite (lesend) + neuer Nav-Punkt
- [ ] Lieferung 3 (1.3.x): Workout-Editor (anlegen/bearbeiten/archivieren/reaktivieren,
  Gueltigkeit: Name eindeutig + min. eine Uebung, bewusstes Speichern)
- [ ] Lieferung 4 (1.3.x): Journey-Zuordnung der aktiven Journey (Toggles, Uebernahme beim
  Journey-Wechsel)
- [ ] Lieferung 5 (1.3.x): Trainingsempfehlung auf die Zuordnung einschraenken (Rueckfall auf
  Bibliothek nur bei leerer Zuweisung; bei „alles ausgeschlossen“ bleibt es in der Journey)

---

## Abgeschlossene Vorhaben

Ueberblick der fertigen Vorhaben; der chronologische Verlauf steht im Log unten.

- Typ-Felder am Uebungskatalog aufgeraeumt (Lieferungen 1-3, Versionen 1.2.58-1.2.60).
  Redundante Felder `category`/`kind` entfernt: `equipment === "barbell"` traegt die
  Langhantel-Rolle, neues Enum `tier` (`main`/`accessory`) die Uebungsart; Restore
  toleriert Altbackups (Schema-Marker v3). DB-Spalten via Migrationen 0002/0003
  umgestellt und geloescht. Coach-Rechenkern unangetastet. Konzept:
  `docs/archive/Konzept-Typfelder-Aufraeumen.md`.

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

2026-07-01 — Workouts & Journey-Zuordnung, Lieferung 2 / Workouts-Seite lesend
(Version 1.3.1). Neuer Hauptnav-Punkt „Workouts" (ClipboardList) zwischen Journey und
Uebungen (nav.ts, jetzt sechs Eintraege; Sidebar/Bottom-Nav ziehen automatisch nach,
Bottom-Nav verteilt per flex-1). Neue Routen routes/workouts.tsx (Bibliothek der aktiven
Workouts, List/ListRow wie die Uebungen-Seite: Name, Uebungen in Kurzform, Chip
„journey-faehig", tippen -> Detail) und routes/workouts_.$templateId.tsx (lesende
Detailseite: Kopf, Journey-Faehigkeit-Chip, Uebungen nach Rolle gruppiert Haupt/Assistenz/
Core). Datenzugriff gekapselt in useWorkoutsView/useWorkoutDetail (kombinieren
useTemplates + useExercises); reine Aufbereitung in lib/workouts.ts (isJourneyCapable =
mind. eine strength-Uebung, workoutSummary, buildWorkoutList nur aktive, buildWorkoutDetail
nach Rolle) mit fuenf Tests. Kein bestehendes Verhalten geaendert; Coach-Rechenkern
unangetastet. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-01 — Workouts & Journey-Zuordnung, Lieferung 1 / Unterbau (Version 1.3.0).
Migration 0004_journey_workouts.sql: neue Tabelle `journey_workouts` (user_id,
journey_id FK, template_id FK, `unique(user_id, journey_id, template_id)`, RLS + vier
Policies + Grant, ON DELETE CASCADE ueber beide FKs), Spalte `templates.active`
(Soft-Archiv, Default true) und Unique-Index `templates_unique_user_name` auf
(user_id, name) ueber alle Workouts inkl. archivierter – mit Vorab-Pruefung auf doppelte
Namen. Zod: `templates.active` im Row/Insert, neues Schema `journeyWorkouts.ts` (+ Barrel),
`TemplateRole` exportiert. `useTemplates` liest jetzt `role` mit und liefert zusaetzlich
eine geordnete `exercises`-Liste (exerciseId/role/position); `exerciseIds` unveraendert.
Architektur.md fortgeschrieben. Kein sichtbares Verhalten geaendert (keine Lesestelle
wertet die neuen Strukturen aus); Coach-Rechenkern unangetastet. Dateiname 0004 statt des
im Konzept genannten 0002 (0002/0003 sind bereits die Typfelder-Migrationen). Migration
muss im Supabase-Dashboard ausgefuehrt werden. Validierung gruen: vite build, tsc --noEmit,
vitest run.

2026-07-01 — Info-Chips dunkel (Version 1.2.62). Die drei Chips auf der Uebungs-Detailseite
von bg-muted/text-muted-foreground auf bg-foreground/text-background umgestellt (dunkler
Grund, heller Text) fuer bessere Lesbarkeit. Nur Klassen, Theme-Tokens. Validierung gruen.

2026-07-01 — Uebungs-Detailseite: Info-Chips (Version 1.2.61). Unter dem Namen stehen
statt der Muskelgruppen-Zeile drei Chips (Profil, Geraet, Art) im vorhandenen Chip-Stil,
nur Werte ohne Kategorie-Beschriftung. Neue wiederverwendbare Label-Helfer profileLabel
und equipmentLabel in lib/labels.ts (neben tierLabel); Route uebungen_.$exerciseId.tsx
nutzt sie, exerciseRowSub dort entfernt (bleibt in der Uebungsliste in Gebrauch).
Muskelgruppen weiterhin ueber die Muskel-Grafik sichtbar. Validierung gruen.

2026-07-01 — Typfelder aufraeumen, Lieferung 3 / Abschluss (Version 1.2.60). Altfelder
`category`/`kind` aus dem Datenpfad entfernt: Export strippt sie und fuehrt Schema-Marker
`v3` (exportData.ts); Restore akzeptiert v2 UND v3 und migriert Uebungszeilen aus
Altbackups (category/kind verworfen, `tier` aus `kind` abgeleitet, Barbell-`equipment` aus
`category` gesichert – restoreData.ts, mit zwei neuen Tests); Live-Eintrag-Rueckwaerts-
Fallback in liveSession.ts entfernt; Enums/Felder aus schemas/exercises.ts genommen. Neue
DB-Migration 0003 loescht die Altspalten (kind, category) – vom Nutzer nach dem Update
am 2026-07-01 im Supabase-Dashboard ausgefuehrt. Coach-Rechenkern unangetastet.
Validierung gruen (336 Tests).

2026-07-01 — Typfelder aufraeumen, Lieferung 2 (Version 1.2.59). Interne Lesestellen von
den Altfeldern auf die neuen umgehaengt: `equipment === "barbell"` uebernimmt die
Langhantel-Rolle von `category` (coach suggestWithBar/warmupFor, ExerciseLiveCard,
Mapper in useCoachStatuses/useLiveBuilder/liveBuild, Live-Eintrag in liveSession mit
Rueckwaerts-Fallback fuer bereits laufende Einheiten); `kind` -> `tier` in exercises
(Gruppierung/Meta) und suitability (Kraftphasen-Bonus). Verhaltenserhaltend abgesichert:
Bonus zaehlt nur `tier==="main" && profile==="strength"`, damit Core-Uebungen wie bisher
nicht als Hauptlift zaehlen; Unterzeilen-Label fuer Core/Koerpergewicht kommt jetzt aus
dem Profil. `kindLabel` -> `tierLabel`. Altfelder `category`/`kind` bleiben ueberlappend
bestehen (fallen in Lieferung 3). Coach-Rechenkern unangetastet. Validierung gruen.

2026-07-01 — Typfelder aufraeumen, Lieferung 1 (Version 1.2.58). Neue Spalte `tier`
(main/accessory) am Uebungskatalog angelegt und aus `kind` befuellt; `equipment` an der
Barbell-Wahrheit von `category` ausgerichtet (Migration 0002, mit Verifikation vor dem
Weitermachen). Zod-Schema traegt `tier` zusaetzlich – Alt- und Neuform ueberlappend, noch
keine Lesestelle umgehaengt, kein sichtbares Verhalten geaendert. Coach-Rechenkern
unangetastet. Validierung gruen.

2026-07-01 — Verlauf-Liste: Startzahl auf 5 (Version 1.2.57). PAGE_SIZE in
HistorySection von 10 auf 5 gesenkt; „Mehr laden" legt entsprechend je 5 weitere
frei. Einzige Aenderung. Validierung gruen.

2026-07-01 — Verlauf-Block: Handy gestapelt statt Umschalter, Liste mit „Mehr
laden" (Version 1.2.56). HistorySection (components/history/HistorySection.tsx):
SegmentedControl-Umschalter entfernt, Kalender oben / Liste darunter jetzt auf
Handy wie Desktop gleich gestapelt (beide mit Ueberschrift). Liste zeigt zunaechst
PAGE_SIZE=10 juengste Einheiten, „Mehr laden" (Button outline, volle Breite) legt
je 10 weitere frei – reine Anzeige, Daten liegen bereits vor; Kalender unveraendert
(alle Monatspunkte). Nur diese eine Datei geaendert; useHistory/Datenschicht
unberuehrt. Validierung: vite build, tsc --noEmit, vitest run gruen.

2026-07-01 — Trainingsseite Desktop: ein Zweispalter statt zwei (Version 1.2.55).
Links alle Trainingsbloecke gestapelt (Heute empfohlen, Weitere Workouts, Aktive
Skills, Yoga), rechts der Verlauf mit Kalender oben und Liste darunter. TwoColumn
(components/ui/two-column.tsx) von 1.6/1 auf 1.2/1 gesetzt (Training etwas breiter,
Kalender rechts bekommt mehr Raum); HistorySection (components/history/HistorySection.tsx)
gibt das innere Nebeneinander-Raster auf und stapelt Kalender/Liste in der rechten
Spalte, Handy-Umschalter unveraendert. index.tsx fuehrt main/side zu einer
Trainingsspalte zusammen. Mobile-Reihenfolge unveraendert.

2026-07-01 — Chart-Rahmen scrollt nur bei echtem Ueberlauf (Version 1.2.54).
In ChartCanvas (components/ui/chart.tsx) den Rahmen von fixem overflow-x-auto
auf bedarfsabhaengig umgestellt: needsScroll = Zeichenbreite > Containerbreite
(kleine Toleranz), sonst overflow-x-clip. Behebt das kurzzeitige Aufblitzen
einer waagerechten Scrollbar bei den angehefteten Uebungs-Charts, wenn am
Desktop das Fenster resized wird (Rahmen- und SVG-Breite liefen einen Frame
auseinander). Handy-Scrollfall (lange Kurve, minInnerWidth) unveraendert. Reiner
Layout-Fix, keine Logik beruehrt. Geaendert: components/ui/chart.tsx,
changelog.json.

2026-07-01 — Verlauf-Band auf oberes Spaltenraster ausgerichtet (Version 1.2.53).
Das Verlauf-Gitter in HistorySection.tsx von 1.35fr/1fr auf 1.6fr/1fr umgestellt,
damit die Spaltenkante (Kalender links, Liste rechts) am Desktop mit dem oberen
TwoColumn-Block (1.6fr/1fr, gleicher 26px-Spaltenabstand) fluchtet. Korrigiert die
Konzept-Entscheidung von 1.2.52 (eigenes, engeres Verhaeltnis). Reine Layout-
Korrektur, keine Logik beruehrt. Geaendert: components/history/HistorySection.tsx,
changelog.json.

2026-07-01 — Verlauf-Seite aufgeloest, Inhalt unter Training (Version 1.2.52).
Die Route /verlauf entfaellt; der Verlauf-Punkt faellt aus der Hauptnavigation
(nav.ts, einzige Quelle -> Sidebar und Bottom-Nav ziehen automatisch nach, jetzt
fuenf Eintraege). Der gesamte Verlauf-Inhalt (Umschalter Liste/Kalender am Handy,
Zwei-Spalten am Desktop, Bearbeiten-Panel, eigene Datenanbindung useHistory/
useDeleteSession) sitzt jetzt in der eigenstaendigen Komponente
components/history/HistorySection.tsx und wird auf der Trainingsseite unter dem
Zwei-Spalten-Block eingebunden. Desktop: Kalender links (1.35fr), Liste rechts
(1fr). Der Block gibt Umschalter und Gitter als zwei DOM-Elemente auf oberster
Ebene aus, damit die PageReveal-Staffelung unveraendert greift. Geaendert:
routes/index.tsx, lib/nav.ts, changelog.json; neu: components/history/
HistorySection.tsx; geloescht: routes/verlauf.tsx. SessionLogCard/SessionEditPanel/
Calendar/SegmentedControl unveraendert wiederverwendet.

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
