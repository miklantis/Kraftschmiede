# Konzept – 1RM als beweisgebundener Bestwert + 1RM-Test

Status: Konzept besprochen, Bau noch nicht begonnen. Erst nach Konsens bauen, in
kleinen, einzeln testbaren Schritten. Punkt 2 (Sprung beim Phasenwechsel) baut auf
diesem Konzept auf und wird getrennt besprochen.

---

## 1. Ist-Zustand (das Problem)

- Das gespeicherte 1RM einer Übung (`exercises.rm`) wird bei jeder abgeschlossenen
  Krafteinheit blind mit dem aus dieser einen Einheit geschätzten Wert überschrieben –
  auch wenn er niedriger ist als ein früherer, besserer Wert.
- Das passiert an zwei Zwillingsstellen mit identischer Logik: beim Beenden einer
  Einheit und beim nachträglichen Bearbeiten im Verlauf.
- Dadurch senkt auch ein submaximaler 8–12er-Satz mit Puffer den Rekord. Das
  widerspricht der Praxis: ein 1RM ist ein Rekord, kein Betriebswert.
- Es gibt keinen bewussten Weg, das 1RM gezielt zu setzen (Test) oder nach einer Pause
  bzw. Verletzung nach unten zu korrigieren.
- Auf der Übungs-Detailseite steht das 1RM heute im gemischten Info-/Statistik-Block,
  zusammen mit dem aktuellen Coach-Status (Arbeitsgewicht, „Halten … im Ziel"). Es hat
  keinen eigenen Bereich.

---

## 2. Leitidee (die Praxis)

- **Das 1RM ist ein beweisgebundener Rekord.** Der Beweis kommt aus wenigen, schweren
  Wiederholungen. Ein Ein-Wiederholungs-Max wird bewusst nicht verlangt (knie-sicher);
  der praktische Beweis sind saubere Sätze im niedrigen Wiederholungsbereich.
- **Zwei Wege zum 1RM:**
  - *Automatik im normalen Training* – hebt das 1RM nur an, nie senkt es von allein, und
    nur aus Sätzen mit höchstens 5 Wiederholungen. In einer Hypertrophie-Phase
    (viele Reps) hält das 1RM still; in einer Maxkraft-Phase heben echte niedrig-Wdh-PRs
    es organisch an.
  - *Bewusster Test* – der Nutzer misst gezielt seinen Stand, meist vor einem
    Phasenwechsel oder nach einer Pause. Der Test darf das 1RM nach oben **und** nach
    unten setzen, weil er ein echter, absichtlicher Messwert ist.
- **Arbeitsgewicht bleibt getrennt.** Der Betriebswert für die nächste Einheit läuft
  weiter über die Doppelprogression (kleiner Schritt +2,5/+5 kg, Reps zuerst). Dieses
  Vorhaben rührt ihn nicht an. Zwei Werte, zwei Regeln.

---

## 3. Ziel

- Das 1RM verhält sich wie ein echter Rekord: nur mit Beweis nach oben, nie automatisch
  nach unten, bewusste Korrektur über den Test.
- Ein eigener 1RM-Bereich auf der Übungs-Detailseite mit Test-Funktion und einer Liste
  der gemachten Tests.
- Tests erscheinen wie eine Trainingseinheit im **Trainingslog**: auf dem Kalender und in
  allen Verlaufs-Listen, klar als „Test" gekennzeichnet. So sind sie im normalen Rückblick
  sichtbar, nicht nur auf der Übungsseite.
- Zusätzlich erscheinen sie in der Test-Liste im 1RM-Block und farblich abgesetzt im
  1RM-Diagramm der Übung, sodass die Sprünge nach oben/unten aus Tests erkennbar sind.
- Alles nur bei Haupt- und Assistenzübungen (Gewichtsübungen). Core- und
  Körpergewichts-Übungen bekommen keinen 1RM-Test.

---

## 4. Verhalten im Detail

### 4.1 Automatik-Regel im normalen Training

Beim Beenden und beim Bearbeiten einer Krafteinheit wird das 1RM der Übung nur dann
angehoben, wenn ein sauberer Arbeitssatz mit **höchstens 5 Wiederholungen** einen
höheren Wert ergibt als der bisherige Rekord. Sätze mit mehr als 5 Wiederholungen zählen
nicht als Beweis und verändern das 1RM nicht. Das 1RM sinkt hier nie von allein. Beide
Speicherstellen (Beenden, Bearbeiten) verhalten sich gleich.

Das normale Training erzeugt dabei keinen Test-Eintrag – es hebt den Rekord still an. Ein
eigener Eintrag entsteht nur beim bewussten Test (4.2).

### 4.2 Der 1RM-Test (als Live-Block)

Der Test öffnet sich wie ein Live-Workout-Block für genau die gewählte Übung und nutzt
die vertraute Satz-Eingabe aus dem Training (dieselben Satz-Karten). Ablauf:

- Die Sätze sind mit einem Gewicht vorbelegt, das aus dem aktuellen 1RM abgeleitet ist.
  Der Nutzer kann das Gewicht hoch- oder runterpegeln und Sätze einfügen.
- Jeder Satz nimmt höchstens 5 Wiederholungen. Ein Satz mit sehr wenigen Wiederholungen
  ist möglich; der Nutzer bestimmt selbst, wie schwer er tastet.
- Sind Sätze eingetragen und alle abgehakt, erscheint automatisch unten ein Bereich, der
  das aktuelle 1RM und das neu berechnete 1RM live nebeneinander zeigt, z. B.
  „1RM 20 kg → 22,5 kg". So sieht der Nutzer die Änderung, bevor er den Test abschließt.
- Das neue 1RM wird aus dem besten Schätzwert der Test-Sätze (mit ≤ 5 Wdh) gerechnet.
- Beim Abschluss setzt der Test das 1RM der Übung auf diesen Wert – nach oben oder unten –
  mit heutigem Datum, und legt den Test als eigene kleine Einheit im Trainingslog ab
  (eine Einheit vom neuen Typ „Test" mit dieser einen Übung und den Test-Sätzen).

### 4.3 Anzeige auf der Detailseite

- Das 1RM bekommt einen **eigenen Block**, getrennt vom Coach-Status (Arbeitsgewicht,
  „Halten … im Ziel") und von der Statistik-Zeile. Der Block zeigt den aktuellen 1RM-Wert
  mit Datum, einen Test-Button und die Liste der bisherigen Tests (Datum, Gewicht × Wdh,
  daraus geschätztes 1RM).
- Im 1RM-Diagramm der Übung werden Test-Werte farblich abgesetzt dargestellt, damit die
  aus Tests kommenden Sprünge nach oben/unten unterscheidbar sind von den Werten aus dem
  normalen Training.

### 4.4 Im Trainingsverlauf und Kalender

Zusätzlich zur Liste auf der Detailseite erscheint jeder Test auch im globalen
Trainingsverlauf und im Kalender – dort, wo du siehst, was du an einem Tag gemacht hast.
Er wird als **eigener, klar gekennzeichneter Eintragstyp** dargestellt (eigener Farbpunkt
im Kalender, eigenes Label wie „1RM-Test"), neben den Einheiten. Ein Test-Eintrag zeigt
Übung, bestes Gewicht × Wdh und das daraus gesetzte 1RM (samt Richtung hoch/runter).

Wichtig und bewusst: Ein Test ist **keine Einheit**. Er bleibt sein eigener kleiner
Datensatz und läuft nicht durch das Einheiten-Modell. Kalender, Journey-Woche,
Häufigkeitsziel, „zuletzt trainiert", Erholung und das Workout-Ranking lesen die
Einheiten – ein Test taucht dort in der Ansicht auf, zählt aber nie als Trainingseinheit.
So bleibt der Coach unberührt und die Statistik sauber (die „Sessions"-Zahl auf der
Detailseite zählt weiter nur Einheiten, nicht Tests).

### 4.5 Abgrenzung

- Nur Gewichtsübungen mit 1RM (strength-Profil). Kein Test-Bereich bei Core/Bodyweight.
- Der Test verändert nur das 1RM (den Rekord). Das Arbeitsgewicht bleibt unangetastet,
  ein Test kann also nichts am laufenden Trainingsvorschlag kaputtmachen.

---

## 5. Bausteine (Komponentenschnitt)

- **Rechenkern:** ein Wiederholungs-Tor für den automatischen Bestwert. Der vorhandene
  Baustein zur 1RM-Schätzung aus sauberen Sätzen kennt bereits ein „unsicher"-Merkmal ab
  vielen Wiederholungen; daraus wird die harte Regel „nur ≤ 5 Wdh hebt an, nie von allein
  senken". Greift an beiden Speicherstellen.
- **Datenbank:** eine eigene kleine Tabelle für die Tests (je Zeile: Übung, Datum,
  Gewicht, Wiederholungen, geschätztes 1RM), nutzergebunden und geschützt – nach dem
  Muster der Meilenstein-Tabellen. Dazu eine Migration, die der Nutzer im Supabase-Editor
  ausführt.
- **Daten-Hooks:** ein Lese-Hook für die Test-Liste je Übung und ein Aktionen-Hook zum
  Anlegen eines Tests (schreibt die Test-Zeile und aktualisiert das 1RM der Übung).
- **Test-Oberfläche:** wiederverwendete Satz-Eingabe aus dem Live-Training plus die
  Live-Vorschau „aktuelles → neues 1RM".
- **1RM-Block:** eigene Komponente auf der Detailseite (Wert, Datum, Test-Button, Liste).
- **Diagramm:** additive, farblich abgesetzte Test-Marker im vorhandenen 1RM-Chart.
- **Verlauf & Kalender:** die reine Verlaufs-Aufbereitung (`buildHistoryModel`/`useHistory`)
  bekommt die Test-Datensätze als **zweite Quelle** neben den Einheiten und einen neuen
  Eintragstyp (eigener Farbpunkt/Label). Bewusst getrennt vom Einheiten-Modell, damit der
  Coach die Tests nie als Training liest.
- **Backup/Restore:** die neue Tabelle wird in Sicherung und Wiederherstellung
  aufgenommen.

---

## 6. Schritte (Auslieferungen)

- **Lieferung 1 – Rekord-Regel im Rechenkern.** Automatik hebt das 1RM nur bei einem
  sauberen Satz mit ≤ 5 Wdh, der den bisherigen Rekord schlägt; senkt nie von allein.
  Beide Speicherstellen (Beenden, Bearbeiten). Keine DB-Migration, keine neue Oberfläche.
  Prüfbar über Engine-/Unit-Tests und das Verhalten beim Beenden.
- **Lieferung 2 – 1RM-Block + Test.** Eigener 1RM-Block auf der Detailseite, Test als
  Live-Block mit Live-Vorschau des neuen 1RM, Test-Liste, neue Tabelle (Migration),
  Beschränkung auf Gewichtsübungen, Backup/Restore. Beim Bauen ggf. weiter aufteilen,
  wenn der Schritt zu groß wird.
- **Lieferung 3 – Tests im Trainingsverlauf & Kalender.** Die Verlaufs-Aufbereitung liest
  zusätzlich die Test-Datensätze und zeigt sie als eigenen Eintragstyp in Liste und
  Kalender. Einheiten-Modell und Coach unberührt.
- **Lieferung 4 – Tests im Diagramm.** Test-Werte farblich abgesetzt im 1RM-Chart der
  Übung.

---

## 7. Bewusst ausgeklammert

- Übungsabhängige Schrittweite der Doppelprogression (+2,5 vs. +5 kg) – eigener kleiner
  Hebel, nicht Teil dieses Vorhabens.
- Punkt 2 (Sprung beim Phasenwechsel auf 1RM-Basis) – baut auf dem sauberen 1RM aus
  diesem Konzept auf und wird getrennt besprochen.

---

## 8. Offene Detailfragen (klein, beim Bauen)

- Aus welchem Anteil des aktuellen 1RM das Test-Gewicht vorbelegt wird (so, dass 3–5
  saubere Wiederholungen realistisch sind). Reine Vorbelegung, vom Nutzer frei
  anpassbar.
- Ob ein Test aus dem Verlauf/Kalender heraus löschbar ist und, falls ja, was mit dem
  1RM passiert. Vorschlag: löschbar (Fehleingabe), aber das 1RM wird dabei **nicht**
  automatisch auf einen früheren Wert zurückgerechnet – Korrektur läuft über einen neuen
  Test. 
