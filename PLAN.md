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
- **Vorhaben „Workouts editierbar & Journey-Zuordnung" (Version 1.3) abgeschlossen.** Alle
  fuenf Lieferungen umgesetzt: Unterbau (1.3.0), Workouts-Seite lesend (1.3.1), Editor (1.3.2),
  Journey-Zuordnung per Schalter (1.3.6), Uebernahme beim Journey-Wechsel (1.3.7) und die
  Einschraenkung der Empfehlung auf die Zuordnung (1.3.10). Die Trainingsempfehlung bewertet
  jetzt nur noch die der aktiven Journey zugewiesenen Workouts; ohne nutzbare Zuweisung
  Rueckfall auf die ganze Bibliothek mit dezentem Hinweis, bei „alles heute ausgeschlossen"
  kein Rueckfall. Coach-Rechenkern unangetastet. Konzept:
  `docs/Konzept-Workouts-und-Journey-Zuordnung.md`.
- **Kein offenes Bau-Vorhaben.** Pflege/Bugfixing laufend; neue Features nach
  Konzept-vor-Code. Aktuelle Version: 1.3.10.
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

- Workouts editierbar & Journey-Zuordnung (Lieferungen 1-5, Versionen 1.3.0-1.3.10).
  Workouts sind ueber eine eigene Seite anleg-, bearbeit- und archivierbar; sie lassen sich
  der aktiven Journey per Schalter zuordnen (Uebernahme beim Journey-Wechsel), und die
  Trainingsempfehlung beschraenkt sich auf die Zuordnung (Rueckfall auf die ganze Bibliothek
  nur bei leerer/nicht nutzbarer Zuweisung, kein Rueckfall bei „alles heute ausgeschlossen“).
  Journey-Faehigkeit = mind. eine strength-Uebung; Rolle nur Ordnungsraster;
  Coach-Rechenkern unangetastet. Konzept: `docs/Konzept-Workouts-und-Journey-Zuordnung.md`.

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

2026-07-01 — Workouts & Journey-Zuordnung, Lieferung 5 / Empfehlung auf die Zuordnung
einschraenken (Version 1.3.10). Die Trainingsempfehlung bewertet jetzt nur noch die der
aktiven Journey zugewiesenen Workouts. Neue reine Auswahlregel selectRecommendationTemplates
in lib/workouts.ts (keine aktive Journey -> ganze Bibliothek, nur aktive; aktive Journey mit
nutzbarer Zuweisung -> nur diese Teilmenge, kein Rueckfall auch wenn heute alles
ausgeschlossen; aktive Journey ohne nutzbare Zuweisung -> Rueckfall auf die ganze Bibliothek
mit Hinweis) mit fuenf Tests; „nutzbar“ = aktiv + journey-faehig + zugewiesen. useTrainingOverview
liest zusaetzlich useJourneyWorkouts, waehlt die Teilmenge und reicht nur diese an rankWorkouts
(Coach-Rechenkern unangetastet); neues Anzeigefeld libraryFallbackHint. routes/index.tsx zeigt
bei Rueckfall den dezenten Hinweis „Keine Workouts dieser Journey zugewiesen – Empfehlung aus
der ganzen Bibliothek“ unter dem Hero. Nebeneffekt-Korrektur: der Bibliotheks-Rueckfall
beruecksichtigt nur aktive Workouts (archivierte fielen vorher faelschlich mit ins Ranking).
Kein neues DB-Migrat. Damit ist Vorhaben 1.3 komplett. Validierung gruen: vite build,
tsc --noEmit, vitest run.

2026-07-01 — Bugfix-Nachzug: kaputter Cache-Stand verworfen + Absicherung (Version 1.3.9).
Der unter 1.3.8 behobene Set-Fehler hinterliess bei bereits geladenen Clients einen defekten
persistierten Eintrag ({} statt Array), der beim naechsten Start „object is not iterable"
(new Set({})) ausloeste, bevor der Refetch griff. CACHE_BUSTER v2 -> v3 (offline.ts) verwirft
den gespeicherten Cache einmalig. Zusaetzlich lesen JourneyWorkoutsSection und
useJourneyWorkoutActions den Wert defensiv (Array.isArray-Pruefung, sonst leere Liste), damit
kein unerwarteter Altwert mehr crasht. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-01 — Bugfix: Journey-Seite stuerzte nach Rehydrieren ab (Version 1.3.8).
useJourneyWorkouts legte die Zuordnung als Set im Query-Cache ab; der Offline-Persister
(createAsyncStoragePersister, JSON) macht daraus beim Speichern {}, sodass nach dem Laden
aus IndexedDB assignedQ.data.has kein Function mehr war („n.has is not a function",
ErrorBoundary auf /journey). Hook gibt jetzt ein string[] zurueck; die Konsumenten bilden
das Set lokal (JourneyWorkoutsSection: new Set(assignedQ.data) frisch je Render;
useJourneyWorkoutActions: optimistischer setQueryData nun auf Array). buildJourneyAssignment
und filterCopyableAssignments bleiben unveraendert (nehmen weiterhin ein frisch gebautes
Set). Reine Datenschicht-Korrektur, kein Verhalten geaendert. Validierung gruen: vite build,
tsc --noEmit, vitest run.

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

---

Ältere Einträge (vor 1.2.45) stehen im Archiv: `docs/archive/PLAN-Log-Archiv.md`.
Der nutzerverständliche Verlauf je Version liegt in `public/changelog.json`, die
getroffenen Entscheidungen und Betriebs-Lernpunkte in `docs/adr/`.
