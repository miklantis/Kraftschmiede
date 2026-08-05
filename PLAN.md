# Kraftschmiede – Plan & Fortschritt (Betrieb & Weiterentwicklung)

Verbindliche Schritt-Liste und Quelle der Wahrheit für den Projektstand.
**Zu Sitzungsbeginn zuerst diese Datei lesen**, „Aktueller Stand" prüfen, dann
weiterarbeiten. Nach jedem umgesetzten Schritt Kästchen abhaken und den Stand
fortschreiben – im selben Commit wie die Änderung oder als eigener kleiner Commit.

Konvention: `- [ ]` offen, `- [x]` erledigt. Jedes Feature nach **Konzept vor Code**:
erst gemeinsam besprechen, dann in kleinen, einzeln testbaren Schritten bauen, dann live
testen. Bei jeder Auslieferung die Version in `public/changelog.json` fortschreiben.

Weitere Quellen: `docs/Architektur.md` (Schema, Leitplanken), `docs/adr/`
(Entscheidungen, Betriebs-Lernpunkte), `docs/Designsystem.md`, `docs/Muskel-Map.md`,
`docs/archive/` (fertige Konzepte, Log-Archiv). Der nutzerverständliche Verlauf je
Version liegt in `public/changelog.json`.

---

## Aktueller Stand

- **App im laufenden Betrieb**, funktional vollständig, installierbar (PWA), auf der
  normalisierten Datenbank. Aktuelle Version: **1.6.1**.
- Pflege/Bugfixing laufend; neue Features nach Konzept vor Code.
- **Offene Handgriffe deinerseits (Supabase-SQL-Editor):**
  - Migration `0009_kurzhanteln_inventar.sql` und `0010_curl_kurzhantel.sql` ausführen
    (0009 zuerst).
  - Migration `0012_koerper_meilensteine.sql` ausführen.
  - Kurzhanteln, Lieferung 3: im Workout-Editor in Workout E den bisherigen Curl gegen
    „Curl (Kurzhantel)" tauschen.

---

## Offene Vorhaben

### Pflege / Bugfixing

Laufend, ergibt sich im Betrieb. Einzelne Punkte kommen hierher, sobald sie auftauchen.

- (noch keine offenen Punkte)

### 1RM als Bestwert + 1RM-Test

Konzept besprochen, **noch nicht gebaut**. Das 1RM soll ein beweisgebundener Rekord
werden (Automatik hebt nur bei einem Satz mit ≤ 5 Wdh, senkt nie von allein), dazu ein
bewusster 1RM-Test als Live-Block auf der Übungs-Detailseite (eigener 1RM-Block,
Test-Liste, Live-Vorschau altes → neues 1RM, setzt hoch und runter), nur bei
Gewichtsübungen, mit eigener DB-Tabelle. Konzept:
`docs/Konzept-1RM-Bestwert-und-Test.md`. Punkt 2 (Sprung beim Phasenwechsel auf
1RM-Basis) baut darauf auf und wird danach besprochen.

- [ ] Lieferung 1: Rekord-Regel im Rechenkern (Automatik hoch nur ≤ 5 Wdh, nie
      automatisch runter; beide Speicherstellen Beenden/Bearbeiten). Keine DB, keine UI.
- [ ] Lieferung 2: eigener 1RM-Block + Test als Live-Block (Migration, Live-Vorschau,
      Test-Liste, nur Gewichtsübungen, Backup/Restore).
- [ ] Lieferung 3: Test-Werte farblich abgesetzt im 1RM-Diagramm.

### Bewusst später

- Meilensteine pro Übung: Marker im Verlauf am Erreichen-Tag.
- Meilensteine pro Übung: automatische Vorschläge aus der alten Excel-Bestwerte-Liste.

---

## Abgeschlossene Vorhaben

Überblick der fertigen Vorhaben; der Verlauf steht im Log unten bzw. im Log-Archiv.

- **Meilensteine pro Körpermetrik** (1.6.0–1.6.1). Je Mess-Metrik eigene Zielwerte anlegen;
  Ziel-Linien im Mess-Diagramm; Backup/Restore und gerätelokale Mess-Ansicht. Migration
  0012 (DB-Schritt siehe Offene Handgriffe). Coach unberührt.
- **Meilensteine pro Übung** (1.5.0–1.5.5). Je Gewichtsübung eigene Meilensteine (Name +
  Ziel-1RM), Fortschritt gegen das aktuelle 1RM, Auto-„erreicht", Ziel-Linien im
  Detail-Chart und auf angehefteten Kacheln; Backup/Restore und Coach-Export. Migration
  0011. Coach-Rechenkern unberührt.
- **Kurzhanteln** (1.4.0–1.4.2). Kurzhantel-Inventar, Übungstyp `dumbbell` im Rechenkern
  (`nearestDumbbell`, zweiter Gewichtsweg in der Doppelprogression), neue Übung „Curl
  (Kurzhantel)". Migrationen 0009/0010 und der Tausch in Workout E stehen noch aus (siehe
  Offene Handgriffe).
- **Aktiv/Inaktiv bei Übungen entfernt** (1.3.29, Migration 0007). Das vestigiale
  `active`-Feld ist aus App und DB getilgt. Coach unberührt.
- **Workouts editierbar & Journey-Zuordnung** (1.3.0–1.3.10). Eigene Workouts-Seite,
  Journey-Zuordnung per Schalter, Empfehlung auf die Zuordnung beschränkt. Coach
  unangetastet. Konzept: `docs/Konzept-Workouts-und-Journey-Zuordnung.md`.
- **Typ-Felder am Übungskatalog aufgeräumt** (1.2.58–1.2.60). `category`/`kind` entfernt,
  `equipment`/`tier` tragen die Rolle. Migrationen 0002/0003. Konzept:
  `docs/archive/Konzept-Typfelder-Aufraeumen.md`.
- **Verlauf – Satz-Darstellung & Einheit bearbeiten** (ab 1.2.9). Satzweise Anzeige und
  nachträgliches Korrigieren von Kraft-, Skill- und Yoga-Einheiten im Live-Look. Konzept:
  `docs/archive/Konzept-Einheit-bearbeiten.md`.
- **Journey-Kurve „jetzt" mittig** (1.2.19). Die Periodisierungskurve zentriert beim
  Öffnen sanft die aktuelle Woche (`ChartCanvas`, `focusFraction`).
- **PWA – Offline-Hülle & Update-Hinweis** (ab 1.1.0). Service Worker, Offline-Hülle,
  bewusster Update-Hinweis. Konzept: `docs/archive/Konzept-PWA-Offline.md`.
- **Konten per Einladung** (1.2.0). Neue Nutzer per Supabase-Einladung; offene
  Selbstregistrierung abgeschaltet.

---

## Erledigt (Log)

Nur die jüngsten Einträge (Datum, Version, was, ein Satz warum). Tiefes Detail steht im
jeweiligen Commit. Ältere Einträge im Archiv: `docs/archive/PLAN-Log-Archiv.md`.

2026-08-05 – PLAN.md verschlankt und neues Konzept aufgenommen. „Aktueller Stand"
entschlackt, fertige Meilenstein-/Kurzhantel-Vorhaben als Einzeiler nach „Abgeschlossene
Vorhaben" gezogen, die drei ältesten Log-Einträge (Kurzhanteln, 13.07.) ins Log-Archiv
verschoben. Neues offenes Vorhaben „1RM als Bestwert + 1RM-Test" samt Konzeptdokument
`docs/Konzept-1RM-Bestwert-und-Test.md` (noch nicht gebaut). Reine Doku.

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
