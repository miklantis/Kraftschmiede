# Journey-Editor – Ideenpapier

> Doku-Typ: Idee. Denkstand, kein Konzept und kein Auftrag.

Die Frage dahinter: Ließen sich Phasen selbst zusammenstellen, statt nur aus festen
Vorlagen zu kommen? Machbar ja – das Datenmodell ist näher dran, als es von außen
aussieht. Dieses Papier hält fest, welche Bausteine es dafür gibt, wie sie sich
verhalten und was vor einem Konzept noch zu klären ist. Grundlage:
`adr/0018-steuerung-je-phasentyp.md` und `Architektur.md`.

---

## 1. Was an einer Phase heute schon frei ist

Eine Phase ist eine Datenzeile. Fast alle ihre Felder sind bereits freie Werte:

| Feld | Frei? | Bemerkung |
| --- | --- | --- |
| `name` | ja | reine Anzeige, ohne Wirkung |
| `focus` | nur feste Werte | der Typ, siehe Abschnitt 2 |
| `weeks` | ja | bestimmt bei Plan-Phasen zugleich die Wiederholungsleiter |
| `sets_start` / `sets_end` | ja | Satzrampe über die Phasenwochen |
| `deload_week` | ja | Woche mit gesenktem Volumen |
| `rep_target_min` / `max` | ja | **hat Vorrang vor dem Band des Fokus** |
| `load_factor` | ja | Anteil des Referenzgewichts, siehe Abschnitt 4 |
| `week_plan` | ja (jsonb) | die Wochentabelle der Plan-Typen |
| `position` | ja | Reihenfolge in der Journey |

Zwei Punkte daraus sind für einen Editor entscheidend:

- **Ein gesetztes Wiederholungsband schlägt den Typ.** Der Fokus liefert nur den
  Ersatzwert für den leeren Fall (`phaseRepBand`). Das Prinzip „expliziter Wert
  schlägt Ableitung" ist also schon angelegt.
- **Der Wochenplan wird generisch gelesen, aber typabhängig gebaut.** Das System
  fragt nie, warum in Woche 3 steht, was dort steht – nur, was gilt
  (`weekPlanForWeek`). Fokusabhängig ist allein das Erzeugen (`buildWeekPlan`), und
  das passiert genau einmal, beim Anlegen der Phase. Ein Editor schreibt also
  Felder; die einzige Stelle, an der er in die Engine greift, ist das Neuberechnen
  des Plans, wenn sich die Wochenzahl ändert.

---

## 2. Die Bausteine

Die sieben heutigen Typen und der achte, der in Abschnitt 4 festgelegt ist.

| Typ | Wochen | Wdh. | Sätze | Entlastung | Steuerweg | Startgewicht | Braucht davor | In Vorlage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kraftausdauer (`endurance`) | 3–8 (4) | 12–18 | 2 → 4 | ab Woche 4 | Coach | letztes Arbeitsgewicht | – | nein |
| Hypertrophie (`hypertrophy`) | 3–8 (5) | 8–12 | 2 → 6 | ab Woche 4 | Coach | letztes Arbeitsgewicht; bei klar anderem Band einmalig neu aus dem 1RM | – | ja |
| Wiedereinstieg (`reentry`) | 1–4 (2) | 5–8 | 2 → 2 | praktisch nie | Coach, vorsichtig | wie Hypertrophie, aber Bandanfang und abgerundet | – | ja |
| Erhaltung (`maintenance`) | 1–12 (3) | Band der Übung | 3 → 3 | nein | Coach | letztes Arbeitsgewicht, kein Eintrittssprung | – | nein |
| Maximalkraft (`strength`) | 3–6 (5) | Leiter 5→2 | 4 → 4 (fest) | nein | Wochenplan | Startgewicht X aus dem 1RM (≈ 81 %), an die Phase gebunden | ein 1RM | ja |
| Intensivierung (`power`) | 3–4 (3) | Leiter, kürzer | 4 → 4 (fest) | nein | Wochenplan | wie Maximalkraft | ein 1RM | nein |
| Test/Peak (`test`) | 1–2 (2) | 3–5, dann 1 | 2 → 0 (Bauregel) | in der Bauregel | Wochenplan | 60 % vom X der Kraftphase davor | **eine Kraftphase** | ja |
| Wiederaufbau (`rebuild`, neu) | 2–6 (4) | frei, üblich 6–10 | 2 → 4 | nein | Vorgabe der Journey | eingefrorener Stand beim Journey-Start × Prozent | **Platz am Anfang** | neu |

Lesehilfe:

- **Wochen** als Bereich mit üblichem Wert in Klammern: „3–6 (5)" heißt, ein Regler
  dürfte 3 bis 6 anbieten und stünde beim Anlegen auf 5.
- **Sätze** immer als Rampe von der ersten zur letzten Phasenwoche. Bleibt die
  Satzzahl konstant, steht links und rechts dieselbe Zahl – derselbe Regler mit
  gleichem Anfang und Ende (`rampSets`). „fest" heißt, der Wert kommt aus dem
  Wochenplan und ist gar nicht einstellbar.
- **Braucht davor** – „–" heißt, der Baustein steht für sich allein.

Was die Tabelle nicht sagt:

- **Hypertrophie** ist der Typ mit der meisten Arbeit; die Satzrampe ist sein Motor.
  Ab fünf Sätzen toleriert der Coach zwei Wiederholungen Abfall in den späteren
  Sätzen, sonst fröre das Gewicht ein.
- **Wiedereinstieg** hat einen eigenen, vorsichtigen Coach-Zweig: Ziel ist immer der
  Bandanfang, das Gewicht steigt nur bei niedriger Anstrengung *und* ohne
  Schmerzmeldung. Der einzige Typ, bei dem eine Schmerzmeldung allein die Steigerung
  stoppt.
- **Erhaltung** ist der einzige Typ ohne eigenes Wiederholungsband: Jede Übung behält
  ihr eigenes, gebremst wird über wenige Sätze.
- **Maximalkraft und Intensivierung** sind bis auf Band und Länge identisch.
  Einstellbar ist an beiden nur die Wochenzahl.
- **Test/Peak** folgt einer Bauregel: letzte Woche ist die reine Testwoche (null
  Sätze, verlangt keine Einheit, erfüllt sich selbst), jede Woche davor ist
  Entlastung mit 60 % vom Startgewicht der Kraftphase.

### Wie ein Baustein anfängt

Die Spalte Startgewicht fasst vier verschiedene Mechanismen zusammen:

- **Coach-Bausteine haben keinen Anker.** Sie machen dort weiter, wo die letzte
  Einheit aufgehört hat. Nur beim Eintritt gibt es einen einmaligen Sprung: Liegt das
  Band der neuen Phase deutlich neben dem der letzten Einheit und gibt es ein
  sauberes 1RM, wird das Gewicht daraus neu gerechnet – leichteres Bandende plus
  Reserve, abgerundet, nach oben auf zwölf Prozent gedeckelt, nach unten sofort
  (`workWeightForPhase`). Gespeichert wird dabei nichts.
- **Plan-Bausteine setzen ein Startgewicht X**, sobald eine Übung in der Phase zum
  ersten Mal drankommt: aus dem geschätzten 1RM über die Wiederholungen der ersten
  Planwoche plus zwei in Reserve (`planStartWeight`). X wird an der Übung gespeichert
  und an die Phase gebunden; der Anker läuft wöchentlich hoch, wenn die Vorwoche
  sauber war, und wird nie gesenkt.
- **Test/Peak rechnet aus fremdem Bestand:** 60 % vom X der vorangegangenen Kraft-
  oder Intensivierungsphase.
- **Wiederaufbau rechnet von der Journey**, nicht von der Phase (Abschnitt 4).

Drei Folgerungen für die Bedienung:

1. **Zwei Kraftblöcke hintereinander bauen nicht aufeinander auf.** Der Anker ist an
   die Phase gebunden; der zweite Block holt sich sein eigenes X aus dem aktuellen
   1RM. Was davor trainiert wurde, wirkt nur indirekt über das 1RM.
2. **Test/Peak ist der einzige Baustein mit echter Vorbedingung.** Ohne Kraftphase
   davor verliert die Entlastung stumm ihren Bezug und fällt auf die 1RM-Rechnung
   zurück – hier müsste ein Editor warnen oder sperren.
3. **Der Wiederaufbau-Baustein gehört an den Anfang**, sonst zöge er auf ein Niveau
   von vor mehreren Wochen zurück.

### Wochen und Leitern

Technisch gesetzt ist nur eine Grenze: die 3 bis 6 Wochen der Plan-Typen. Darunter
schneidet `repLadder` die Leiter von hinten ab, es fallen also genau die schweren
Wochen weg, wegen derer die Phase existiert; darüber wiederholt sie nur die erste
Woche.

| Wochen | Leiter |
| --- | --- |
| 3 | 5 · 4 · 3 |
| 4 | 5 · 4 · 3 · 2 |
| 5 | 5 · 5 · 4 · 3 · 2 |
| 6 | 5 · 5 · 4 · 4 · 3 · 2 |

Alle übrigen Grenzen sind Vorschlag. Bei den Coach-Typen folgt die Untergrenze aus
dem Motor: Die Satzrampe braucht drei Wochen, um ein Verlauf zu sein, eine
Entlastungswoche lohnt erst ab vier. Die Obergrenze ist Ermessenssache. Erhaltung ist
die Ausnahme – ohne Rampe und ohne Ziel darf sie kurz oder sehr lang sein.

---

## 3. Bedienidee: der Nutzer wählt Typen, keine Wege

- **Der Nutzer wählt einen Baustein, die Steuerwege bleiben unsichtbar.** Niemand
  muss wissen, dass eine Kraftphase anders rechnet als eine Hypertrophiephase, um sie
  zu benutzen.
- **Je Typ erscheinen nur die Optionen, die dort etwas bewirken.** Ein Feld, an dem
  man zieht und nichts passiert, ist schlimmer als kein Feld.
- **Was fest ist, bleibt fest und wird nicht angeboten** – die vier Sätze der
  Kraftphase, die Ziel-Anstrengung, die Bauregel der Testphase (ADR-0018).
- **Die Abfolge liegt beim Nutzer.** Das System prüft nicht, ob ein Block
  trainingslogisch klug sitzt. Einzige Ausnahme wäre Test/Peak ohne Kraftphase davor.

Damit ist eine Phase in vier Handgriffen definiert: Typ wählen → Wochen wählen →
gegebenenfalls Entlastungswoche → Reihenfolge festlegen.

---

## 4. Der Wiederaufbau-Baustein (festgelegt)

Die Vorlage „Wiederaufbau nach Fasten" ließ sich mit den sieben Typen nicht nachbauen:
Ihre vier Phasen leben vom Lastfaktor (65 / 80 / 95 / 100 %), tragen je ein eigenes
Wiederholungsband und laufen nur je eine Woche. Sie ist keine Abfolge von Blöcken,
sondern eine einzige Bewegung – vom gedrosselten Gewicht zurück auf hundert Prozent.

**Festgelegt: Dafür entsteht ein achter Baustein `rebuild`.** Eingestellt werden
Wochenzahl, Startanteil und Zielanteil, etwa vier Wochen von 65 % auf 100 %. Je Woche
eine Stufe; die Wiederholungen steuert der Coach im Band, das Gewicht nicht.

Die Mechanik dahinter, die ein Konzept kennen muss:

- Das Referenzgewicht wird **beim Journey-Start** eingefroren, für alle Übungen auf
  einmal (`friereReferenzgewichteEin`). Ohne diesen Bezugspunkt wirkt der Anteil gar
  nicht – und zwar ohne jede Meldung.
- Unter 100 % ist der gerechnete Wert **Ziel und Deckel zugleich**: Ein guter Tag hebt
  ihn nicht an, genau das ist der Zweck. Bei 100 % wirkt er nur noch als Untergrenze,
  damit der Coach von dort normal übernimmt.
- Der Baustein läuft über den Coach-Weg. Mit einem Wochenplan zusammen ergibt er
  keinen Sinn – dort käme die Last aus dem Plan – und darf deshalb nicht kombinierbar
  sein.

Damit ist zugleich die Frage beantwortet, wo der Lastfaktor hingehört: nicht als
unsichtbarer Aufsatz an jeder Phase, sondern als eigene Bauart, die man sieht,
hinstellt und wieder wegnimmt.

Offen bleibt, ob der Baustein die heutige Fasten-Vorlage ersetzt oder neben ihr steht
und was aus den vier Einzelphasen laufender Journeys wird.

---

## 5. Noch zu klären

- **Vorlage oder Journey – was wird eigentlich editiert?** Heute entstehen Journeys
  nur aus Vorlagen. Denkbar sind: Vorlagen editierbar machen, eine Journey ohne
  Vorlage anlegen, oder eine laufende Journey anpassen. Drei Vorhaben mit sehr
  verschiedenem Risiko.
- **Ändern, während es läuft.** Der Standort wird aus den absolvierten
  Trainingswochen abgeleitet, nicht aus dem Kalender. Verkürzt man eine laufende
  Phase, springt er – und die Gewichtsanker hängen plötzlich woanders. Vermutliche
  Trennung: kommende Phasen ja, laufende und vergangene nein.
- **Der Bezugspunkt der Entlastung.** Steckt eine Testphase hinter einer
  Hypertrophiephase, ist offen, wovon entlastet wird. Braucht eine Regel, bevor
  Phasen frei zusammensteckbar werden.
- **Test/Peak: eine oder zwei Wochen?** Zwei ist der Normalfall, eine ist belegt
  („Wiederaufbau nach Fasten", Migration `0037`). Also Vorgabe 2 mit
  Abweichungsmöglichkeit, nicht hart auf 2.
- **Der Wochenplan muss neu gerechnet werden, wenn sich die Wochenzahl ändert.** Heute
  entsteht er genau einmal. Ohne Neuberechnung passt die gespeicherte Leiter nicht
  mehr zur Phasenlänge.

---

## 6. Nächster Schritt

Wenn daraus ein Konzept werden soll: mit Abschnitt 5 anfangen, zuerst mit der Frage
Vorlage-oder-Journey. Alles Weitere folgt daraus. Ob überhaupt gebaut wird, ist offen –
die beiden bestehenden Vorlagen decken den heutigen Bedarf.
