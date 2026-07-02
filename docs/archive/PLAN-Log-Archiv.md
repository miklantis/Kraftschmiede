# PLAN.md – Log-Archiv

Archivierter chronologischer Verlauf von Kraftschmiede. Hierher wandern ältere
Log-Einträge aus `PLAN.md`, sobald sie nicht mehr zu den jüngsten gehören. Der laufende
Stand und die letzten Einträge stehen weiter in `PLAN.md`; der nutzerverständliche
Verlauf in `public/changelog.json`; die getroffenen Entscheidungen in `docs/adr/`.

Einträge bleiben historisch unverändert, neueste zuerst.

---

2026-07-01 — Workouts & Journey-Zuordnung, Lieferung 4b / Uebernahme beim Journey-Wechsel
(Version 1.3.7). Startet man eine neue Journey und die zuvor aktive hatte zugewiesene
Workouts, erscheint nach der Vorlagenwahl ein einmaliges Rueckfrage-Overlay „Workouts
uebernehmen?" (Ja = Uebernehmen / Nein = Leer starten), danach weiter ins Training.
useJourneyActions.createFromTemplate gibt jetzt { newJourneyId, previousJourneyId } zurueck
(vorige Journey-Id gemerkt, bevor sie deaktiviert wird; ihre journey_workouts bleiben, da
die Zeile nur active=false wird). Neue Aktionen readAssignments (zugewiesene template_id
einer Journey) und copyAssignments (Batch-Insert in die neue Journey, clientseitige Ids,
invalidiert journeyWorkouts). Reine Hilfsfunktion filterCopyableAssignments in
lib/workouts.ts (uebernimmt nur aktiv + journey-faehig + zuvor zugewiesen) mit zwei Tests;
das Angebot erscheint nur, wenn nach dieser Filterung mindestens ein Workout uebrig bleibt.
routes/journey_.waehlen.tsx orchestriert (haelt das Angebot, nutzt useTemplates/useExercises
fuers Zuweisbarkeits-Nachschlagewerk, rendert das Overlay-Primitive). Journey-Wechsel bleibt
ein Online-Vorgang wie bisher; Coach-Rechenkern unangetastet; kein neues DB-Migrat.
Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-01 — Workouts & Journey-Zuordnung, Lieferung 4a / Journey-Zuordnung per Schalter
(Version 1.3.6). Auf der Journey-Seite neuer Abschnitt „Workouts in dieser Journey"
(components/journey/JourneyWorkoutsSection.tsx, in journey.tsx am Ende der aktiven Journey
eingehaengt): An/Aus-Schalter je zuweisbarem Workout, angeboten werden nur aktive und
journey-faehige (mind. eine strength-Uebung). Jeder Schalter speichert sofort und
optimistisch (Cache-Write, springt auch offline um). Datenzugriff gekapselt: neuer Lese-Hook
useJourneyWorkouts (Menge der zugewiesenen template_id je Journey, queryKey
[\"journeyWorkouts\", userId, journeyId]) und Aktions-Hook useJourneyWorkoutActions (toggle
= assign/unassign). Schreibvorgang ueber den neuen registrierten Mutations-Default
lib/journeyWorkoutActions.ts (Kennung [\"journeyWorkoutAction\"], in queryClient.ts NACH den
Workout-Aktionen registriert – ADR-0009, damit ein offline neu angelegtes Workout vor seiner
Zuordnung landet); Insert mit clientseitiger Id, Unassign per Delete ueber
journey_id+template_id (idempotent). Reine Aufbereitung buildJourneyAssignment in
lib/workouts.ts (aktiv + journey-faehig, Reihenfolge unveraendert, assigned-Flag) mit drei
neuen Tests. Empfehlung nutzt die Zuordnung noch nicht (Einschraenkung erst Lieferung 5);
Coach-Rechenkern unangetastet. Kein neues DB-Migrat (nutzt journey_workouts aus 1.3.0).
Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-01 — Workout-Editor: Rolle als Dropdown (Version 1.3.5). Die vollbreite
Segmentleiste je Uebung (Haupt/Assistenz/Core) durch das generische Select-Primitive ersetzt,
kompakt in der Kopfzeile neben dem Uebungsnamen (Icons auf size-9 angeglichen). Die Rolle ist
reines Anzeigeraster und tritt so dezenter auf. Nur components/workout/WorkoutEditor.tsx.
Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-01 — Workout-Detail: Bearbeiten-Knopf am Handy (Version 1.3.4). Die Chip/Bearbeiten-
Zeile in workouts_.$templateId.tsx am Handy von flex-wrap (Knopf via ml-auto rechts, gedraengt
unter dem Konto-Avatar) auf flex-col umgestellt: Chip oben, Knopf als eigene Zeile darunter
linksbuendig. Ab 960px unveraendert nebeneinander (flex-row, ml-auto). Reiner Layout-Fix, eine
Datei. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-01 — Workout-Namen als volle Wahrheit (Version 1.3.3). Das Anzeige-Praefix
"Workout " (Relikt aus der Zeit einbuchstabiger Namen) an allen Stellen entfernt:
RecommendedWorkout (Hero), routes/index.tsx (Weitere Workouts), live/StartModal,
live/LivePanel, live/EndModal (Workout-Zweig; Skill-Praefix bleibt) und
lib/history.ts sessionTitle (gibt jetzt den Template-Namen roh, Fallback "Workout").
Die neuen Workouts-Seiten (Bibliothek/Detail/Editor) zeigten den Namen schon roh und
sind damit ab jetzt konsistent. Datenkorrektur per Migration 0005_workout_namen.sql:
einbuchstabige Alt-Namen einmalig auf "Workout "||name gehoben (char_length=1, idempotent,
Unique-Index bleibt gewahrt) – im Supabase-Dashboard auszufuehren. history-Test auf den
rohen Template-Namen angepasst. Coach-Rechenkern unberuehrt. Validierung gruen: vite build,
tsc --noEmit, vitest run.

2026-07-01 — Workouts & Journey-Zuordnung, Lieferung 3 / Workout-Editor (Version 1.3.2).
Workouts sind editierbar: neue Routen workouts_.neu.tsx (/workouts/neu) und
workouts_.$templateId_.bearbeiten.tsx (/workouts/$templateId/bearbeiten), beide rendern die
neue Feature-Komponente components/workout/WorkoutEditor.tsx. Der Editor haelt einen lokalen
Entwurf (Name + geordnete Uebungsliste mit Rolle), zeigt die Journey-Faehigkeit live und
speichert erst per Knopf. Bibliotheksseite (routes/workouts.tsx) um „Neues Workout" und einen
ausklappbaren Abschnitt „Archivierte" (Reaktivieren) erweitert; Detailseite
(workouts_.$templateId.tsx) um „Bearbeiten". Reine Regellogik in lib/workoutEditor.ts
(Journey-Faehigkeit, Namens-/Speicherbarkeit, Hinzufuegen/Entfernen/Rolle/Verschieben) mit
16 Tests; Datenzugriff in Hooks gekapselt: useWorkoutEditor (Entwurfszustand),
useTemplateActions (Speichern/Archivieren/Reaktivieren). Speichern laeuft ueber den neuen
registrierten Mutations-Default lib/templateActions.ts (Kennung ["templateAction"], in
queryClient.ts nach den bestehenden und vor einer kuenftigen Journey-Zuordnung registriert –
ADR-0009) mit clientseitigen IDs; Bearbeiten ersetzt die Uebungsliste sauber
(Loeschen + Neu-Einfuegen), unbedenklich da template_exercises nur das Rezept ist. Neuer
Auswaehler components/exercise/ExercisePicker.tsx (Overlay, gruppierter Katalog, Suche,
Mehrfachauswahl). BackLink um optionale Params erweitert (Ruecksprung auf die Detailseite).
Archivieren setzt nur templates.active=false (journey_workouts bleiben, kommen beim
Reaktivieren von allein zurueck). Empfehlung rankt weiter alle Workouts (Einschraenkung erst
Lieferung 5); Coach-Rechenkern unangetastet. Kein neues DB-Migrat (nutzt 0004). Validierung
gruen: vite build, tsc --noEmit, vitest run (357 Tests).

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

- 2026-06-29 - Uebungsseite: Coach-Status je Uebung, Version 1.2.44: In der Liste steht
  unter jedem Namen statt der Muskelgruppen eine Pille mit der groben Coach-Lesart fuer die
  naechste Einheit (Steigern/Halten/Senken, dazu "Frei" fuer Begleituebungen und "Start"
  ohne Vordaten); rechts bleibt 1RM/Arbeitsgewicht. Im Detail oben ein Coach-Block mit
  derselben Pille, dem vorgeschlagenen naechsten Satz (Gewicht x Wdh) und der Begruendung
  als Klartext. Komponentenschnitt: neue Primitive `CoachStatusPill`, neuer gemeinsamer Hook
  `useCoachStatuses` (Liste + Detail). Die heikle Stangenwahl samt Vorschlag ist als
  gemeinsame Naht `suggestWithBar` in `src/lib/coach.ts` gebuendelt; der letzte Eintrag je
  Uebung (`src/lib/lastEntries.ts`) und der Phasen-Kontext (`src/lib/phaseContext.ts`) sind
  als reine Helfer herausgezogen. So nutzen Pille, Detail und der Live-Aufbau dieselbe Quelle
  und die Pille zeigt exakt den Live-Vorschlag; `liveBuild`/`useLiveBuilder` verhalten sich
  unveraendert (durch liveBuild-Tests bestaetigt). Rein additive Anzeige - kein Eingriff in
  Engine-Werte, Daten oder den Offline-Schreibweg. Neue Tests fuer `suggestWithBar` und das
  Status-Mapping. Validierung: vite build, tsc --noEmit, vitest (334) gruen.

- 2026-06-29 - Bugfix Stangenwahl im Coach-Vorschlag, Version 1.2.43: Bei leichten
  Langhanteluebungen klebte die Vorbelegung an der schwersten Stange (beim Nutzer 20).
  Ursache (im Code bestaetigt): in `src/lib/liveBuild.ts` gewann `firstBar` (Stange mit
  niedrigster position) immer, sobald irgendeine Stange existierte - die uebungseigene
  `barId` wurde nie erreicht; zugleich zieht `nearestLoadable` (`src/engine/plates.ts`)
  jedes Ziel unter Stangengewicht wieder auf die Stange hoch, sodass ein "senken" der
  Doppelprogression keinen Spielraum nach unten hatte. Fix in der Aufbau-Naht (Engine
  unberuehrt): die Senk-/Halte-/Steiger-Entscheidung haengt nur am Arbeitsgewicht, nicht
  an der Stange - darum jetzt drei Schritte je Langhanteluebung: (1) rohes Zielgewicht mit
  der LEICHTESTEN Stange bestimmen, (2) Stange dazu waehlen ueber den neuen reinen,
  generischen Helfer `pickBarForTarget` in `src/lib/coach.ts` (schwerste Stange <= Ziel,
  sonst die leichteste), (3) mit dieser Stange endgueltig ladbar rechnen (Gewicht +
  Aufwaermrampe). `suggestWeight` bekommt weiter genau eine Stange; der Boden ist nun die
  leichteste Stange im Inventar statt fix 20. ENTSCHIEDEN mit Nutzer (Variante A): `barId`
  spielt fuer den Vorschlag keine Rolle mehr - die Stange folgt rein dem Zielgewicht; die
  manuelle Live-Stangenwahl bleibt unberuehrt fuer Ausnahmen. Akzeptiert: die
  vorgeschlagene Stange einer Uebung kann zwischen Einheiten wechseln, wenn sich das
  Zielgewicht aendert. Tests: neuer Fall in `liveBuild.test.ts` (leichte Uebung sinkt mit
  Mehr-Stangen-Inventar auf 12,5er/17,5 obwohl die 20er vorne im Inventar steht, dazu
  Ein-Stangen-Regress) und vier `pickBarForTarget`-Faelle in `coach.test.ts`. Validiert:
  `vite build` gruen (SW erzeugt, changelog.json nicht precached), `tsc --noEmit` sauber,
  `vitest run` 328 gruen (322 + 6). Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-28 - Verlauf-Schreiben zu einem Pfad gebuendelt, Version 1.2.42
  (Architektur-Durchsicht, Punkt 2): Die drei Verlauf-Schreiber (`finishMutation`
  Kraft beenden, `finishSkillMutation` Skill beenden, `editMutation` Einheit
  bearbeiten) machten fast dieselben Schritte - Einheit/Uebungen/Saetze
  einfuegen bzw. Arbeitssaetze ersetzen, Katalog bzw. Skill-Fortschritt
  nachziehen, dazu je verstreut die `{ error } -> throw`-Routine; keiner der drei
  Pfade war getestet (reden direkt mit Supabase). Neue Naht
  `src/lib/historyStore.ts`: eine schmale Schnittstelle `HistoryStore` mit zwei
  Gesichtern - `supabaseHistoryStore` (Betrieb, Fehlerpruefung an einer Stelle
  via `must`) und `createMemoryHistoryStore` (Test, protokolliert statt zu
  schreiben). Neuer Schreib-Baustein `src/lib/historyWrite.ts` mit den drei
  duennen Folgen (`writeFinishStrength`/`writeFinishSkill`/`writeEditSession`),
  der Katalog-Patch-Regel (`exercisePatchToRecord`, 1RM nur wenn bestimmt) und
  den Auffrisch-Schluesseln (`HISTORY_INVALIDATE`) - alles an einem Ort. Die drei
  Mutationsdateien sind jetzt duenne Aufrufer: sie behalten Kennung
  (`*_MUTATION_KEY`), Payload-Typen und ihre `register*`-Funktionen, rufen nur
  noch den Baustein mit `supabaseHistoryStore` und lesen ihre Auffrisch-Schluessel
  aus `HISTORY_INVALIDATE`. BEWUSST UNANGETASTET (Offline): die Registrierung in
  `src/lib/queryClient.ts` - dieselben drei Aufrufe in derselben Reihenfolge vor
  `resumePausedMutations`, dieselben Mutations-Kennungen und Payload-Formen; damit
  ueberleben ohne Netz angefangene Speichervorgaenge den Neustart wie zuvor.
  Modulgraph kreisfrei (Bezuege nach oben nur als reine Typen). Kein sichtbares
  Verhalten, kein Daten-/Schema-Eingriff. Erstmals getestet: neuer
  `src/lib/__tests__/historyWrite.test.ts` prueft die drei Folgen gegen den
  Arbeitsspeicher-Adapter (Reihenfolge, leere Listen ueberspringen, Katalog-Patch
  mit/ohne 1RM, Skill-Fortschritt, Yoga-Felder). Validiert: `tsc --noEmit`
  sauber, `vite build` gruen (SW erzeugt, changelog.json nicht precached), 322
  Tests gruen (314 + 8 neue). Betroffen ausserdem `public/changelog.json`,
  `PLAN.md`. Punkt 3 (Supabase-Zugang der Hooks als eine Naht) bleibt offen.

- 2026-06-28 - Satz-Ergebnis an einen Ort geholt, Version 1.2.41: Die Ableitung
  gespeicherter Arbeitssaetze (Satz-Zeilen, geschaetztes 1RM, „Ziel erreicht“,
  naechstes Arbeitsgewicht) lag dreimal fast gleich vor - beim Kraft-Beenden
  (`liveFinish`), beim Skill-Beenden (`skillFinish`) und beim nachtraeglichen
  Bearbeiten (`editSession`, Kraft + Skill). Neuer reiner Baustein
  `src/lib/setResult.ts` mit `deriveWorkSets` (Kraft) und `deriveSkillSets`
  (Skill) als zwei Spielarten desselben Bausteins; die drei Stellen rufen ihn nur
  noch auf. Bewusst NICHT mitgewandert: Aufwaermsaetze, Einheit-Kopf und das
  Coach-Nachziehen („nur juengste Einheit“) - die bleiben bei den Aufrufern.
  Reines Aufraeumen, kein sichtbares Verhalten geaendert: die bestehenden Tests
  von `liveFinish`/`skillFinish`/`editSession` pruefen die erzeugten Zeilen und
  blieben unveraendert gruen; dazu eigener Test fuer `setResult` (314 statt 309
  Tests). Validiert: `tsc --noEmit` sauber, `vite build` gruen, `vitest run`
  314 gruen.

- 2026-06-27 - Reveal-Timing der Unterseiten angeglichen, Version 1.2.40: Auf allen
  Hauptseiten steht der `PageHeader` ausserhalb von `PageReveal`, der Effekt beginnt also
  direkt beim Inhalt. Auf Uebungs-Detail und Journey-Auswahl lag der Kopf (BackLink,
  PageHeader, bei der Uebung zusaetzlich Kategorie-Chip und Beschreibung) zunaechst im
  Reveal und staffelte mit - der laengere Vorlauf wirkte wie zusaetzliche Wartezeit. Kopf
  nun auf Fragment-Ebene gezogen, `PageReveal` umfasst nur noch den Inhalt (columns- bzw.
  Karten-Block). Step (55ms) unveraendert.

- 2026-06-27 - Reveal-Effekt auf den Unterseiten, Version 1.2.39: Das gestaffelte
  Einblenden beim Seitenwechsel greift jetzt auch auf Uebungs-Detail und Journey-Auswahl.
  Das bewusst gebaute Layout der Detailseite (display:contents + order, mobil/desktop
  unterschiedliche Reihenfolge) wurde NICHT umgebaut; stattdessen wurde der Reveal-Baustein
  `PageReveal` um einen Modus `data-reveal-columns` erweitert: mobil folgt die Staffelung der
  sichtbaren CSS-order der Bloecke, desktop laufen die Spalten parallel von oben nach unten.
  Journey-Auswahl staffelt die Vorlagenkarten ueber `data-reveal-flatten`. Layout unberuehrt.

- 2026-06-26 - Mobile Navi zurueck auf hellen Look, Version 1.2.38: Akzentgruener
  Hintergrund (1.2.36) wieder verworfen. `BottomNav` zurueck auf `bg-card` (hell) und obere
  Kante `border-border`; Icons inaktiv `text-[#b0b0b6]` (V1-Grau), aktiv `text-primary`
  (Akzentgruen). Beibehalten: die saubere Farbtrennung ueber inactiveProps/activeProps
  (kein Kaskaden-Konflikt mehr, Aktiv-Zustand zuverlaessig sichtbar) sowie der kraeftigere
  Schatten aus 1.2.34/1.2.35 (rgba(10,12,22,0.34)). Nur `src/components/shell/BottomNav.tsx`.
  Validiert: Build, tsc, Vitest gruen.

- 2026-06-26 - Aktiv-Zustand der mobilen Navi gefixt, Version 1.2.37: Aktiv/Inaktiv war
  nicht unterscheidbar, weil `text-white/55` (Basisklasse) und `text-white` (activeProps)
  am aktiven Element gleichzeitig anlagen und in der Kaskade kollidierten - der Sieger war
  nicht deterministisch. Farbe aus der Basisklasse entfernt und sauber getrennt: inaktiv
  ueber `inactiveProps` (`text-white/45`), aktiv ueber `activeProps` (`text-white`). Jedes
  Icon traegt jetzt genau eine Farbklasse. Inaktiv zusaetzlich von /55 auf /45 abgesenkt,
  damit der Kontrast deutlicher ist. Nur `src/components/shell/BottomNav.tsx`. Validiert:
  Build, tsc, Vitest gruen.

- 2026-06-26 - Mobile Navi in Akzentgruen, Version 1.2.36: Ansatz gewechselt - statt
  leicht getoenter heller Leiste jetzt voller Akzent-Hintergrund. `BottomNav`-Hintergrund
  von `bg-[#f3faf8]` auf `bg-primary` (#0c9d77), inaktive Icons von `text-[#b0b0b6]` auf
  `text-white/55` (weiss mit Transparenz), aktives Icon von `text-primary` auf `text-white`
  (voll weiss); obere Kante von `border-border` auf `border-white/15`. Schatten unveraendert.
  Nur `src/components/shell/BottomNav.tsx`. Validiert: Build, tsc, Vitest gruen.

- 2026-06-26 - Mobiler Navi-Feinschliff, Version 1.2.35: Schatten-Deckkraft von 0.45 auf
  0.34 zurueckgenommen (etwas transparenter) und Hintergrund der `BottomNav` von `bg-card`
  (Weiss) auf `bg-[#f3faf8]` (~5% Akzent-Gruen auf Weiss) getoent, damit sich die untere
  Leiste auch farblich leicht vom Inhalt abhebt. Nur `src/components/shell/BottomNav.tsx`
  (Hintergrund- und Schattenklasse + Kommentar). Validiert: Build, tsc, Vitest gruen.

- 2026-06-26 - Mobiler Navi-Schatten kraeftiger, Version 1.2.34: oberer Schatten der
  `BottomNav` von `0 -6px 20px -14px rgba(20,24,40,0.25)` auf
  `0 -11px 26px -8px rgba(10,12,22,0.45)` angehoben - hoeherer Versatz, gelockerter
  negativer Spread und dunklere, deckendere Farbe, damit sich die untere Leiste auf Mobile
  sichtbar vom darueberliegenden Inhalt abhebt. Nur `src/components/shell/BottomNav.tsx`
  (Schattenklasse + Kommentar). Validiert: Build, tsc, Vitest gruen.

- 2026-06-26 - Haptik wieder zurueckgenommen, Version 1.2.33: das in 1.2.32 eingefuehrte
  taktile Tipp-Feedback komplett ausgebaut. Grund: der einzige Web-Weg auf iOS (der
  Schalter-Trick mit `<input type="checkbox" switch>`) funktioniert nur bis iOS 26.4 -
  Apple hat ihn in iOS 26.5 geschlossen; die Vibrations-API kennt iOS-Safari ohnehin nicht.
  Damit ist Haptik auf aktuellen iPhones aus einer Web-App nicht mehr ausloesbar, ein toter
  Schalter waere irrefuehrend. Entfernt: `src/lib/haptics.ts`, `src/hooks/useHaptics.ts`,
  `src/components/settings/HapticsSetting.tsx`; `BottomNav`/`Sidebar` (onClick), die vier
  `hapticTick`-Aufrufe in `useLiveSession` samt `LivePrefs.haptics`, das `haptics`-Feld im
  `timersSchema` (`shared.ts`), die Sektion „Haptik" in `einstellungen.tsx`. `clickTick`
  (liveAudio) hat seinen Ton-plus-Vibration-Stand von vor 1.2.32 zurueck, d. h. der Satz-
  Haken vibriert auf Android wieder ueber den Vibrations-Schalter wie zuvor. Code exakt auf
  den Stand vor 1.2.32 zurueckgesetzt. Validiert: `vite build`, `tsc --noEmit`, 309 Tests gruen.

- 2026-06-26 - Haptik: taktile Rueckmeldung beim Tippen, Version 1.2.32: neuer duenner
  Effekt-Baustein `src/lib/haptics.ts` (`hapticTick`) in der Art von liveAudio/wakeLock -
  kein React, robuste try/catch, No-op wo nicht unterstuetzt. Plattform-Weiche: Android &
  Co. ueber `navigator.vibrate(12)`, iOS Safari ueber den Schalter-Trick (verstecktes
  `<input type="checkbox" switch>` + `label.click()`, lazy einmalig erzeugt), aelteres iOS
  still nichts. Damit je Geraet genau ein Kanal, keine Doppel-Rueckmeldung. Neuer Hook
  `useHaptics` (liest `timers.haptics ?? true`) an Hauptnavigation angebunden (`BottomNav`,
  `Sidebar` onClick). Live-Session ruft `hapticTick(prefs.haptics ?? true)` an den vier
  Satz-Haken-Stellen (`useLiveSession`); dafuer den `navigator.vibrate`-Teil aus `clickTick`
  (liveAudio) entfernt, damit der Haken nicht doppelt rueckmeldet (Folge: der Sekunden-
  Countdown-Tick in `SkillWatchValue` ist jetzt nur noch Ton). Neue Einstellung im jsonb
  `timers` (`haptics?: boolean`, Fehlen = an, keine DB-Migration, Muster wie `wakeLock`),
  Schema `shared.ts` erweitert. Eigene Einstellungs-Sektion „Haptik" (`HapticsSetting`,
  Switch, Standard an). Validiert: `vite build`, `tsc --noEmit`, 309 Tests gruen.

- 2026-06-26 - Page-Reveal echt gestaffelt + auf alle Hauptseiten ausgerollt, Version 1.2.31:
  `PageReveal` setzt die Reihenfolge jetzt nach dem Mount direkt im DOM (CSS-Variable
  `--ks-reveal-i` je Block, Klasse `ks-reveal-item`), statt nur die direkten Kinder per
  `cloneElement` zu nummerieren. Damit staffeln auch verschachtelte Bloecke. Zweispaltige
  Layouts: Spalten als `data-reveal-group` markiert (parallel, je von oben nach unten);
  Masonry-/columns-Layouts: Container mit `data-reveal-flatten` (Sektionen einzeln). `TwoColumn`
  markiert seine Spalten selbst. Ausgerollt auf Training, Verlauf, Journey, Skills, Uebungen,
  Koerper, Einstellungen. Bewusst noch nicht: Uebungs-Detail und Journey-Auswahl (Sonderlayout
  mit `display:contents` + `order`, braucht eigene Behandlung). CSS-Selektor von `.ks-reveal > *`
  auf `.ks-reveal-item` umgestellt. Werte (10px / .34s / 55ms) weiter anpassbar. Validiert:
  vite build, tsc --noEmit, vitest (309 Tests) gruen.

- 2026-06-26 - Page-Reveal (gestaffeltes Einfaden beim Seitenwechsel), Version 1.2.30:
  Neues Primitive `PageReveal` (`src/components/ui/page-reveal.tsx`) umschliesst den
  Seiteninhalt und staffelt seine direkten Kinder (leicht von unten, nacheinander). Keyframes
  + justierbare CSS-Variablen (`--ks-reveal-shift/-dur/-step`) und Reduced-Motion-Schutz in
  `src/index.css`. Vorerst nur auf der Trainingsseite (`src/routes/index.tsx`) zum
  Live-Testen, Werte bewusst noch nicht final. Designsystem ergaenzt. Validiert: vite build,
  tsc --noEmit, vitest (309 Tests) gruen.

- 2026-06-26 - Kater-Einfaerbung wieder deckend, Version 1.2.29: Aufruf `regionOpacity={0.5}`
  aus `BodySoreMap` entfernt (Ruecknahme von 1.2.26). Das Prop bleibt in `MuscleMap`
  erhalten (ohne Vorgabe voll deckend, kein Effekt). Neue Silhouetten-SVG bleibt. Damit
  ist die Figur wieder im Ausgangszustand vor den Anpassungen, nur mit der neuen SVG.
  Validiert: vite build, tsc --noEmit, 309 Vitest-Tests gruen.

- 2026-06-26 - Silhouette zurueck auf grau, Version 1.2.28: `BASE_DEFAULT` wieder auf
  `#cfd3d8` gesetzt (Ruecknahme von 1.2.27). Halbtransparenz und neue Silhouetten-SVG
  aus 1.2.26 bleiben unveraendert. Validiert: vite build, tsc --noEmit, 309 Tests gruen.

- 2026-06-26 - Silhouette weiss, Version 1.2.27: `BASE_DEFAULT` in `MuscleMap` von
  `#cfd3d8` (grau) auf `#ffffff` geaendert. Gilt fuer beide Figuren (Muskelkater und
  Beteiligung), da beide die Standard-Silhouettenfarbe nutzen. Die Erst-Neutralisierung
  beim Einbetten (Zeile 13) bleibt grau, da der Effekt sie sofort mit Weiss ueberschreibt.
  Validiert: vite build, tsc --noEmit, 309 Vitest-Tests gruen.

- 2026-06-26 - Muskelkater-Figur: neue SVG + Halbtransparenz, Version 1.2.26: Master-Asset
  `src/assets/body-muscles.svg` durch die ueberarbeitete Datei ersetzt (Front-Silhouette jetzt
  eine einzige Flaeche statt vieler Einzel-Pfade; identische viewBox und Regions-Koordinaten,
  alle 14 Registry-IDs + beide Silhouetten vorhanden, Crop-Werte unveraendert gueltig).
  `MuscleMap` um optionales Prop `regionOpacity` erweitert: setzt `fill-opacity` nur auf den
  eingefaerbten Regionen (beansprucht wie idle), nie auf der Silhouette; ohne Vorgabe voll
  deckend wie bisher (`setFill` um opacity-Parameter ergaenzt, in Effekt-Dependencies
  aufgenommen). `BodySoreMap` ruft die Map jetzt mit `regionOpacity={0.5}` auf, sodass die
  Kater-Einfaerbung die graue Silhouette durchscheinen laesst und weniger dominant wirkt. Die
  Uebungs-Detailseite (Beteiligung) bleibt unberuehrt deckend. Validiert: vite build, tsc
  --noEmit fehlerfrei, 309 Vitest-Tests gruen.

- 2026-06-26 - Bugfix Muskelkarte (Korrektur zu 1.2.24), Version 1.2.25: Eigentliche
  Ursache eingegrenzt (isoliert in jsdom/React-19 nachgestellt). Kein Remount und nicht
  `visibilitychange`: ein simples Re-Render von `MuscleMap` genuegt. React 19 wendet
  `dangerouslySetInnerHTML` bei JEDEM Re-Render erneut an, auch bei byte-gleichem `__html`,
  und setzt damit den SVG-Teilbaum auf den rohen Einbett-Zustand zurueck (volle
  Master-viewBox -> wirkt runterskaliert; neutrales Grau). Da die Effekt-Deps (`values`
  usw.) dabei stabil bleiben, lief der Anstrich-Effekt nicht erneut. Tab-Rueckkehr ist nur
  der haeufigste Ausloeser des Re-Renders (TanStack `refetchOnWindowFocus` und/oder Supabase
  `onAuthStateChange` setzt bei Fokus eine neue Session). 1.2.24 scheiterte, weil das
  ruecksetzende Re-Render nach dem `visibilitychange`-Anstrich kommt und ihn ueberschreibt.
  Fix: `dangerouslySetInnerHTML` entfernt; die SVG wird in einem `useLayoutEffect` einmalig
  imperativ eingebettet (nur wenn noch kein `<svg>` vorhanden), danach `apply()`. React
  verwaltet den Teilbaum damit nie -> kein Re-Render kann ihn ruecksetzen; `apply()` streicht
  weiterhin bei echten Werte-Aenderungen neu. `visibilitychange`-Listener entfernt
  (ueberfluessig). Im selben Testaufbau gegengeprueft: uebersteht Re-Renders (Zuschnitt +
  Farben bleiben). Betrifft beide Nutzungen (Koerper Muskelkater, Uebungs-Detail
  Beteiligung). Keine Aenderung an Daten oder SVG-Datei. Validiert: vite build, tsc
  --noEmit, vitest 309/309 gruen.
- 2026-06-26 - Bugfix Muskelkarte: Anstrich bei Tab-Rueckkehr, Version 1.2.24: Die
  `MuscleMap` (`src/components/ui/muscle-map.tsx`) bettet die SVG einmal per
  `dangerouslySetInnerHTML` ein und setzt Zuschnitt (viewBox-Crop) + Einfaerbung danach
  per Effekt direkt auf den nicht von React verwalteten SVG-Teilbaum. Beim Verlassen und
  Zurueckkehren eines Browser-Tabs fiel die SVG auf ihren rohen Einbett-Zustand zurueck
  (volle Master-viewBox -> wirkt runterskaliert; neutrales Grau ohne Region-Einfaerbung).
  Da sich die Werte-Map dabei nicht aenderte, lief der Effekt nicht erneut; der Anstrich
  fehlte bis zum naechsten Seitenwechsel (Remount erzwang frischen Lauf). Fix: Paint-Logik
  in eine idempotente `apply()`-Funktion gefasst, die zusaetzlich bei
  `visibilitychange` (Tab wieder sichtbar) erneut laeuft - greift einmal je
  Sichtbar-Wechsel, Listener wird im Cleanup entfernt, Effekt-Deps unveraendert. Betrifft
  beide Nutzungen (Koerper-Seite Muskelkater, Uebungs-Detail Beteiligung). Keine Aenderung
  an Daten oder SVG. Validiert: vite build, tsc --noEmit, vitest 309/309 gruen.
- 2026-06-26 - Muskelkarte: ueberarbeitete Master-SVG, Version 1.2.23: Neue Fassung von
  `src/assets/body-muscles.svg` (vom Nutzer in Illustrator bearbeitet). Aenderung rein
  geometrisch: die Rueckenansicht-Silhouette wurde von sechs getrennten Pfaden
  (`body_x5F_01..06`) auf eine zusammengefasste Flaeche reduziert, dazu kleinere
  Punktverschiebungen in anderen Pfaden. Vor dem Austausch geprueft und bestaetigt:
  `viewBox` unveraendert (`0 0 1338.2 1473`, sonst saessen die festen Crop-Werte in
  `muscle-map.tsx` daneben), valides XML, alle Gruppen-IDs identisch, alle 14 Regionen der
  Registry (`src/lib/muscles.ts`) weiterhin per `id` vorhanden. Die entfallenen
  `body_x5F_*`-IDs nutzt die App nicht einzeln - sie braucht nur die Gruppe
  `silhouette_back`, die zusammengefasste Flaeche liegt weiterhin darin und wird wie zuvor
  zum Basis-Grauton neutralisiert. Keine Code-Aenderung. Validiert: vite build, tsc
  --noEmit, vitest (alle gruen).
- 2026-06-25 - Vorlagen-Waehler: Journey als Kurve statt Phasen-Chips, Version 1.2.22: Im
  Vorlagen-Waehler (`src/routes/journey_.waehlen.tsx`) zeigt jede Karte jetzt die komplette
  Periodisierungskurve der Journey statt der bisherigen Phasen-Schlagwort-Chips - Volumen +
  Intensitaet ueber alle Wochen, Phasen als Baender mit Namen, Deload-Wochen orange. Ohne
  "jetzt"-Marker, da es im Waehler keine aktuelle Woche gibt. Wiederverwendung statt Dublette:
  `PeriodizationChart` bekam die Prop `showNow` (Default true = Journey-Seite unveraendert);
  bei `false` entfaellt der offene Ring + "jetzt"-Tooltip, und es wird nicht mehr auf die
  aktuelle Woche zentriert (Kurve startet links bei Woche 1, bleibt aber bei langen Journeys
  seitlich scrollbar - auf Handy und Desktop). Die Kurvendaten je Vorlage entstehen aus
  denselben Bausteinen wie die aktive Journey-Kurve: Vorlagen-Phasen -> `JourneyPhaseInput`
  -> `buildPeriodization` (Gesamtwoche 1, da ohne Marker bedeutungslos). `TemplateCard` traegt
  die Kurve ueber die neue Prop `periodization`; `phaseNames` aus dem Karten-Modell entfernt.
  Der Waehler ist nun einspaltig ueber die volle Breite (vorher Desktop zweispaltig). Bewusst
  unberuehrt: Name, Dauer-Pille, Tagline, "Fuer", Zusammenfassung, Startknopf; die Journey-
  Seite selbst (`journey.tsx`) zeigt die Kurve weiter mit "jetzt"-Marker. Validiert: tsc ohne
  Fehler, Build durch (SW erzeugt, changelog.json nicht precached), Tests gruen. Betroffen
  ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Yoga-Akzent von Lila auf Gruen, Version 1.2.21: Wie zuvor bei Skill, jetzt
  fuer Yoga. Token `--yoga` (`#8478c9` Lila) faerbte das Yoga-Eingabe-Pop-up
  (`YogaEntryModal`: `border-yoga`/`bg-yoga` Auswahlfelder, Speichern-Knopf), den Switch-Ton
  „yoga“, den Yoga-Punkt in `SessionLogCard` und `verlauf.tsx`. Beide Tokens in `src/index.css`
  auf Gruen gesetzt: `--yoga` -> `#0c9d77` (= Akzent), `--yoga-foreground` -> `#0a7d5e`. Eine
  Stelle, alle Yoga-Elemente; Token bleibt als Schalter erhalten. Damit ziehen Kraft, Skill,
  Yoga vorerst am selben Akzent; eine spaetere bewusste Abgrenzung der drei Trainingsarten
  (Idee: eigene Symbole, Kraft hat heute das Blitz-Symbol) ist offen und noch nicht entschieden.
  Bewusst unberuehrt: `--intensity` (Journey-Chart-Teal). Validiert: tsc ohne Fehler, Build
  durch (SW erzeugt), 309 Tests gruen. Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Skill-Akzent von Blau auf Gruen, Version 1.2.20: Die Skill-Seite war ueber
  das Token `--skill` (`#5b9bd6` Blau) durchgaengig blau eingefaerbt (Switch-Ton „skill“,
  SkillPhaseList „Du bist hier“/aktuelle und erledigte Phase, SkillCard-Pille „Gemeistert“,
  LivePanel/StartModal-Rand, SessionLogCard-Punkt, verlauf.tsx, ExerciseEditModal). Das brach
  den Akzent-Look. Beide Skill-Tokens in `src/index.css` auf Gruen gesetzt: `--skill` ->
  `#0c9d77` (= Akzent/`--primary`), `--skill-foreground` -> `#0a7d5e` (dunkleres Gruen, lesbar
  auf den hellen `bg-skill/10..20`-Toenungen). Eine zentrale Stelle, alle Skill-Elemente in
  einem Zug; Token bleibt als Schalter erhalten fuer eine spaetere bewusste Skill/Yoga/Kraft-
  Abgrenzung. Bewusst unberuehrt: `--intensity` (Journey-Chart-Teal) und `--yoga` (Lila).
  Validiert: tsc ohne Fehler, Build durch (SW erzeugt), 309 Tests gruen. Betroffen ausserdem
  `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Journey-Kurve zentriert auf „jetzt“ (Handy), Version 1.2.19: Die
  Periodisierungskurve startete bei langen Journeys auf dem Handy ganz links bei Woche 1;
  der „jetzt“-Punkt lag oft ausserhalb des Bilds. Das gemeinsame Chart-Fundament
  (`src/components/ui/chart.tsx`, `ChartCanvas`) bekam eine optionale Prop `focusFraction`
  (Anteil 0..1 der inneren Plotbreite). Ist die Grafik breiter als der Rahmen, scrollt ein
  eigener Effekt nach dem Zeichnen sanft (`behavior: "smooth"`) so, dass dieser Punkt mittig
  sitzt, geklemmt auf `[0, overflow]` (Rand statt Leerraum). Der Effekt haengt an Breite,
  `minInnerWidth` und `focusFraction`, nicht am Scroll-Event – manuelles Scrollen wird also
  nicht zurueckgesetzt; passt alles ins Bild (Desktop), passiert nichts. `PeriodizationChart`
  meldet `focusFraction={(curG + 0.5) / N}` (Domain hat je eine halbe Woche Rand). Wiederver-
  wendbar fuer den spaeteren Uebungs-Verlaufschart. Validiert: tsc ohne Fehler, Build durch
  (SW erzeugt), 309 Tests gruen. Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Deploy-Workflow gehaertet (kein Versionssprung): `1.2.17` war im Code fertig
  und der Build gruen, aber der reine Pages-Veroeffentlichungs-Schritt (`actions/deploy-pages`)
  scheiterte transient, weil viele Deploys dicht hintereinander liefen und sich stauten
  (`concurrency: cancel-in-progress: false`). Folge: Live blieb 1.2.16 stehen, obwohl der Code
  weiter war. Behoben: `cancel-in-progress: true` in `.github/workflows/deploy.yml` - ein neuer
  Push bricht einen ueberholten, noch laufenden Deploy ab, statt ihn zu stapeln. 1.2.18 (Run
  145) ist erfolgreich deployed und enthaelt die 1.2.17-Aenderungen mit; der fehlgeschlagene
  1.2.17-Deploy ist damit geheilt. Reine CI-Aenderung, kein App-Code, keine neue Version
  (Redeploy von identischem dist -> kein neuer Service Worker, kein Update-Hinweis). Betroffen:
  `.github/workflows/deploy.yml`, `PLAN.md`.

- 2026-06-24 - Bugfix Update-Uebernahme (robuster), Version 1.2.18: Der bei 1.2.11
  eingefuehrte feste Reload nach 1,2 s in `applyUpdate` (`src/lib/pwaUpdate.ts`) konnte auf der
  installierten PWA (vor allem iOS) ZU FRUEH zuschlagen - die Seite lud neu, bevor der neue
  Service Worker aktiv war, der alte Stand kam zurueck und der Update-Hinweis erschien erneut
  (Symptom: Hinweis bleibt). `applyUpdate` laedt jetzt bei `controllerchange` neu (zuverlaessiges
  Signal, dass die neue Huelle die Kontrolle hat); eine grosszuegige 5-s-Frist dient nur noch
  als allerletzte Notreserve, falls das Signal ganz ausbleibt. Mehrfach-Reload ist durch ein
  `applying`-Flag und `{ once: true }` abgesichert. Notbremse „App zuruecksetzen" (Einstellungen
  -> Daten · Sicherung) bleibt der Ausweg fuer einen echten Haenger. Hinweis: greift erst ab der
  naechsten Uebernahme. Reine Update-Mechanik, keine Datenlogik beruehrt. Validiert: tsc ohne
  Fehler, Build durch (SW erzeugt), 309 Tests gruen. Betroffen ausserdem `public/changelog.json`,
  `PLAN.md`.

- 2026-06-24 - Verlauf-Feinschliff Dauer-Zeile, Version 1.2.17: In der aufgeklappten Einheit
  (`SessionLogCard`) stand die Dauer als links/rechts gespreizte Zeile (Label links, Wert
  rechtsbuendig), waehrend die Uebungen als linksbuendiger Block (fette Ueberschrift + Bullets)
  stehen. Die Dauer nutzt jetzt dasselbe Block-Layout: Ueberschrift „Dauer" und der Wert als
  Bullet darunter - ruhiger und konsistent. Reine Layout-Aenderung. Validiert: tsc ohne Fehler,
  Build durch, 309 Tests gruen. Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Verlauf: Einheit bearbeiten, Bauschritt 2c (Yoga) + Abschluss, Version 1.2.16:
  Auch Yoga-Einheiten lassen sich jetzt im Verlauf bearbeiten - das Panel zeigt fuer Yoga kein
  Satz-Block, sondern das Dauer-Feld (Minuten) und ein Notizfeld (sessions.notes; die Notiz war
  in der App bisher nirgends eingebbar). Neuer reiner Builder `buildYogaEditPayload`
  (in `editSession.ts`); die Edit-Mutation `editMutation.ts` schreibt das Einheit-Update jetzt
  generisch (duration_sec ODER minutes + notes, je nach gesetzten Feldern). `useEditSession` um
  `saveYoga` erweitert. `SessionEditPanel` um die Yoga-Variante des typdiskriminierten Entwurfs
  ergaenzt (Notiz-Textarea statt Karten); editierbar-Pruefung yoga-tauglich (Yoga immer
  bearbeitbar). `SessionLogCard`: Bearbeiten-Knopf nun auch fuer Yoga. Damit ist Schritt 2
  (Einheit bearbeiten) ueber alle Typen abgeschlossen und das Vorhaben nach Abgeschlossene
  Vorhaben verschoben. Validiert: tsc ohne Fehler, Build durch (SW erzeugt, changelog.json
  nicht precached), 309 Tests gruen (2 neue in `editSession.test.ts`). Betroffen ausserdem
  `src/components/history/SessionLogCard.tsx`, `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Verlauf: Einheit bearbeiten, Bauschritt 2b (Skill), Version 1.2.15: Auch
  Skill-Einheiten lassen sich jetzt im Verlauf korrigieren. Der „Bearbeiten"-Knopf erscheint
  nun auch fuer Skill-Einheiten (`SessionLogCard`). Die Skill-Live-Karte `SkillLiveCard` bekam
  einen `editMode` (Default false, Live-Look unveraendert): Stoppuhr und Haken-Spalte fallen
  weg, das Ergebnis wird – auch bei Haltezeit – ueber ein einfaches `LiveNumberInput` getippt,
  dazu „+/- Satz". Das `SessionEditPanel` ist auf einen typdiskriminierten Entwurf
  (strength|skill) umgebaut und rendert je nach Typ `ExerciseLiveCard` oder `SkillLiveCard`;
  fuer Skill liefert `useSkills` das Phasen-Ziel (ueber `skill_id` + `skill_phase` + Position)
  fuer Anzeige und met-Bewertung. Zurueckschreiben ueber den neuen reinen Builder
  `buildSkillEditPayload` (in `editSession.ts`) und die bestehende offline-feste Edit-Mutation:
  je Uebung die work-Saetze neu schreiben (Wert in reps bzw. duration_sec je Metrik, met gegen
  das Phasen-Ziel), Dauer optional. Bewusste Entscheidung (mit Nutzer abgestimmt): der
  Phasen-Fortschritt (`skill_progress`) wird NICHT rueckwirkend nachgezogen – eine Korrektur
  verschiebt die Skill-Phase nicht, sie berichtigt nur den Eintrag (der frueher offene
  Klaerpunkt aus dem Konzept ist damit entschieden). `useEditSession` um `saveSkill` erweitert.
  Validiert: tsc ohne Fehler, Build durch (SW erzeugt, changelog.json nicht precached), 307
  Tests gruen (4 neue in `editSession.test.ts`). Betroffen ausserdem
  `src/components/history/SessionLogCard.tsx`, `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Verlauf-Feinschliff, Version 1.2.14: Drei Anpassungen aus dem Live-Test.
  (1) Bearbeiten-Panel zeigt im Kopf jetzt den Namen der Einheit (Overlay-`title`) und das
  Datum (`headerTrailing`), dazu eine kleine Eyebrow „Einheit bearbeiten" – `verlauf.tsx`
  reicht Titel/Datum aus dem bereits gebauten `HistorySession` ans `SessionEditPanel` durch.
  (2) In der aufgeklappten Verlaufs-Karte (`SessionLogCard`) sind Bearbeiten/Loeschen von
  Text-Links auf rechtsbuendige Icon-Knoepfe umgestellt (Stift in `bg-primary/10`, Papierkorb
  in `bg-danger/10`, je 36px, mit aria-label/title). (3) Desktop-Layout der Verlaufsseite
  getauscht: Liste links, Kalender rechts (Grid `1fr_1.35fr` statt `1.35fr_1fr`, Reihenfolge
  der beiden Spalten vertauscht); Mobile-Umschalter unveraendert. Reine UI/Layout-Aenderungen,
  kein Datenfluss/Schema beruehrt. Validiert: tsc ohne Fehler, Build durch, 303 Tests gruen.
  Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Bugfix Bearbeiten-Panel Erstoeffnung, Version 1.2.13: Beim ersten Oeffnen von
  „Bearbeiten" griff das Panel kurz auf den im Gerät zwischengespeicherten Verlauf zu, der aus
  der Zeit vor 1.2.12 noch ohne die session_exercises-Kennung (`sessionExerciseId`) vorlag -
  dadurch baute der Entwurf 0 Uebungen und zeigte „lässt sich nicht bearbeiten", bis der
  Verlauf frisch nachgeladen war. In `SessionEditPanel.tsx` die Entwurfslogik umgestellt:
  statt einmalig (`loadedFor`) wird der Entwurf nun bei jeder frischen Datenlieferung neu
  aufgebaut, SOLANGE der Nutzer nichts geaendert hat (neues `dirty`-Flag; jede Aenderung setzt
  es). So aktualisiert sich das Panel von selbst, sobald die frischen Daten da sind, ohne
  laufende Eingaben zu ueberschreiben. Zusaetzlich zeigt es waehrend des Nachladens (`isFetching`)
  den Ladehinweis statt vorschnell „nicht bearbeitbar". Reine Lade-/Zustandskorrektur, kein
  Datenfluss/Schema veraendert. Validiert: tsc ohne Fehler, Build durch, 303 Tests gruen.
  Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Verlauf: Einheit bearbeiten, Bauschritt 2a (Kraft), Version 1.2.12: Eine
  abgeschlossene Krafteinheit laesst sich im Verlauf nachtraeglich korrigieren. In der
  aufgeklappten Verlaufs-Karte (`SessionLogCard`) steht neben „Eintrag loeschen" jetzt ein
  „Bearbeiten"-Knopf (nur fuer Kraft/Abweichung). Er oeffnet das neue `SessionEditPanel`
  (`src/components/history/`) auf dem bestehenden `Overlay` (Desktop zentriert, Mobile
  Bodenblatt). Kernpunkt Wiederverwendung: die Live-Karte `ExerciseLiveCard` bekam einen
  `editMode` (Default false, Live-Look unveraendert), der Stange/Scheiben/Haken-Spalte/
  Aufwaermsaetze abschaltet und die Haken-Spalte aus dem Grid nimmt – Wdh/kg/RIR ueber das
  fokus-erhaltende `LiveNumberInput` sowie „+/- Satz" bleiben. Neuer Satz uebernimmt die
  Werte des letzten Satzes (wie live). Zurueckschreiben offline-fest nach dem Muster des
  Live-Speicherns: reine Builder-Logik `src/lib/editSession.ts` (verdichtet Dauer + korrigierte
  Arbeitssaetze, berechnet tested_1rm und – nur bei der juengsten Einheit der Uebung – das
  Coach-Update), registrierte Mutation `src/lib/editMutation.ts` (work-Saetze je Uebung
  ersetzen, Aufwaermsaetze unberuehrt; in `queryClient.ts` registriert, ueberlebt Neustart),
  Hook `src/hooks/useEditSession.ts` (ermittelt „nur juengste" und 1RM-Tracking). Coach zieht
  still nach (kein extra Hinweis); Aufwaermsaetze und das Datum bleiben unberuehrt, anpassbar
  ist nur die Dauer. `useSessionsDetailed` holt jetzt zusaetzlich `session_exercises.id`
  (fuer das Neuschreiben); `history.ts` traegt das optionale `sessionExerciseId`. Skill (2b)
  und Yoga (2c) folgen. Validiert: tsc ohne Fehler, Build durch (SW erzeugt, changelog.json
  nicht precached), 303 Tests gruen (neuer Test `src/lib/__tests__/editSession.test.ts`).
  Betroffen ausserdem `src/components/history/SessionLogCard.tsx`, `src/routes/verlauf.tsx`,
  `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Konten per Einladung im Supabase-Dashboard scharfgeschaltet (kein Code, keine
  Auslieferung): Im Projekt kraftschmiede-v2 (eu-west-1) unter Authentication die offene
  Selbstregistrierung abgeschaltet („Allow new users to sign up" aus); unter URL Configuration
  die Site URL auf `https://miklantis.github.io/Kraftschmiede/?einladung` und die
  Redirect-Liste auf `https://miklantis.github.io/Kraftschmiede/**` gesetzt. Damit wird der
  Link aus der Einladungs-Mail in der App als Einladung erkannt (Marker `?einladung`) und der
  „Passwort festlegen"-Screen erscheint. Bestehende Konten melden sich normal an, Einladen
  ueber das Dashboard bleibt moeglich; „Confirm email" bewusst an gelassen (bei Einladungen
  durch den Link-Klick ohnehin bestaetigt). Der unter 1.2.0 vermerkte offene Dashboard-Schritt
  ist damit erledigt. Betroffen: nur Supabase-Dashboard-Einstellungen; `PLAN.md` (Doku).
  changelog.json unberuehrt.

- 2026-06-24 - Konzept „Einheit bearbeiten" dokumentiert (Schritt 2 des Verlauf-Vorhabens):
  neues Dokument `docs/Konzept-Einheit-bearbeiten.md` mit dem abgestimmten Vorhaben
  (Einstieg ueber „Bearbeiten"-Knopf, Wiederverwendung der Live-Karten per Bearbeiten-Modus,
  offline-festes Zurueckschreiben, Coach-Nachziehen nur bei der juengsten Einheit, Bauschritte
  2a/2b/2c). In `PLAN.md` Schritt 2 als To-do mit den drei Bauschritten ausformuliert und auf
  das Konzept verwiesen; Quellen-Liste ergaenzt; stehengebliebene Versionsangabe im PWA-Bullet
  bereinigt. Reine Doku, kein Code, keine Auslieferung (changelog.json unberuehrt). Noch nicht
  umgesetzt – Bau erst nach Freigabe. Betroffen: neue Datei `docs/Konzept-Einheit-bearbeiten.md`,
  `PLAN.md`.

- 2026-06-24 - Bugfix Update-Uebernahme, Version 1.2.11: „Aktualisieren\" im
  WhatsNewSheet liess das Popup gelegentlich offen stehen (vor allem installierte PWA auf
  iOS), obwohl die neue Huelle bereits aktiv war - der automatische Reload nach dem
  Controllerwechsel blieb dort aus. Zwei Korrekturen: (1) `applyUpdate` in
  `src/lib/pwaUpdate.ts` laedt nach kurzer Frist (1200 ms) selbst neu, falls der
  automatische Reload ausbleibt; greift der automatische zuerst, ist die Seite da schon
  weg. (2) Die beiden Aufrufer (`UpdateBanner`, `AppVersionCard`) schliessen das Popup
  beim Tippen sofort, damit die Reaktion sichtbar ist. Logik „kein Hinweis waehrend
  laufender Einheit" und die Notbremse unberuehrt. Hinweis: greift erst ab der naechsten
  Uebernahme - das Aktivieren von 1.2.11 selbst laeuft noch ueber den alten Stand.
  Validiert: tsc ohne Fehler, Build durch (SW erzeugt), 298 Tests gruen. Betroffen
  ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Verlauf: Saetze auf eigene Zeilen (Schritt-1-Nachschliff), Version 1.2.10:
  In einer langen Zeile wurden bei vielen Saetzen die Angaben zu gedraengt. Das
  Detail-Modell in `src/lib/history.ts` von `info: string` auf `lines: string[]`
  umgestellt (Helfer `strengthLines`/`skillLines` liefern je Arbeitssatz einen Eintrag);
  `SessionLogCard.tsx` rendert je Uebung einen fetten Kopf (Name) und darunter die Saetze
  als Bullet-Liste (dezenter gruener Punkt, Mono-Werte). Yoga-Notiz bleibt eine Zeile.
  Reine Anzeige/Layout, Datenmodell und Hooks unberuehrt. `history.test.ts` auf das
  Array-Modell umgestellt. Validiert: tsc ohne Fehler, Build durch, 298 Tests gruen.
  Betroffen ausserdem `public/changelog.json`, `PLAN.md`.

- 2026-06-24 - Verlauf satzweise (Schritt 1), Version 1.2.9: Die aufgeklappte Einheit
  zeigt nicht mehr „schwerstes Gewicht + gemischte Wdh-Liste", sondern jeden Arbeitssatz
  einzeln. In `src/lib/history.ts` `strengthInfo`/`skillInfo` umgestellt: Kraft je Satz
  „<Wdh> × <kg> kg" (Eigengewicht ohne kg nur „<Wdh> Wdh"), Skill je Satz Haltezeit
  „<s> s" bzw. „<Wdh> Wdh", jeweils Saetze per Komma getrennt; neuer Helfer `scoreTag`
  haengt den Anstrengungs-Score je Satz an („· S3"), nur wo vorhanden (Kraft-Arbeitssaetze;
  Skill/Yoga ohne). Reine Anzeige, Datenmodell und Karten-Layout (`SessionLogCard`)
  unveraendert. Tests in `history.test.ts` auf das neue Format umgestellt und ein
  Score-Fall ergaenzt. Validiert: tsc ohne Fehler, Build durch, 298 Tests gruen. Betroffen
  ausserdem `public/changelog.json`, `PLAN.md`. Schritt 2 (Bearbeiten-Panel) bleibt offen.

- 2026-06-24 - Hochformat bevorzugen, Version 1.2.8: `"orientation": "portrait"` ins
  `public/site.webmanifest` ergaenzt. Greift bei installierten PWAs auf Android; iOS/Safari
  ignoriert die Manifest-Orientierung bekanntlich, dort bleibt die iOS-Hochformatsperre der
  zuverlaessige Weg (so auch im Changelog vermerkt). Reine Manifest-Angabe, kein Code, kein
  Layout geaendert. Validiert: JSON gueltig, tsc ohne Fehler, Build durch (Manifest im
  dist), 297 Tests gruen. Betroffen ausserdem `public/changelog.json`.

- 2026-06-24 - Eigenes Ziel-Signal beim Skill-Halte-Timer, Version 1.2.7: Bisher kam beim
  Erreichen der Zieldauer derselbe Doppelpiep wie am Countdown-Start (`playBeep`), klanglich
  nicht unterscheidbar. Im Audio-Baustein (`src/lib/liveAudio.ts`) drei Funktionen ergaenzt:
  `playGoal` (aufsteigender Erfolgs-Dreiklang C6-E6-G6, voller/laenger als der Start-Piep),
  `buzzGoal` (kraeftigeres Vibrationsmuster) und `goalTick` (leiser Tick je Bonus-Sekunde).
  In `SkillWatchValue.tsx` die Ziel-Stelle darauf umgestellt: beim Erreichen einmal
  `playGoal`+`buzzGoal`, danach pro weiterer voller Sekunde ueber dem Ziel ein `goalTick`.
  Start-Ton am Countdown-Ende unveraendert (`playBeep`). Alles folgt den bestehenden Ton-/
  Vibrations-Schaltern. Validiert: tsc ohne Fehler, Build durch, 297 Tests gruen. Betroffen
  ausserdem `public/changelog.json`.

- 2026-06-24 - App-Version-Block mit Eyebrow, Version 1.2.6: Der `AppVersionCard` ganz
  unten in den Einstellungen stand als einzige Karte ohne `Section`-Eyebrow da, was eine
  Luecke erzeugte. In `src/routes/einstellungen.tsx` in eine `Section` mit Eyebrow „App\"
  gewickelt, analog zu allen anderen Bereichen. Reine Layout-Angleichung. Validiert: tsc
  ohne Fehler, Build durch, 297 Tests gruen. Betroffen ausserdem `public/changelog.json`.

- 2026-06-24 - Wachhalten-Erklaerzeile gekuerzt, Version 1.2.5: Untertext beim Schalter
  „Bildschirm wachhalten\" in `TimerSettings.tsx` auf „Nur im Training aktiv.\" gekuerzt.
  Reine Textaenderung. Validiert: tsc ohne Fehler, Build durch, 297 Tests gruen. Betroffen
  ausserdem `public/changelog.json`.

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
