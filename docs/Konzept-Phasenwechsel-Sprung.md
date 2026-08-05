# Konzept – Sprung beim Phasenwechsel auf 1RM-Basis (Punkt 2)

Status: Konzept (Vorschlag). Wird **nach** dem Vorhaben „1RM als Bestwert + 1RM-Test"
gebaut und hängt an dessen sauberem 1RM. Der zentrale Ansatz (Abschnitt 4.2) ist ein
Vorschlag und wird vor dem Bau bestätigt; die offenen Feinentscheidungen stehen in
Abschnitt 8. Konzept zu Punkt 1: `archive/Konzept-1RM-Bestwert-und-Test.md` (umgesetzt).

---

## 1. Ist-Zustand (das Problem)

- Beim Phasenwechsel mit großem Wiederholungs-Sprung (z. B. Hypertrophie 8–12 auf
  Maxkraft 4–6) übernimmt die App zwar das Ziel-Repband der neuen Phase, rechnet das
  Gewicht aber weiter über die normale Doppelprogression aus dem letzten Satz der Vorphase
  mit festen kleinen Schritten (±2,5 kg). Ergebnis: die erste Maxkraft-Einheit ist oft
  deutlich zu leicht.
- In der Praxis tastet man sich stattdessen mit Ramp-up-/Tast-Sätzen in den neuen
  Wiederholungsbereich, statt eine Formel-Rechnung zu bemühen.
- Für die Rechnung existiert bereits eine fertige, getestete Engine-Funktion
  (`workWeightForPhase` in `engine/phaseChange.ts`, mit `loadForReps`): sie leitet aus
  einem 1RM und dem Ziel-Repband ein gepuffertes Startgewicht ab – verletzungsbewusst,
  Anker am leichteren Zonenende plus Puffer, immer abgerundet, nach oben gedeckelt, nach
  unten direkt. Sie ist nur **nirgends verdrahtet**.

---

## 2. Leitidee (die Praxis)

- Der Testwert aus Punkt 1 liefert den sauberen Startpunkt für die neue Phase. Erst dieses
  verlässliche 1RM macht den Sprung sinnvoll – deshalb kommt Punkt 2 nach Punkt 1.
- Verletzungsbewusst und asymmetrisch: nach oben vorsichtig und gedeckelt, nach unten
  direkt, immer abgerundet. Gerade für den Squat mit deiner Knie-Vorgeschichte lieber zu
  konservativ als zu schwer.
- Der Sprung ist ein einmaliger Einstieg in die neue Zone, kein neuer Automatismus.
  Danach läuft die Steuerung wieder normal über die Doppelprogression aus den echten
  Sätzen.

---

## 3. Ziel

- Die erste Einheit einer neuen Phase mit deutlichem Repband-Wechsel startet auf einem
  sinnvollen, aus dem aktuellen 1RM abgeleiteten Gewicht, statt am zu leichten
  Vorphasen-Gewicht zu kleben.
- Ab der zweiten Einheit der neuen Phase greift wieder die normale Doppelprogression,
  unverändert.

---

## 4. Verhalten im Detail

### 4.1 Wann es greift (Erkennung)

- Nur beim Übergang: die erste Kraft-Einheit einer Übung im neuen Ziel-Repband, wenn sich
  dieses Band deutlich von dem der letzten Einheit unterscheidet.
- Erkennung über einen Vergleich: das Ziel-Repband der aktiven Phase gegen das Repband, in
  dem die letzte Einheit gerechnet wurde (aus den Ziel-Wiederholungen des letzten
  Eintrags ableitbar). Das braucht keine neue Datendurchreichung – die Werte liegen schon
  vor.
- Kein oder nur kleiner Bandwechsel: normale Doppelprogression, unverändert.

### 4.2 Wie der erste Vorschlag aussieht (der Kern, Vorschlag)

Empfohlen ist der kombinierte Weg:

- Das frische 1RM aus Punkt 1 liefert über die vorhandene Rechnung ein **konservatives
  Startgewicht** für das neue Band (Anker am leichteren Zonenende plus Puffer, abgerundet;
  nach oben gedeckelt, nach unten direkt).
- Die erste Einheit ist als „Einstieg/Tasten" markiert, damit klar ist, warum das Gewicht
  anders vorbelegt ist.
- Ihr tatsächliches Ergebnis setzt dann über die normale Doppelprogression das echte
  Arbeitsgewicht – ab da wieder normal.
- Optional gehören Ramp-up-/Tast-Sätze im neuen Band dazu, damit du dich sauber
  hochtastest.

Zur Abgrenzung, warum dieser Weg: Eine reine Formel-Rechnung ignoriert, dass sich der
wahre Wert erst im neuen Band zeigt. Reine Tast-Sätze ohne Startpunkt lassen dich bei
Null anfangen. Der kombinierte Weg nutzt das saubere 1RM als Startpunkt und lässt die
Realität den Rest bestimmen.

### 4.3 Sicherheit (Knie)

- Deckelung des Aufwärts-Sprungs, Abrunden und ein konservativer Anker sorgen dafür, dass
  die erste Einheit nie zu schwer vorbelegt wird. Diese Parameter stecken in der
  vorhandenen Rechnung und lassen sich justieren (siehe offene Entscheidungen).

### 4.4 Abgrenzung

- Nur Gewichtsübungen mit Progression (strength). Core/Bodyweight laufen unverändert über
  das Mitführen (`coreCarry`).
- Punkt 2 liest das 1RM nur – es verändert es nicht. Das 1RM setzen allein das normale
  Training und der Test aus Punkt 1.
- Ohne sauberes 1RM (keins vorhanden) kein Sprung: Rückfall auf die normale
  Doppelprogression.

---

## 5. Bausteine (Komponentenschnitt)

- **Engine:** die vorhandene `workWeightForPhase`/`loadForReps` (`phaseChange.ts`) endlich
  verdrahten; ggf. Puffer und Deckel justieren. Bleibt rein und DOM-frei, mit Unit-Tests.
- **Erkennung des Bandwechsels:** im Live-Aufbau bzw. Phasen-Kontext der Vergleich
  „aktives Ziel-Repband gegen letztes Repband".
- **Verdrahtung im Vorschlag:** greift der Phasenwechsel, kommt das Startgewicht aus
  `workWeightForPhase` statt aus der Doppelprogression; sonst wie bisher. Die Naht liegt
  dort, wo heute der Gewichtsvorschlag entsteht (`suggestWithBar`/`liveBuild`).
- **Markierung „Einstieg/Tasten"** auf der Live-Karte, als Hinweis für die erste Einheit.
- **Voraussichtlich keine DB-Migration** – die Rechnung nutzt vorhandene Daten (1RM,
  Phasen-Repband, Inventar). Beim Bauen bestätigen.

---

## 6. Schritte (Auslieferungen)

- **Lieferung 1:** Erkennung des deutlichen Bandwechsels + `workWeightForPhase`
  verdrahten, sodass die erste Einheit der neuen Phase ihr Startgewicht aus dem 1RM zieht.
  Engine-/Unit-Tests. Sichtbarer Hinweis „Einstieg".
- **Lieferung 2 (optional):** Ramp-up-/Tast-Sätze im neuen Band als Teil der ersten
  Einheit.
- Beim Bauen ggf. weiter aufteilen.

---

## 7. Bewusst ausgeklammert

- Übungsabhängige Schrittweite der Doppelprogression (+2,5 vs. +5 kg) – eigener kleiner
  Hebel.
- Alles rund um das 1RM selbst und den Test – das ist Punkt 1.

---

## 8. Offene Entscheidungen (vor dem Bau, nach Punkt 1)

- Ansatz bestätigen: der kombinierte Weg aus 4.2, oder doch reine Formel bzw. reine
  Tast-Sätze.
- Erkennungs-Schwelle: ab wann gilt ein Bandwechsel als „deutlich" (z. B. wenn sich die
  Bänder nicht überlappen oder die Bandmitte um mehr als X Wiederholungen springt).
- Puffer und Deckel: der Wiederholungs-Puffer (heute 2 in der Rechnung) und der maximale
  Aufwärts-Sprung (heute 12 %) – passen die, gerade fürs Knie, oder konservativer.
- Ramp-up-Sätze: ja/nein und wie viele.
