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
`docs/archive/` (fertige Konzepte, Log-Archiv je Halbjahr). Der nutzerverständliche
Verlauf je Version liegt in `public/changelog.json`.

Log-Konvention: das Log unten führt nur Stichwort-Einträge (Datum, Version, wenige
Worte) zu laufenden bzw. gerade fertiggestellten Vorhaben – Begründung/Detail steht im
jeweiligen Commit, nicht nochmal hier. Sobald ein Vorhaben komplett abgeschlossen ist
(Zeile unter „Abgeschlossene Vorhaben" gesetzt), wandern seine Log-Einträge im selben
Zug ins Archiv (`docs/archive/PLAN-Log-Archiv-<Jahr>-H1/H2.md`, je nach Halbjahr) –
nicht erst ab einer bestimmten Anzahl Einträge.

---

## Aktueller Stand

- **App im laufenden Betrieb**, funktional vollständig, installierbar (PWA), auf der
  normalisierten Datenbank. Aktuelle Version: **1.7.1**.
- Pflege/Bugfixing laufend; neue Features nach Konzept vor Code.
- **Offene Handgriffe deinerseits:**
  - Migration `0013_rm_tests.sql` im Supabase-SQL-Editor ausführen (neue Tabelle für die
    1RM-Tests).
  - Im Workout-Editor in Workout E den bisherigen Curl gegen „Curl (Kurzhantel)" tauschen
    (reiner App-Handgriff, kein SQL).
  - Migrationen 0009, 0010 und 0012 sind ausgeführt (Stand 2026-08-05).

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
1RM-Basis) baut darauf auf; Konzept: `docs/Konzept-Phasenwechsel-Sprung.md`, wird nach
Punkt 1 gebaut.

- [x] Lieferung 1: Rekord-Regel im Rechenkern (Automatik hoch nur ≤ 5 Wdh, nie
      automatisch runter; beide Speicherstellen Beenden/Bearbeiten). Keine DB, keine UI.
      Erstbefüllung bleibt möglich, solange eine Übung noch gar kein 1RM hat.
- [ ] Lieferung 2: eigener 1RM-Block + Test als Live-Block (Migration, Live-Vorschau,
      Test-Liste, nur Gewichtsübungen, Backup/Restore). In drei Teile zerlegt:
  - [x] Teil A: Tabelle `rm_tests` (Migration 0013), 1RM-Block mit Wert, Datum und
        Test-Liste (löschbar), 1RM aus der Statistik-Reihe entfernt. Test-Knopf noch ohne
        Funktion.
  - [x] Teil B: der Test selbst als Live-Block (Vorbelegung 90 % des 1RM, zwei Sätze
        5/3, weitere per Knopf, höchstens 5 Wdh je Satz, Live-Vorschau altes → neues
        1RM, setzt hoch und runter). Vorschau erscheint ab dem ersten abgehakten Satz.
  - [ ] Teil C: `rm_tests` in Backup und Wiederherstellung aufnehmen.
- [ ] Lieferung 3: Tests im Trainingsverlauf & Kalender als eigener Eintragstyp
      (Verlaufs-Aufbereitung um die Test-Datensätze erweitert; Coach unberührt).
- [ ] Lieferung 4: Test-Werte farblich abgesetzt im 1RM-Diagramm.

### Sprung beim Phasenwechsel auf 1RM-Basis (Punkt 2)

Konzept (Vorschlag), **wird nach Punkt 1 gebaut** und hängt an dessen sauberem 1RM. Beim
Übergang in eine neue Phase mit deutlichem Repband-Wechsel (z. B. Hypertrophie 8–12 auf
Maxkraft 4–6) soll die erste Einheit ihr Startgewicht aus dem aktuellen 1RM ziehen statt
am zu leichten Vorphasen-Gewicht zu kleben; danach wieder normale Doppelprogression. Die
Engine-Rechnung dafür existiert schon (`workWeightForPhase`), ist aber unverdrahtet.
Konzept: `docs/Konzept-Phasenwechsel-Sprung.md`. Zentraler Ansatz und Feinwerte vor dem
Bau bestätigen.

- [ ] Lieferung 1: Bandwechsel erkennen + `workWeightForPhase` verdrahten (Startgewicht
      der ersten Einheit aus dem 1RM), Hinweis „Einstieg". Engine-/Unit-Tests.
- [ ] Lieferung 2 (optional): Ramp-up-/Tast-Sätze im neuen Band.

### Bewusst später

- Meilensteine pro Übung: Marker im Verlauf am Erreichen-Tag.
- Meilensteine pro Übung: automatische Vorschläge aus der alten Excel-Bestwerte-Liste.

---

## Abgeschlossene Vorhaben

Überblick der fertigen Vorhaben; der Verlauf steht im Log unten bzw. im Log-Archiv.

- **Meilensteine pro Körpermetrik** (1.6.0–1.6.1). Je Mess-Metrik eigene Zielwerte anlegen;
  Ziel-Linien im Mess-Diagramm; Backup/Restore und gerätelokale Mess-Ansicht. Migration
  0012 ausgeführt. Coach unberührt.
- **Meilensteine pro Übung** (1.5.0–1.5.5). Je Gewichtsübung eigene Meilensteine (Name +
  Ziel-1RM), Fortschritt gegen das aktuelle 1RM, Auto-„erreicht", Ziel-Linien im
  Detail-Chart und auf angehefteten Kacheln; Backup/Restore und Coach-Export. Migration
  0011. Coach-Rechenkern unberührt.
- **Kurzhanteln** (1.4.0–1.4.2). Kurzhantel-Inventar, Übungstyp `dumbbell` im Rechenkern
  (`nearestDumbbell`, zweiter Gewichtsweg in der Doppelprogression), neue Übung „Curl
  (Kurzhantel)". Migrationen 0009/0010 ausgeführt; der Tausch in Workout E steht noch aus
  (siehe Offene Handgriffe).
- **Aktiv/Inaktiv bei Übungen entfernt** (1.3.29, Migration 0007). Das vestigiale
  `active`-Feld ist aus App und DB getilgt. Coach unberührt.
- **Workouts editierbar & Journey-Zuordnung** (1.3.0–1.3.10). Eigene Workouts-Seite,
  Journey-Zuordnung per Schalter, Empfehlung auf die Zuordnung beschränkt. Coach
  unangetastet. Konzept: `docs/archive/Konzept-Workouts-und-Journey-Zuordnung.md`.
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

Stichwort-Einträge zu laufenden/gerade fertiggestellten Vorhaben (Datum, Version,
wenige Worte). Detail steht im jeweiligen Commit. Abgeschlossene Vorhaben werden hier
entfernt, sobald sie in „Abgeschlossene Vorhaben" stehen – Archiv je Halbjahr:
`docs/archive/PLAN-Log-Archiv-2026-H1.md` (Jan–Jun), `docs/archive/PLAN-Log-Archiv-2026-H2.md`
(Jul–Dez).

2026-08-05 – 1.7.1 – 1RM-Test als Live-Block mit Vorschau, Teil B von Lieferung 2.

2026-08-05 – 1.7.0 – 1RM-Block auf der Übungsseite, Tabelle rm_tests (Migration 0013),
Teil A von Lieferung 2.

2026-08-05 – 1.6.2 – 1RM als Rekord: Automatik hebt nur bei ≤ 5 Wdh, senkt nie
(Beenden + Bearbeiten), Lieferung 1 von vier.

2026-08-05 – PLAN-Log-Struktur überarbeitet: Archiv nach Halbjahr gesplittet, Log auf
Stichworte gekürzt, abgeschlossene Vorhaben wandern künftig sofort ins Archiv statt erst
ab zehn Einträgen.

2026-08-05 – Doku: 1RM-Konzept, Lösch-Frage geklärt (Test nur auf Übungs-Detailseite
löschbar).

2026-08-05 – Doku: Konzept „Phasenwechsel-Sprung" aufgenommen, „Workouts & Journey"-Konzept
archiviert.

2026-08-05 – PLAN.md verschlankt, 1RM-Konzept aufgenommen.
