# ADR-0016 – Lastrampe der Phase als zweites Steuerrad

**Status:** akzeptiert
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

**3. Senkt der Coach, zieht die Rampe mit nach unten.** Der Anker wandert beim Beenden der
Einheit proportional auf den tatsächlich gestemmten Stand – aber nur nach unten. Sonst
liefe man in der Folgewoche wieder gegen dieselbe zu schwere Wand. Nach oben bleibt er
stehen: ein guter Tag überholt den Plan nicht, sonst wäre die Rampe wieder eine
Doppelprogression mit anderem Namen. Die Regel steht an einer Stelle (`katalogPatch`).

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
