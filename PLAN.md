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
  Konzept-vor-Code. Aktuelle Version: 1.3.12.
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

2026-07-01 — Journey-Chip als Icon statt Text (Version 1.3.12). Neuer wiederverwendbarer
`JourneyChip` (`src/components/ui/journey-chip.tsx`): zeigt das Journey-Karten-Icon (Lucide `Map`,
wie im Hauptmenue) als weiche gruene Toenung (`bg-primary/10`, Icon `#0a7d5e`, analog CoachStatusPill)
statt der bisherigen schwarzen Text-Pille. Ersetzt die Text-Chips „Journey“ (Trainingsseite,
„Weitere Workouts“) und „journey-faehig“ (Workouts-Seite); Bedeutung traegt der Seitenkontext,
aria-label/title bleiben sprechend. Rein optisch, ruhiger im UI.

2026-07-01 — „Weitere Workouts“ zeigt alle aktiven Workouts (Version 1.3.11). Verfeinerung der
Empfehlung: der Hero „Heute empfohlen“ kommt weiterhin aus der Journey-Zuweisung (Konzept 5.4),
aber die Liste „Weitere Workouts“ listet jetzt ALLE aktiven Workouts (ausser dem Hero), nach
Eignung sortiert, damit jedes frei startbar bleibt. Der aktiven Journey zugewiesene, nutzbare
Workouts (aktiv + journey-faehig) tragen dort einen Journey-Chip und ihren Score; nicht
zugewiesene erscheinen schlicht ohne Chip/Score. Die Kater=3-Startsperre (Ausschluss) gilt
unveraendert fuer alle Zeilen gleichermassen (Kater=2 bleibt wie bisher nur -2 auf den Score und
startbar). useTrainingOverview rankt jetzt alle aktiven Workouts und waehlt den Hero per
selectedIds daraus; neues Kartenfeld inJourney (aus assignedUsableIds). routes/index.tsx zeigt
Chip+Score nur bei inJourney. Coach-Rechenkern unangetastet, kein DB-Migrat. Validierung gruen:
vite build, tsc --noEmit, vitest run.

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

---

Ältere Einträge (vor 1.3) stehen im Archiv: `docs/archive/PLAN-Log-Archiv.md`.
Der nutzerverständliche Verlauf je Version liegt in `public/changelog.json`, die
getroffenen Entscheidungen und Betriebs-Lernpunkte in `docs/adr/`.
