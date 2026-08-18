# ADR-0016 – Lastrampe der Phase als zweites Steuerrad

**Status:** akzeptiert, Festlegung 3 überarbeitet am 2026-08-18 (siehe Nachtrag)
**Datum:** 2026-08-18

## Kontext

ADR-0015 hat festgelegt, dass es *eine* Progressionsregel für alle Phasen gibt und der
Phasenunterschied stattdessen in den Rahmenwerten der Journey steckt: „Wiederholungsband,
Satzrampe, Lastfaktor". Zwei der drei lieferten ihn nicht:

- Die **Satzrampe** zeigte in allen Phasen in dieselbe Richtung. Seit #199 zeigt sie in
  Kraftphasen bewusst gar nicht mehr – dort ist die Satzzahl konstant.
- Der **Lastfaktor** aus Migration 0022 war außerhalb der Vorlage „Wiederaufbau nach
  Fasten" überall 1, und er hängt pro Phase statt pro Woche.

Damit konnte eine Maximalkraftphase nichts anderes ausdrücken als eine Hypertrophiephase,
außer dem Wiederholungsband. Das Gewicht bestimmte in beiden allein der Coach aus der
letzten Leistung.

Nach Lehrbuch (Bompa/Buzzichelli, *Periodization*, 6. Auflage, Kapitel 10) ist eine
Maximalkraftphase aber genau umgekehrt gebaut: Sätze und Wiederholungen bleiben konstant,
nur die Last wandert – vier Wochen bei 77,5 / 80 / 82,5 Prozent des 1RM, dann eine
Entlastungswoche bei rund 70 Prozent.

## Entscheidung

**Eine Phase kann ihre Last über die Wochen selbst planen.** Zwei neue Spalten an der
Phase, `intensity_start` und `intensity_end`, halten die geplante Intensität in Prozent
des 1RM. Dazwischen wird linear interpoliert.

Das ist kein zweiter Progressionsalgorithmus. ADR-0015 bleibt unangetastet: es gibt
weiterhin eine Regel, und die Phase überstimmt einen Vorschlag weiterhin an genau einer
Stelle – `withRamp` in `engine/progression.ts`. Die Lastrampe ist ein neuer *Rahmenwert*,
kein neuer Weg durch den Entscheidungsbaum.

### Vier Festlegungen

**1. Bezug ist das 1RM, nicht das Arbeitsgewicht.** Die Phase nennt die Zahlen, die im
Trainingsplan stehen. Ein Faktor auf das Arbeitsgewicht (wie beim Lastfaktor) hätte
dieselbe Phase mit krummen, schwer lesbaren Werten beschrieben. Fehlt einer Übung ein
getestetes 1RM, plant die Phase deren Last nicht und der Coach steuert sie wie gewohnt –
sichtbar auf der Karte in der Einheit.

**2. Anker beim Eintritt in die Phase, nicht beim Journey-Start.** `reference_weight` wird
für die Lastrampe beim ersten Einsatz einer Übung in der Phase neu gesetzt, aus
`anchorForIntensity(1RM, intensity_start)`. Beim Journey-Start eingefroren wäre der Wert
für eine Kraftphase in Monat drei zu alt. Damit der Code „Anker dieser Phase" von „noch
kein Anker" unterscheiden kann, hängt am Anker die Phase (`reference_phase_id`). Ohne
diesen Bezug würde die Last pro Einheit statt pro Woche steigen.

**3. Der Anker folgt dem tatsächlich gestemmten Stand.** ~~Nur nach unten~~ – siehe Nachtrag
unten. In beide Richtungen: nach unten, damit man in der Folgewoche nicht wieder gegen
dieselbe zu schwere Wand läuft; nach oben, weil die Rampe in den Aufbauwochen nur noch
Untergrenze ist und die Entlastungswoche sonst von einem veralteten Bezugspunkt rechnet. Die
Regel steht an einer Stelle (`katalogPatch`).

**4. Nur `strength`, `power` und `test`.** In der Hypertrophie ist das Volumen der Motor,
dort passt die Doppelprogression. Das folgt derselben Begründung wie ADR-0015 (Moesgaard
2022: Periodisierung wirkt in volumengleichen Programmen auf Maximalkraft, nicht auf
Hypertrophie). Ein Seed-Regeltest hält fest, dass keine andere Phase eine Rampe trägt.

### Zwei Rechendetails, die bewusst abweichen

**Die Rampe interpoliert über die Aufbauwochen, nicht über alle Wochen.** `rampSets` in
`engine/volume.ts` rechnet über `weeks`. Bei einer Vier-Wochen-Phase mit Entlastung in
Woche 4 wäre `intensity_end` dadurch nie erreicht – die Rampe endete bei 80,8 statt 82,5
Prozent. `rampSets` selbst bleibt unverändert: eine Änderung dort würde laufende Journeys
erneut verschieben, und beim Volumen ist der Endwert weniger kritisch.

**Die Entlastungswoche liegt bei 85 Prozent der Vorwoche, nicht bei 50.** Beim Volumen
sind 50 Prozent richtig (ADR zur Deload-Woche in #198). Bei der Last wäre das absurd – wer
mit 82,5 Prozent arbeitet, lädt in der Entlastungswoche nicht 41 Prozent. 82,5 × 0,85
ergibt rund 70 Prozent und trifft damit den Lehrbuch-Wert.

## Konsequenzen

- Eine Kraftphase drückt jetzt aus, was ihr Name verspricht: konstantes Volumen,
  wandernde Last. Die Periodisierungskurve zeigt die Intensität erstmals wochengenau
  statt pro Phase flach.
- Zwei Mechanismen geben Last vor – Lastfaktor und Lastrampe. Sie dürfen nie an derselben
  Phase hängen; ein Seed-Regeltest sichert das ab. Der Lastfaktor bleibt der Vorlage
  „Wiederaufbau nach Fasten" vorbehalten und wird nicht erweitert.
- Der Phasenwechsel-Einstieg (`workWeightForPhase`, ADR-Kontext in
  `docs/archive/Konzept-Phasenwechsel-Sprung.md`) bleibt für Phasen ohne Lastplanung
  zuständig. Unter der Lastrampe hat dieselbe Stelle eine neue Aufgabe: sie setzt den
  Anker.
- Ohne 1RM-Test bleibt eine Übung außen vor. Das macht den 1RM-Test wichtiger als
  bisher – wer die Kraftphasen voll nutzen will, braucht ihn.

## Quellen

- Bompa, Buzzichelli: *Periodization – Theory and Methodology of Training*, 6. Auflage,
  Kapitel 10 (Periodisierung der Kraft, MxS-I/MxS-II, Buffer, 3:1-Zuschnitt).
- Moesgaard et al. 2022 (bereits in ADR-0015 herangezogen).

---

## Nachtrag 2026-08-18: Untergrenze statt Deckel

Festlegung 3 hatte eine Nebenwirkung, die im Konzept-Gespräch nicht benannt war. Weil die
Rampe deckelte (`cap`), hielt sie den Coach auch dann zurück, wenn das Wiederholungsziel
jede Woche erreicht war – am oberen Bandende hat der Coach nichts mehr zu steuern, dann steht
alles still.

### Was gemessen wurde

Zwei unabhängige Größenordnungen, beide gegen den Deckel:

**Auflösung.** 77,5 → 82,5 % sind +6,45 %. Damit das eine 2,5-kg-Scheibenstufe überspringt,
muss das Arbeitsgewicht über **38,8 kg** liegen. Darunter fährt die Phase konstantes Gewicht,
unabhängig davon, wie sauber das 1RM ist.

**Tempo.** Ohne Rundung legt die Rampe +1,02 kg pro Woche zu, der Coach nach jedem sauberen
4×6 aber +2,50 kg. Die Rampe ist 2,4× langsamer und wäre erst ab rund **116 kg**
Arbeitsgewicht gleichauf. Der Lehrbuch-Zuschnitt setzt Athleten im dreistelligen Bereich
voraus, die pro Block wenige Kilo zulegen.

Konkret ergab das für einen Deadlift mit Anker 47,5 kg und wöchentlich sauberem 4×6:
47,5 / 47,5 / 50 – dreimal fast dasselbe Gewicht, obwohl das Ziel jedes Mal erreicht war.

### Geänderte Entscheidung

Die Lastrampe wirkt in den **Aufbauwochen nur noch als Untergrenze** (`mode: "floor"`): Sie
garantiert eine Mindestlast, wer mehr schafft, darf über die Doppelprogression darüber
hinaus. In der **Entlastungswoche deckelt sie weiter** (`mode: "cap"`) – sonst wäre sie keine
Entlastung.

Das löst beide Größenordnungen ohne Schwellenwert und passt sich dem Leistungsniveau selbst
an: solange man schneller zulegt als der Plan, führt der Coach; wird die Rampe irgendwann
schneller als die eigene Steigerung, übernimmt sie automatisch die Führung – genau dann, wenn
der Lehrbuch-Zuschnitt zutrifft.

**Der Lastfaktor behält seinen Deckel.** Bei „Wiederaufbau nach Fasten" ist das Deckeln der
eigentliche Sinn: nach einer Pause soll gerade nicht überzogen werden. Damit trennen sich die
beiden Wege auch in der Semantik, und `lastfaktor.test.ts` ist die Wache dafür.

Als Folge muss der Anker dem tatsächlichen Stand auch **nach oben** folgen (Festlegung 3
oben). Die alte Begründung „ein guter Tag überholt den Plan nicht" war an den Deckel
gebunden und entfällt mit ihm.

Erfasst in Issue #213.
