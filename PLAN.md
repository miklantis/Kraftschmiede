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
- **Vorhaben „Kurzhanteln (Dumbbells)“ (Version 1.4) in Arbeit.** Ziel: Curl-Uebungen von der
  Langhantel auf Kurzhanteln bringen (schont den rechten Ellbogen, loest die Links/Rechts-
  Asymmetrie). Konzept in drei Lieferungen: (1) Kurzhantel-Inventar, (2) Uebungstyp
  „Kurzhantel“ im Coach + neue Uebung „Curl (Kurzhantel)“, (3) Tausch in Workout E durch den
  Nutzer. **Lieferung 1 (1.4.0) umgesetzt:** eigene Kategorie `inventory_dumbbells` (Tabelle,
  RLS, Grants, Seed 2–30 kg in 2er-Schritten), Schema/Hook/Aktionen nach Kettlebell-Muster,
  Abschnitt „Inventar · Kurzhanteln · je Hand (kg)“ in den Einstellungen, plus Backup/Restore.
  **Lieferung 2 (1.4.1) umgesetzt:** Uebungstyp `dumbbell` im Rechenkern – reine Funktion
  `nearestDumbbell` (naechste vorhandene Stufe, bei Gleichstand die leichtere; beim Senken
  abgerundet, konservativ), zweiter Gewichtsweg in der Doppelprogression (Entscheidungslogik
  unveraendert), durchgereicht ueber `suggestWithBar`/`liveBuild`/`useLiveBuilder`/
  `useCoachStatuses`; equipment-Enum erweitert. Neue Uebung „Curl (Kurzhantel)“ per Migration
  0010 (Start 10 kg je Hand, in der App anpassbar), Muskel-Map von der Langhantel-Curl
  uebernommen. **Offene DB-Schritte:** Migration `0009_kurzhanteln_inventar.sql` und
  `0010_curl_kurzhantel.sql` im Supabase-SQL-Editor ausfuehren (0009 zuerst).
  **Lieferung 3 (durch den Nutzer):** im Workout-Editor in Workout E den bisherigen Curl gegen
  „Curl (Kurzhantel)“ tauschen.
- **Vorhaben „Meilensteine pro Uebung" in Arbeit.** Lieferung 1 (1.5.0) umgesetzt:
  je Gewichtsuebung eigene Meilensteine (Name + Ziel-1RM) auf der Detailseite anlegen,
  bearbeiten, loeschen; Fortschritt gegen das aktuelle geschaetzte 1RM (nur gelesen)
  mit Balken und kg-Abstand; automatisches „erreicht" mit Datum. Migration 0011
  ausgefuehrt. Lieferung 1b (1.5.2): Backup/Restore und Coach-Export decken die
  Meilensteine mit ab (im Coach-Export zusaetzlich der veraltete active-Filter
  entfernt). Coach-Rechenkern unberuehrt.
- **Vorhaben „Meilensteine pro Koerpermetrik" in Arbeit.** Analog zu den Uebungs-
  Meilensteinen kann der Nutzer je Mess-Metrik (Gewicht/Fett/Muskel/Wasser/Phasenwinkel)
  eigene, benannte Zielwerte anlegen. Bewusst schlank: reine Richtwerte ohne Erreicht-
  Logging und ohne Richtung; der Nutzen liegt in der Ziel-Linie im Mess-Diagramm. Lieferung 1
  (1.6.0) umgesetzt: Anlegen/Bearbeiten/Loeschen je Metrik plus „Ziele"-Umschalter im Chart.
  **Offener DB-Schritt:** Migration `0012_koerper_meilensteine.sql` im Supabase-SQL-Editor
  ausfuehren. Offen: Backup/Restore (Lieferung 1b).
- **Aktuelle Version: 1.6.0.** Pflege/Bugfixing laufend; neue Features nach Konzept-vor-Code.
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

### Meilensteine pro Uebung

Auf der Uebungs-Detailseite kann der Nutzer pro Uebung eigene Meilensteine
anlegen: Name + Ziel-1RM (kg). Mehrere je Uebung, editier- und loeschbar. Jeder
Meilenstein zeigt das aktuelle geschaetzte 1RM (`exercises.rm`, nur gelesen)
gegen das Ziel mit kleinem Fortschrittsbalken und dem Abstand in kg. Erreicht das
geschaetzte 1RM das Ziel, wird der Meilenstein automatisch als „erreicht" mit
Datum markiert und bleibt in der Historie. Keine Prognose, kein „wie lange noch".

Leitplanken: Coach-Rechenkern unberuehrt (Meilensteine lesen nur das vorhandene
1RM). Neue, wiederverwendbare Komponente „Fortschritt-zu-Ziel". DB-Migration
formuliert, ausgefuehrt vom Nutzer in Supabase.

**DB-Schritt erledigt:** Migration `0011_uebungs_meilensteine.sql` am 2026-08-02
im Supabase-SQL-Editor ausgefuehrt (Success, „No rows returned").

- [x] Lieferung 1 (Version 1.5.0): Anlegen/Bearbeiten/Loeschen auf der
      Uebungsseite, Fortschritt sehen, automatisches „erreicht" mit Datum.
      Migration 0011, Zod-Schema (`milestones.ts`), Query-Hook (`useMilestones`),
      Aktionen-Hook (`useMilestoneActions`), wiederverwendbare Komponente
      „Fortschritt-zu-Ziel" (`progress-to-goal.tsx`) und der Abschnitt
      „Meilensteine" auf der Detailseite mit Anlege-/Bearbeiten-Popup
      (`MilestonesSection`, `MilestoneEditModal`). Nur Gewichtsuebungen.
- [x] Lieferung 1b (Version 1.5.2): Backup/Restore um `exercise_milestones`
      erweitert; zusaetzlich im Coach-Export je Uebung ausgewiesen und dort der
      veraltete active-Filter entfernt (listete zuletzt keine Uebungen).
- [x] Ziel-Linien im Chart, Schritt 1 (Version 1.5.3): Toggle „Ziele" in der
      1RM-Ansicht des Detail-Charts; je Meilenstein eine dezente Waagerechte
      (erreichte gedimmt), Y-Achse dehnt sich fuer hoehere Ziele. Nur wenn die
      Uebung Ziele hat und Datenpunkte existieren. Umgesetzt in der vorhandenen
      ExerciseChart (optionale Prop `milestoneLines`, rein additiv) und der
      Chartkarte (liest Ziele ueber `useMilestones`).
- [x] Ziel-Linien im Chart, Schritt 2 (Version 1.5.4): dieselbe Anzeige auf den
      angehefteten Kacheln (Uebungsliste). Kachel in eigene Komponente
      `PinnedChartTile` gezogen (useMilestones je Kachel), Toggle nur bei
      1RM-Kacheln mit Zielen.
- [ ] Bewusst spaeter: Marker im Verlauf am Erreichen-Tag.
- [ ] Bewusst spaeter: automatische Vorschlaege aus der alten
      Excel-Bestwerte-Liste.

### Meilensteine pro Koerpermetrik

Auf der Koerper-Seite kann der Nutzer je Mess-Metrik (Gewicht, Koerperfett,
Muskelmasse, Koerperwasser, Phasenwinkel) eigene Meilensteine anlegen: Name +
Zielwert. Reine Richtwerte – kein Erreicht-Datum, keine Richtung. Nutzen: im
Mess-Diagramm laesst sich ueber „Ziele" je Ziel eine dezente Waagerechte ein-/
ausblenden, sodass sichtbar wird, wo ein Ziel liegt und wo der aktuelle Messwert
steht. Der Abschnitt folgt der gewaehlten Metrik (wie bei den Uebungen Chart und
Meilensteine dieselbe Uebung teilen).

Leitplanken: Coach-Rechenkern unberuehrt. Vorhandene Bausteine wiederverwendet
(Chart-Ziel-Linien nach dem Muster der ExerciseChart, Overlay/Input/Section).
DB-Migration formuliert, ausgefuehrt vom Nutzer in Supabase.

**DB-Schritt offen:** Migration `0012_koerper_meilensteine.sql` im Supabase-
SQL-Editor ausfuehren ("No rows returned").

- [x] Lieferung 1 (Version 1.6.0): Anlegen/Bearbeiten/Loeschen je Metrik auf der
      Koerper-Seite; „Ziele"-Umschalter im Mess-Diagramm zeichnet die Zielwerte
      der aktiven Metrik als Waagerechte. Migration 0012, Schema
      (`compositionMilestone*` in `milestones.ts`), Query-Hook
      (`useCompositionMilestones`), Aktionen-Hook (`useCompositionMilestoneActions`),
      `MetricMilestonesSection` + `MetricMilestoneEditModal`, `BodyMeasurePanel`
      (haelt die Metrik) und die additive Prop `milestoneLines` in `BodyMetricChart`.
- [ ] Lieferung 1b: Backup/Restore um `composition_milestones` erweitern.

---

## Abgeschlossene Vorhaben

Ueberblick der fertigen Vorhaben; der chronologische Verlauf steht im Log unten.

- Aktiv/Inaktiv bei Übungen entfernt (Schritt 1 Code 1.3.29, Schritt 2 Migration 0007).
  Das vestigiale `active`-Feld am Übungskatalog ist aus App und Datenbank getilgt: keine
  Gruppe „Inaktiv / Swaps“ mehr, alle Übungen normal gruppiert und im Workout-Editor
  wählbar, Coach-Status für alle. Export verwirft das Feld, Restore toleriert Altbackups.
  Coach-Rechenkern unberührt.

- Workouts editierbar & Journey-Zuordnung (Lieferungen 1-5, Versionen 1.3.0-1.3.10).
  Workouts sind ueber eine eigene Seite anleg-, bearbeit- und archivierbar; sie lassen sich
  der aktiven Journey per Schalter zuordnen (Uebernahme beim Journey-Wechsel), und die
  Trainingsempfehlung beschraenkt sich auf die Zuordnung (Rueckfall auf die ganze Bibliothek
  nur bei leerer/nicht nutzbarer Zuweisung, kein Rueckfall bei „alles heute ausgeschlossen“).
  Journey-Faehigkeit = mind. eine strength-Uebung;
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

2026-08-04 - Meilensteine pro Koerpermetrik, Lieferung 1 (Version 1.6.0, Vorhaben „Meilensteine pro Koerpermetrik"). Neue Zusatz-Tabelle composition_milestones (Migration 0012, vom Nutzer in Supabase auszufuehren): je Zeile Metrik (weight/fat/muscle/water/phase, CHECK), Name, target; kein Erreicht-Datum, keine Richtung - reine Richtwerte. Zod-Schema compositionMilestoneRow/Insert (milestones.ts), Query-Hook useCompositionMilestones (alle je Nutzer, clientseitig je Metrik gefiltert), Aktionen-Hook useCompositionMilestoneActions (add/update/remove). Neue Komponenten MetricMilestonesSection (folgt der gewaehlten Metrik; Liste Name+Ziel, dazu der aktuelle Messwert als Kontext; Anlegen/Bearbeiten/Loeschen) und MetricMilestoneEditModal (Overlay, Name + Zielwert). BodyMeasurePanel haelt die gewaehlte Metrik und teilt sie zwischen Mess-Karte und Meilenstein-Abschnitt (wie bei den Uebungen Chart+Meilensteine dieselbe Uebung teilen); reicht die Ziel-Linien der aktiven Metrik in den Chart und steuert den „Ziele"-Umschalter. BodyMeasureCard nimmt die Metrik nun von aussen und bekam den „Ziele"-Toggle; BodyMetricChart bekam die additive Prop milestoneLines (Ziele in die Skala einbezogen, dezente gestrichelte Waagerechte mit Label rechts). koerper.tsx nutzt das Panel. Coach-Rechenkern unberuehrt. Offen: Backup/Restore (Lieferung 1b). Validierung gruen: vite build, tsc --noEmit, vitest run (378 Tests).

2026-08-02 - Ziele-Zustand angehefteter Kacheln geraete-lokal gemerkt (Version 1.5.5, Vorhaben „Meilensteine pro Uebung"). Der „Ziele"-Umschalter auf den angehefteten Kacheln lag bisher nur im Komponenten-State (nach Neuladen aus). Neuer geraete-lokaler Store usePinnedGoals nach dem Muster von usePinnedCharts (useSyncExternalStore + localStorage, eigener Schluessel ks_pin_goals_v1), nutzt die vorhandenen reinen Helfer (parsePins/serializePins/hasPin/togglePin) mit {exerciseId, metric}-Eintraegen. PinnedChartTile liest/schreibt den Zustand darueber statt per useState; goalsAvailable bleibt vorgeschaltet, sodass ein gemerkter Zustand ohne Ziele/Datenpunkte nicht greift. Nur die angehefteten Kacheln (Detail-Chart bleibt bewusst sitzungslokal). Nicht synchronisiert, nicht im Export - wie die Anheftungen. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-08-02 - Ziel-Linien auf angehefteten Kacheln, Schritt 2 (Version 1.5.4, Vorhaben „Meilensteine pro Uebung"). Angeheftete Verlaufs-Kachel in eigene Komponente PinnedChartTile ausgelagert, damit useMilestones je Kachel auf oberster Ebene laeuft; „Ziele"-Toggle und milestoneLines wie auf der Detailseite, sichtbar nur bei Kacheln mit Metrik 1RM, vorhandenen Zielen und rm-Datenpunkten. PinnedCharts rendert nur noch die Kacheln (ExerciseChart-Direktnutzung entfallen). Kein Datenmodell/Coach beruehrt. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-08-02 - Ziel-Linien im Uebungs-Chart, Schritt 1 (Version 1.5.3, Vorhaben „Meilensteine pro Uebung"). ExerciseChart bekommt die optionale Prop milestoneLines (value/achieved/label); in der Linien-Metrik werden die Ziele in die Skala einbezogen (axisLo/axisHi echte Extremwerte fuer die Beschriftung, Zeichen-Domaene mit 8% Luft oben) und als dezente gestrichelte Waagerechte mit Label rechts gezeichnet, erreichte mit Opacity 0.4 gedimmt. Rein additiv - ohne milestoneLines unveraendert. ExerciseChartCard: liest Ziele ueber useMilestones(exerciseId), neuer Toggle „Ziele" im Kopf (links von Anheften), sichtbar nur wenn Ziele existieren, active===\"rm\" und rm-Datenpunkte vorhanden; Zustand lokal (Standard aus). Gilt zunaechst fuer den Detail-Chart; angeheftete Kacheln folgen als Schritt 2. Coach-Rechenkern unberuehrt. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-08-02 - Meilensteine in Backup/Restore und Coach-Export (Version 1.5.2, Lieferung 1b des Vorhabens „Meilensteine pro Uebung"). Voll-Export/Restore: exercise_milestones ergaenzt (RawExportData/KsExport/buildExport, exportSource selectAll, restoreData RestoreTables + Huellen-Schema optionales milestones, useRestore DELETE_/INSERT_ORDER als Kind von exercises). Schema-Version bleibt v3 (optionales Feld; aeltere Backups spielen unveraendert ein, Tabelle dann leer). Coach-Export: je Uebung milestones (Ziel + Abstand zum aktuellen 1RM bzw. Erreicht-Datum); dabei den veralteten Filter .filter(active) entfernt - da die active-Spalte seit Migration 0007 weg ist, lieferte der Coach-Export zuletzt gar keine Uebungen mehr (Bugfix). Neue Tests: Export-Durchreichung, Restore-Uebernahme + Leerfall, Coach-Katalog ohne active-Filter, Coach-Meilensteine (offen/erreicht). Coach-Rechenkern unberuehrt. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-08-02 - Meilensteine unter das Diagramm verschoben (Version 1.5.1). Der Abschnitt sitzt jetzt in der linken Spalte der Uebungs-Detailseite zwischen Verlaufsdiagramm und Verlauf (Desktop), mobil direkt nach dem Diagramm (order 3; Muskeln/Verlauf/Anpassen um eins nachgeschoben). Vorher stand er ganz oben ueber voller Breite. Rein optisch, keine Logikaenderung. Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-08-02 - Meilensteine je Uebung, Lieferung 1 (Version 1.5.0, Vorhaben „Meilensteine pro Uebung"). Neue Zusatz-Tabelle exercise_milestones (Migration 0011, am 2026-08-02 in Supabase ausgefuehrt). Zod-Schema milestones.ts (Row/Insert), Query-Hook useMilestones (je Uebung), Aktionen-Hook useMilestoneActions (add/update/remove/markAchieved; markAchieved stempelt heute nur solange achieved_at leer ist, DB-seitig idempotent). Neue wiederverwendbare Komponente progress-to-goal.tsx (rein darstellend: Balken aktuell/Ziel, kg-Abstand bzw. „erreicht am <Datum>"). Abschnitt MilestonesSection auf der Uebungs-Detailseite (nur Gewichtsuebungen, nach dem Coach-Block): offene zuerst, erreichte als Historie, „Meilenstein hinzufuegen"; Auto-„erreicht" per Effekt gegen exercises.rm (nur gelesen). MilestoneEditModal (Overlay) zum Anlegen/Bearbeiten/Loeschen. Coach-Rechenkern unberuehrt. Offen: Backup/Restore um die Tabelle erweitern (1.5.1). Validierung gruen: vite build, tsc --noEmit, vitest run.

2026-07-13 - Label fuer Kurzhantel ergaenzt (Version 1.4.2, Bugfix). equipmentLabel in src/lib/labels.ts kannte 'dumbbell' nicht und fiel auf den rohen Schluessel zurueck (klein geschrieben) - jetzt "Kurzhantel". Nur Anzeige auf der Uebungs-Detailseite. Validierung gruen: vite build, tsc --noEmit, vitest run (374 Tests).

2026-07-13 - Uebungstyp Kurzhantel + Curl (Kurzhantel) (Version 1.4.1, Lieferung 2 von 3 des Vorhabens „Kurzhanteln“). Engine: neue reine Funktion nearestDumbbell in plates.ts (naechste vorhandene Stufe; bei Gleichstand die leichtere; roundDown fuers Abrunden). progression.ts bekommt SuggestOpts.dumbbells - ist die Liste gesetzt, snappt der ld-Helper auf Kurzhantel-Stufen statt nearestLoadable; Entscheidungslogik (auf/halten/senken, Fresh-Sets) unveraendert. coach.ts: equipment-Union +dumbbell, SuggestBuildCtx/SuggestWithBarInput +dumbbells, eigener dumbbell-Zweig in suggestWithBar (keine Stange, bar=null). Durchgereicht ueber liveBuild (LiveBuildInput.dumbbells) und beide Hooks (useLiveBuilder, useCoachStatuses); Schema-Enum und liveSession-Union erweitert. Migration 0010: equipment-CHECK um dumbbell erweitert, Uebung „Curl (Kurzhantel)“ je Nutzer mit vorhandener „Barbell Curl“ angelegt (equipment=dumbbell, work_weight 10 je Hand, in der App anpassbar), Muskel-Map von der Langhantel-Curl uebernommen; idempotent. Warmup bleibt bei Nicht-Langhantel leer (korrekt fuer Isolation). Neue Tests: nearestDumbbell (5) + Kurzhantel-Progression (3); drei bestehende Tests um dumbbells ergaenzt. Offene DB-Schritte: 0009 und 0010 im Supabase-Editor ausfuehren. Lieferung 3 (Tausch in Workout E) macht der Nutzer im Editor. Validierung gruen: vite build, tsc --noEmit, vitest run (374 Tests).

2026-07-13 - Kurzhantel-Inventar (Version 1.4.0, Lieferung 1 von 3 des Vorhabens „Kurzhanteln“). Neue Inventar-Kategorie inventory_dumbbells (festes Gewicht je Stueck, je Hand) nach dem Kettlebell-Muster: Migration 0009 (Tabelle + RLS + Grants + Seed 2-30 kg in 2er-Schritten fuer Nutzer mit vorhandenem Inventar, idempotent), Zod-Schema (inventoryDumbbellRow/Insert), Query-Hook useDumbbells, Aktionen addDumbbell/deleteDumbbell in useInventoryActions, Komponente InventoryDumbbells + Abschnitt in einstellungen.tsx. Backup/Restore erweitert (exportSource, exportData RawExportData/KsExport, restoreData RestoreTables + Huellen-Schema, useRestore DELETE_/INSERT_ORDER), Schema-Version bleibt v3 (optionales Feld, alte Sicherungen spielen unveraendert ein). Drei Tests um das neue Feld ergaenzt. Coach/Plate-Loader unberuehrt (Uebungstyp folgt in Lieferung 2). Offener DB-Schritt: Migration 0009 im Supabase-Editor ausfuehren. Validierung gruen: vite build, tsc --noEmit, vitest run (366 Tests).

---

Ältere Einträge stehen im Archiv: `docs/archive/PLAN-Log-Archiv.md`.
Der nutzerverständliche Verlauf je Version liegt in `public/changelog.json`, die
getroffenen Entscheidungen und Betriebs-Lernpunkte in `docs/adr/`.
