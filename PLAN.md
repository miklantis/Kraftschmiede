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
  Konzept-vor-Code. Aktuelle Version: 1.3.30.
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
---

Ältere Einträge stehen im Archiv: `docs/archive/PLAN-Log-Archiv.md`.
Der nutzerverständliche Verlauf je Version liegt in `public/changelog.json`, die
getroffenen Entscheidungen und Betriebs-Lernpunkte in `docs/adr/`.
