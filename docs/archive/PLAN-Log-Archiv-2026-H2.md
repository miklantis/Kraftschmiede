# PLAN.md – Log-Archiv 2026 H2

Archivierter chronologischer Verlauf von Kraftschmiede, Juli bis Dezember 2026. Hierher wandern
Log-Eintraege aus `PLAN.md`, sobald ihr Vorhaben abgeschlossen ist. Der laufende Stand und
die letzten Eintraege stehen weiter in `PLAN.md`; der nutzerverstaendliche Verlauf in
`public/changelog.json`; die getroffenen Entscheidungen in `docs/adr/`.

Weitere Archiv-Zeitraeume: siehe `docs/archive/` (ein File je Halbjahr).

Eintraege bleiben historisch unveraendert, neueste zuerst.

---

2026-08-05 – 1.8.3 – Löschen eines 1RM-Tests fragt inline nach (Verlaufs-Muster).

2026-08-05 – 1.8.2 – Löschen des jüngsten 1RM-Tests nimmt den Rekord zurück.

2026-08-05 – 1.8.1 – Test-Punkte im 1RM-Diagramm, Lieferung 4.

2026-08-05 – 1.8.0 – 1RM-Tests als eigener Eintragstyp in Verlauf und Kalender,
Lieferung 3.

2026-08-05 – 1.7.4 – 1RM-Tests in Sicherung und Wiederherstellung, Lieferung 2
abgeschlossen.

2026-08-05 – 1.7.3 – 1RM-Test zeigt den aktuellen Wert ab Start.

2026-08-05 – 1.7.2 – 1RM-Test in die bestehende Live-Schicht umgebaut (dritte
Einheit-Art), Popup entfernt.

2026-08-05 – 1.7.1 – 1RM-Test als Live-Block mit Vorschau, Teil B von Lieferung 2.

2026-08-05 – 1.7.0 – 1RM-Block auf der Übungsseite, Tabelle rm_tests (Migration 0013),
Teil A von Lieferung 2.

2026-08-05 – 1.6.2 – 1RM als Rekord: Automatik hebt nur bei ≤ 5 Wdh, senkt nie
(Beenden + Bearbeiten), Lieferung 1 von vier.

2026-08-04 – Körper-Meilensteine in Backup/Restore + Mess-Ansicht gerätelokal (1.6.1).
`composition_milestones` in Export/Restore aufgenommen; die Mess-Ansicht merkt sich pro
Gerät Metrik und „Ziele"-Zustand. Coach unberührt.

2026-08-04 – Meilensteine pro Körpermetrik, Lieferung 1 (1.6.0). Neue Tabelle
`composition_milestones` (Migration 0012), Schema/Hooks, Section + Ziel-Linien im
Mess-Diagramm. Coach unberührt.

2026-08-02 – Ziele-Zustand angehefteter Kacheln gerätelokal gemerkt (1.5.5). Neuer Store
`usePinnedGoals` (localStorage), sonst wie zuvor. Nicht synchronisiert.

2026-08-02 – Ziel-Linien auf angehefteten Kacheln, Schritt 2 (1.5.4). Kachel in eigene
Komponente `PinnedChartTile` gezogen; „Ziele"-Toggle wie auf der Detailseite. Coach
unberührt.

2026-08-02 – Ziel-Linien im Übungs-Chart, Schritt 1 (1.5.3). `ExerciseChart` bekommt die
optionale Prop `milestoneLines`; Toggle „Ziele" im Detail-Chart. Rein additiv.

2026-08-02 – Meilensteine in Backup/Restore und Coach-Export (1.5.2). `exercise_milestones`
in Export/Restore; Coach-Export je Übung, dabei den veralteten `active`-Filter entfernt
(Bugfix: lieferte zuletzt keine Übungen mehr). Coach-Rechenkern unberührt.

2026-08-02 – Meilensteine unter das Diagramm verschoben (1.5.1). Rein optisch.

2026-08-02 – Meilensteine je Übung, Lieferung 1 (1.5.0). Neue Tabelle `exercise_milestones`
(Migration 0011), Schema/Hooks, wiederverwendbare Komponente „Fortschritt-zu-Ziel",
Section auf der Detailseite. Coach unberührt.

2026-07-13 - Label fuer Kurzhantel ergaenzt (Version 1.4.2, Bugfix). equipmentLabel in src/lib/labels.ts kannte 'dumbbell' nicht und fiel auf den rohen Schluessel zurueck (klein geschrieben) - jetzt "Kurzhantel". Nur Anzeige auf der Uebungs-Detailseite. Validierung gruen: vite build, tsc --noEmit, vitest run (374 Tests).

2026-07-13 - Uebungstyp Kurzhantel + Curl (Kurzhantel) (Version 1.4.1, Lieferung 2 von 3 des Vorhabens „Kurzhanteln“). Engine: neue reine Funktion nearestDumbbell in plates.ts (naechste vorhandene Stufe; bei Gleichstand die leichtere; roundDown fuers Abrunden). progression.ts bekommt SuggestOpts.dumbbells - ist die Liste gesetzt, snappt der ld-Helper auf Kurzhantel-Stufen statt nearestLoadable; Entscheidungslogik (auf/halten/senken, Fresh-Sets) unveraendert. coach.ts: equipment-Union +dumbbell, SuggestBuildCtx/SuggestWithBarInput +dumbbells, eigener dumbbell-Zweig in suggestWithBar (keine Stange, bar=null). Durchgereicht ueber liveBuild (LiveBuildInput.dumbbells) und beide Hooks (useLiveBuilder, useCoachStatuses); Schema-Enum und liveSession-Union erweitert. Migration 0010: equipment-CHECK um dumbbell erweitert, Uebung „Curl (Kurzhantel)“ je Nutzer mit vorhandener „Barbell Curl“ angelegt (equipment=dumbbell, work_weight 10 je Hand, in der App anpassbar), Muskel-Map von der Langhantel-Curl uebernommen; idempotent. Warmup bleibt bei Nicht-Langhantel leer (korrekt fuer Isolation). Neue Tests: nearestDumbbell (5) + Kurzhantel-Progression (3); drei bestehende Tests um dumbbells ergaenzt. Offene DB-Schritte: 0009 und 0010 im Supabase-Editor ausfuehren. Lieferung 3 (Tausch in Workout E) macht der Nutzer im Editor. Validierung gruen: vite build, tsc --noEmit, vitest run (374 Tests).

2026-07-13 - Kurzhantel-Inventar (Version 1.4.0, Lieferung 1 von 3 des Vorhabens „Kurzhanteln“). Neue Inventar-Kategorie inventory_dumbbells (festes Gewicht je Stueck, je Hand) nach dem Kettlebell-Muster: Migration 0009 (Tabelle + RLS + Grants + Seed 2-30 kg in 2er-Schritten fuer Nutzer mit vorhandenem Inventar, idempotent), Zod-Schema (inventoryDumbbellRow/Insert), Query-Hook useDumbbells, Aktionen addDumbbell/deleteDumbbell in useInventoryActions, Komponente InventoryDumbbells + Abschnitt in einstellungen.tsx. Backup/Restore erweitert (exportSource, exportData RawExportData/KsExport, restoreData RestoreTables + Huellen-Schema, useRestore DELETE_/INSERT_ORDER), Schema-Version bleibt v3 (optionales Feld, alte Sicherungen spielen unveraendert ein). Drei Tests um das neue Feld ergaenzt. Coach/Plate-Loader unberuehrt (Uebungstyp folgt in Lieferung 2). Offener DB-Schritt: Migration 0009 im Supabase-Editor ausfuehren. Validierung gruen: vite build, tsc --noEmit, vitest run (366 Tests).

2026-07-09 - Versionsnummer im Fenstertitel (Version 1.3.32). Ein kleines Vite-Plugin (appTitleVersion, transformIndexHtml) schreibt die neueste Version aus public/changelog.json schon beim Build in den <title>, sodass das App-Fenster "Kraftschmiede <Version>" zeigt - offline-fest und ohne Nachladen. Homescreen-/Installationsname (apple-mobile-web-app-title, Manifest) unveraendert "Kraftschmiede". Validierung gruen: vite build, tsc --noEmit, vitest run (366 Tests).

2026-07-08 — Festes Stangen-Set + Karten-Optik (Version 1.3.31). Die Stangen sind
jetzt ein abgeschlossener, nicht editierbarer Satz (Standard 20, Leicht 10, SZ 12,5,
SZ-Curl 8, Kurz 15); InventoryBars zeigt sie in einer Karte (SettingsGroup/SettingRow),
ohne Loeschen und ohne Hinzufuegen-Knoepfe. BAR_PRESETS raus (Olympia/Frauen weg), die
nun ungenutzten addBar/deleteBar aus useInventoryActions entfernt. Zugehoeriger
DB-Schritt: Migration 0008_stangen_festes_set.sql am 2026-07-08 im Supabase-Editor
ausgefuehrt (Success, keine Zeilen); uebernimmt bestehende Stangen per Gewicht (Referenzen bleiben) und legt
SZ-Curl/Kurz an. Coach/Plate-Loader unberuehrt. Validierung gruen: vite build,
tsc --noEmit, vitest run (366 Tests).

2026-07-08 — Aufwaerm-Standardart auf „Vario" (Version 1.3.30). Der vorbelegte
Cardio-Satz beim Start und ein neu angehaengter Aufwaermsatz starten jetzt mit
„vario" statt „bike" (liveBuild, useLiveSession); der tolerante Restore-Fallback
ebenso. Bestehende Saetze und die freie Auswahl der Art bleiben unberuehrt.
Validierung gruen: vite build, tsc --noEmit, vitest run (366 Tests).

2026-07-06 — Aktiv/Inaktiv-Aufräumen abgeschlossen: Migration 0007 zieht die Spalte
`exercises.active` (Schritt 2, kein Versionssprung).

2026-07-06 — Aktiv/Inaktiv bei Übungen entfernt, Schritt 1 Code (Version 1.3.29). Gruppe
„Inaktiv / Swaps“ raus, alle Übungen normal gruppiert und im Editor wählbar; `active` aus
Schema/Export getilgt, Restore toleriert Altbackups. Spaltenlöschung folgt als Schritt 2.

2026-07-02 — Hinweis am Workout-Start nennt die Befinden-Grundlage (Version 1.3.28).
StartModal: Ist fuer heute kein Koerperzustand erfasst, zeigt das Start-Banner
jetzt das Datum des Eintrags, mit dem der Coach rechnet (longDateShort), sonst
„neutral“. Bewusste Entscheidung dahinter: die Erholungs-Logik bleibt
unveraendert – der Coach nimmt weiterhin den letzten Eintrag ohne Zeit-Abklingen,
weil zwischen zwei Eintraegen Training liegen kann und ein nicht gemeldeter Kater
nicht erratbar ist; stattdessen nur Transparenz vor dem Start. Validierung gruen:
vite build, tsc --noEmit, vitest run.

2026-07-02 — Seiteninhalt auf Desktop tiefer gesetzt (Version 1.3.27).
AppShell: min-[960px] Top-Abstand des Inhalts von pt-10 auf pt-20 erhoeht, damit
Titel und Inhalt unterhalb der oberen Kante beginnen; der Titel-Oberrand fluchtet
mit dem Beginn der Sidebar-Navigation. Nur Desktop; Handy-Ansicht (pt-[22px])
unberuehrt. PageHeader unveraendert. Rein optisch. Validierung gruen: vite build,
tsc --noEmit, vitest run.

2026-07-02 — Datumszeile auf der Trainingsseite entfernt (Version 1.3.26).
routes/index.tsx: PageHeader ohne date-Prop, weil der Kalender im Verlauf das Datum bereits zeigt und die Zeile ueber dem Titel redundant war. PageHeader (date optional) und useTrainingOverview unveraendert. Rein optisch. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-02 — Fokus-Chip aus den Journey-Phasen entfernt (Version 1.3.25).
PhaseList: der Chip oben rechts (p.focus) faellt in Desktop-Raster und Mobile-Liste weg, weil er bei sprechenden Phasennamen den Namen doppelt. Statuspunkt bleibt, Layout entsprechend vereinfacht (Desktop: mb-3 statt flex justify-between). PhaseView.focus bleibt im Datenmodell, nur nicht mehr gerendert. Rein optisch. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-02 — Innenpunkt fuer kuenftige Journey-Phasen (Version 1.3.24).
PhaseDot: der future-Zustand bekommt denselben weissen Innenpunkt (size-2.5 rounded-full bg-white) wie current, statt leerem Kreis; Farben unveraendert (#d8d8dc). Rein optisch, keine Logik. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-02 — Trainingsart-Symbole auf Skill-Karten und im Verlauf (Version 1.3.23).
SkillCard-Kopf bekommt vorne das Lucide Zap (dezent grau, size-5), einheitlich zu
den Listen. SessionLogCard: der Farbpunkt (DOT) ist durch das Typ-Symbol in der
Typfarbe ersetzt (ICON+TONE je HistoryKind) – WorkoutIcon/Zap/YogaIcon in
text-primary/skill/yoga, Abweichung als WorkoutIcon in text-deviation (Bernstein).
Ein Element statt Punkt plus Symbol. Rein optisch, keine Logik/Datenaenderung.
Validierung gruen: vite build, tsc --noEmit, vitest run (367 Tests).

2026-07-02 — Workout-Symbol in Navigation und Journey-Liste (Version 1.3.22).
Hauptnavigation: „Workouts“ nutzt statt ClipboardList jetzt das eigene WorkoutIcon
(Stoppuhr); NavEntry.icon auf ComponentType<{className?}> geweitet, damit neben
Lucide auch eigene Symbole passen. Journey-Seite: JourneyWorkoutsSection setzt in
jeder Zeile das WorkoutIcon als leading. Rein optisch, keine Logik. Validierung
gruen: vite build, tsc --noEmit, vitest run (367 Tests).

2026-07-02 — Trainingstyp-Symbole vor Listeneintraegen (Version 1.3.21).
Neue Listenzeilen-Option `leading` (dezent grau, 20px) plus zwei eigene Icons
(WorkoutIcon Stoppuhr, YogaIcon Figur) im System; Skills nutzen Lucide Zap.
Angewendet auf Workouts-Seite (aktiv + Archiv) und die drei Sektionen der
Trainingsseite (Weitere Workouts, Aktive Skills, Yoga). Empfehlungskarte und
Navigation bewusst unberuehrt. Validierung gruen: vite build, tsc --noEmit,
vitest run (367 Tests).

2026-07-02 — Ueberschrift „Aktive Journey" ausserhalb der Karte (Version 1.3.20).
Die Eyebrow „Aktive Journey" aus ActiveJourneyCard entfernt und in journey.tsx als
Section-Eyebrow ueber die Karte gesetzt – gleiche Optik wie „Periodisierung" und
„Phasen · Ablauf". Karte selbst (Name, Meta, Bearbeiten-Knopf) unveraendert.
Reiner Optik-Patch, keine Logik. Validierung gruen: vite build, tsc --noEmit,
vitest run (367 Tests).

2026-07-02 — Feinschliff Workout-Editor + Workouts-Uebersicht (Version 1.3.19).
Editor: Name-Feld etwas groesser (17px, medium); Uebungszeilen dezenter (Name 14px
medium statt 15px semibold, geringere Zeilenhoehe); die Journey-Faehigkeit erscheint
als ruhiger Hinweissatz statt als Chip. Workouts-Uebersicht: Knopf „Neues Workout"
von oben unter die Liste verschoben (Leer-Text und Kommentar angepasst). Reiner
Optik-/Text-Patch, keine Logikaenderung; JourneyChip in der Uebersicht unberuehrt.
Validierung gruen: vite build, tsc --noEmit, vitest run (367 Tests).

2026-07-02 — Uebungsreihenfolge im Workout-Editor per Drag-and-Drop (Version 1.3.18).
Die Auf/Ab-Pfeile je Uebung entfallen; stattdessen links ein Ziehgriff, mit dem die
Zeile an die gewuenschte Stelle gezogen wird (Maus und Touch, nur der Griff loest aus,
uebrige Flaeche scrollt weiter). Entfernen-Icon bleibt rechts. Neues wiederverwendbares
Primitive SortableList (Pointer-Events, ohne Zusatz-Bibliothek; gezogene Zeile hebt sich
ab, andere weichen aus, umgeordnet erst beim Loslassen). Engine: moveExercise (schrittweise)
durch reorderExercise(from, to) ersetzt, mit Tests; Hook moveUp/moveDown -> reorder.
Persistenz unveraendert (erst beim Speichern), Coach-Rechenkern unangetastet. Designsystem.md
um SortableList ergaenzt. Validierung gruen: vite build, tsc --noEmit, vitest run (367 Tests).

2026-07-02 — DB-Spalte template_exercises.role entfernt (Version 1.3.17). Migration
0006_template_exercises_drop_role.sql zieht die seit 1.3.16 funktionslose Rollen-Spalte
(die inline CHECK-Beschraenkung faellt mit weg; idempotent per drop column if exists).
MUSS im Supabase-SQL-Editor ausgefuehrt werden. Restore gegen Alt-Backups abgesichert:
restoreData.stripTemplateExerciseRow verwirft ein evtl. vorhandenes role-Feld beim
Einspielen (Muster wie migrateExerciseRow), mit Test. Architektur.md fortgeschrieben.
Kein App-Verhalten geaendert; Coach-Rechenkern unangetastet. Validierung gruen: vite build,
tsc --noEmit, vitest run (365 Tests).

2026-07-02 — Workout-Rolle entfernt, Antippen oeffnet direkt den Editor (Version 1.3.16).
Die Rollen-Einteilung je Uebung (Haupt/Assistenz/Core) ist raus – sie war reines Anzeigeraster
und wurde von Coach, Empfehlung, Aufwaermen und Live nie ausgewertet (geprueft). Schema
(templates.ts ohne templateRoleEnum/role), Datenzugriff (useTemplates ohne role), Regellogik
(workoutEditor ohne defaultRole/setRole; workouts.ts ohne ROLE_ORDER/LABELS und
buildWorkoutDetail), Speicherpfad (useTemplateActions/templateActions ohne role) und der Editor
(WorkoutEditor ohne Rollen-Dropdown, jetzt reine geordnete Uebungsliste) entsprechend
entschlackt. Die DB-Spalte template_exercises.role bleibt mit Default 'primary' zunaechst
liegen; mit Migration 0006 (Version 1.3.17) nachgezogen. Die lesende Detailseite (routes/workouts_.$templateId.tsx) und
useWorkoutDetail entfielen; Antippen eines Workouts in der Bibliothek fuehrt direkt in den
Editor, nach Speichern/Zurueck zurueck in die Bibliothek. Tests angepasst
(defaultRole/setRole/buildWorkoutDetail-Faelle entfernt). Coach-Rechenkern unangetastet.
Validierung gruen: vite build, tsc --noEmit, vitest run (364 Tests).

2026-07-01 — Journey-Chip an Journey-Block angeglichen (Version 1.3.15). In
src/components/ui/journey-chip.tsx die Toenung von bg-primary/10 auf bg-primary/12 und die
Icon-Farbe vom fest verdrahteten #0a7d5e auf text-primary (--primary, #0c9d77) umgestellt –
damit identisch zum Symbolfeld im JourneyStrip. Reiner Optik-Patch, keine Logikaenderung.

2026-07-01 — Hauptnavigation neu geordnet (Version 1.3.14). Reihenfolge in NAV_ENTRIES
(src/lib/nav.ts) angepasst: Training, Journey, Workouts, Skills, Uebungen, Koerper. Skills von
Position 6 auf 4 gezogen, Uebungen und Koerper je einen Platz nach hinten. Einzige Quelle, daher
greifen Sidebar (Desktop) und BottomNav (Mobile) automatisch. Labels und Routen unveraendert.

2026-07-01 — Skills immer aktiv, Aktiv-Schalter entfernt (Version 1.3.13). Der An/Aus-Schalter
je Skill auf der Skills-Seite ist weg; jeder Skill gilt dauerhaft als aktiv. SkillCard rendert
immer die aktive Darstellung (Phase, Zaehler, manuelle Aktionen Phase zurueck/Zuruecksetzen),
das Switch-Primitive bleibt (nur die Nutzung in der Skill-Karte faellt weg). useSkillsView:
Felder active/hasProgress raus, kein Pausiert-Zweig mehr. useSkillActions: activate/deactivate
entfernt, nur regress/reset bleiben. useTrainingOverview zeigt jetzt ALLE Skill-Definitionen
(gemergt mit Fortschritt, sonst Startwerte Phase 1) statt nur progress.filter(active). Luecke
geschlossen: da bisher „Aktivieren“ die skill_progress-Zeile anlegte, legt jetzt die erste
abgeschlossene Skill-Einheit sie an – SkillProgressWrite um isNew/userId/skillId erweitert,
HistoryStore.updateSkillProgress -> writeSkillProgress (Insert bei isNew mit active=true/log=[],
sonst Update), useFinishSkill baucht immer ein progressWrite. Kein DB-Migrat: die Spalte
skill_progress.active bleibt liegen und wird dauerhaft als „an“ behandelt (Insert setzt sie
true). Coach-Rechenkern unangetastet. Validierung gruen: vite build, tsc --noEmit, vitest run
(367 Tests).

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
