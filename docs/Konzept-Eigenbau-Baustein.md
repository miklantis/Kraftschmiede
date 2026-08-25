# Der Eigenbau-Baustein: eine getippte Wochentabelle – Konzept

> Doku-Typ: Konzept. Hält den besprochenen Stand fest, bevor gebaut wird. Noch nicht in
> Umsetzung, es liegen bewusst keine Issues dazu. Grundlage:
> [`Konzept-Bausteine-Datenstruktur.md`](./Konzept-Bausteine-Datenstruktur.md) (Teil 1,
> gebaut), [`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md)
> samt Nachtrag und [`Architektur.md`](./Architektur.md).
>
> Stand 24.08.2026: gegen Code, Schema und die Live-Tabelle `phase_types` durchgeprüft, dazu
> eine Recherche zur Trainingspraxis (Abschnitt 3, Quellen am Ende). Entschieden und damit
> nicht mehr offen: Name und Schlüssel des Bausteins (Eigenbau / `custom`, Abschnitt 1), die
> Bauregeln und die Speicherform der getippten Tabelle (eine Spalte `custom_plan` an der
> Vorlagenphase, Abschnitt 7). Was noch zu entscheiden ist, steht in Abschnitt 11.

---

## 1. Was der Nutzer will

Ein Baustein, dessen Wochenplan man selbst hinschreibt: je Woche Sätze, Wiederholungen,
Ziel-Anstrengung und Last. Keine neue Rechenregel, sondern eine Tabelle, die man ausfüllt.

Ausgelöst hat das ein konkreter Wunsch – ein Block, in dem sich die Wochenarten abwechseln,
eine Woche Hypertrophie, eine Woche Maximalkraft. Zunächst sah das nach zwei getrennten
Vorhaben aus: einmal „Plan selbst eintippen", einmal „Wechselblock". Die Recherche in
Abschnitt 3 zeigt, dass es dasselbe ist – und zwar in dieser Richtung: **Der Wechselblock
ist eine Anwendung der getippten Tabelle, nicht umgekehrt.** Wer die Tabelle hat, kann
abwechseln, aber ebenso aufsteigen, 5/3/1 nachbauen, eine Entlastungswoche einstreuen oder
vier Wochen hinschreiben, die gar keinem Muster folgen.

Deshalb heißt der Baustein **Eigenbau** (Schlüssel `custom`) und nicht nach einer seiner
Anwendungen. Ein Name, der nur das Mischen nennt, würde bei jedem anderen Muster die Frage
auslösen, ob das überhaupt vorgesehen ist.

---

## 2. Ausgangslage: was heute geht und was nicht

### Die Beschreibung kann das System schon

Die Wochentabelle, die hinter Maximalkraft, Intensivierung und Test/Peak steckt, liegt als
`week_plan` an der Phase. Eine Zeile je Phasenwoche mit: Wochennummer, Sätze,
Wiederholungen, optionale obere Grenze, Ziel-RIR, Anteil am Arbeitsgewicht und ein kurzer
Wochentext. Die Form steht in `engine/weekPlan.ts` und ist dort die Quelle der Wahrheit.

Das reicht bereits aus, um beide Wochenarten hinzuschreiben: „4 Sätze, 4 Wiederholungen,
RIR 1" und „3 Sätze, 8–12 Wiederholungen, RIR 2". Wiederholungsbänder sind in der Zeile
vorgesehen (`repsMax`). Alles, was den Plan danach liest – Trainingsbildschirm, Coach,
Periodisierungskurve, Rückschau, Coach-Export –, fragt nicht, wer ihn geschrieben hat.

### Die heutige Gewichtsregel kann es nicht

In einer Phase mit Wochenplan merkt sich die App **ein einziges Arbeitsgewicht je Übung**:
den Anker (`reference_weight`, über `reference_phase_id` an die Phase gebunden). Er entsteht
beim Eintritt in die Phase aus den Wiederholungen der **ersten** Planwoche plus zwei in
Reserve und wandert danach je Journey-Woche einen `weight_step` nach oben, wenn die Vorwoche
sauber war (`engine/planLoad.ts`). Gesenkt wird nie.

Für einen Wechselblock ist das dreifach falsch:

- **Der Anker passt nur zu einer Wochenart.** Beginnt der Block mit einer
  Hypertrophiewoche, entsteht er aus zwölf Wiederholungen – grob 70 % des Maximums. In der
  Maximalkraftwoche stünden vier Wiederholungen auf genau diesem Gewicht.
- **Die Steigerung kennt nur eine Richtung.** Pro Woche einen Schritt hoch oder stehen
  bleiben. Ein Zickzack von 70 auf 80 auf 75 Prozent – der Sinn des Modells – ist damit
  nicht darstellbar.
- **Das Gedächtnis unterscheidet die Wochenarten nicht.** Die Frage „steigern wir?" schaut
  auf die letzte Journey-Woche, unabhängig von deren Art. Eine gelungene Hypertrophiewoche
  entschiede darüber, ob das Kraftgewicht hochgeht.

**Die Auflösung in Abschnitt 4 besteht darin, diese Regel für den neuen Baustein gar nicht
zu benutzen.** Der Anker und sein Gedächtnis bleiben unangetastet – sie gelten weiter für
Maximalkraft, Intensivierung und Test/Peak.

### Eine Phase mit Plan hat keine planfreien Wochen

`weekPlanForWeek` hält an den Rändern: vor Woche 1 gilt die erste Zeile, hinter der letzten
die letzte. Ein nicht leerer Plan liefert also für **jede** Woche eine Zeile. Eine Woche „an
den Coach zurückgeben" ist nicht möglich. Ein Block, in dem die Hypertrophiewoche per
Doppelprogression läuft und die Kraftwoche nach Plan, ist heute nicht abbildbar – und wird
es mit diesem Konzept auch nicht (Abschnitt 9).

### Was der Plan ohnehin nicht erreicht

Ein Wochenplan gilt nur für **Hauptübungen mit Kraftprofil** (`planGovernsExercise` in
`lib/coach.ts`: `profile === "strength"` und `tier === "main"`). Curl, Pull Over, Core und
Körpergewicht laufen weiter über die Doppelprogression. Das ist seit ADR-0018 so entschieden
und gilt heute in jeder Kraftphase. Für den Eigenbau ist es eher passend als störend,
muss dem Nutzer aber gesagt werden: „ich schreibe meinen Wochenplan selbst" klingt nach
mehr, als es tut.

---

## 3. Was die Trainingspraxis dazu sagt

Recherchiert am 24.08.2026. Das Modell heißt **Weekly Undulating Periodization** (WUP) und
ist gut dokumentiert.

### Die übliche Vorlage

- **Hypertrophiewoche:** 3–4 Sätze, 10–12 Wiederholungen, 65–70 % vom Maximum
- **Kraftwoche:** 4–5 Sätze, 6–8 Wiederholungen, 75–85 %

Das bekannteste ausgebaute Beispiel ist Wendlers 5/3/1 als Vierwochenzyklus: 65/75/85 %,
dann 70/80/90 %, dann 75/85/95 %, dann Entlastung mit 40/50/60 %. Eine schlichtere Regel aus
der Praxis: die leichte Woche liegt etwa 20 % unter der schweren.

### Drei Befunde, die das Konzept prägen

**Eine Bezugszahl, ein Prozentsatz je Woche.** Alle etablierten Programme arbeiten mit einer
einzigen Bezugszahl je Übung. Bei 5/3/1 heißt sie Training Max und liegt bewusst bei 90 %
des echten Maximums. Jede Woche ist ein Prozentsatz davon. Diese Bezugszahl steigt nicht
wöchentlich, sondern erst am Ende eines kompletten Zyklus – um 2,5 kg bei Oberkörper- und
5 kg bei Unterkörperübungen. **Zwei getrennt mitwachsende Gewichte macht in der Praxis
niemand.** Das ist der Grund, warum dieses Papier den teuren Weg (Abschnitt 9) verwirft.

**Die Intensität geht im Zickzack, nicht aufwärts.** Ein typischer Verlauf ist
70 → 80 → 75 → 85 %. Über eine Prozentliste ist das trivial, weil jede Woche ihren eigenen
Wert nennt und sich nicht aus der Vorwoche ableitet.

**Die Muster sind vielfältiger als „leicht, schwer, leicht, schwer".** In der Praxis finden
sich zwei Wochenarten, vier Wochenarten (schwer → leicht → schnell → Erholung), drei
Belastungsarten und zusätzlich rotierende Reihenfolgen über die Zyklen. Ein Baustein, der
ein Muster ausrechnet, könnte davon genau eines. Eine getippte Tabelle kann alle. **Das ist
das Hauptargument dafür, den Baustein tippen und nicht rechnen zu lassen.**

### Was wir nicht bauen: die Tagesvariante

Ein Teil der Literatur beschreibt **Daily** Undulating Periodization – die Belastung wechselt
von Einheit zu Einheit innerhalb derselben Woche (etwa: Montag 70 % 3×10, Mittwoch 85 % 5×5,
Freitag 60 % 6×3). Das ist für Kraftschmiede die deutlich teurere Variante, weil die App
bewusst **keine festen Trainingstage** kennt: `journey_workouts` ist eine ungeordnete
Ja/Nein-Menge, die Reihenfolge bestimmt der Coach. Eine Vorgabe „montags schwer" hätte
keinen Ort, an dem sie hängen könnte. Bleibt außen vor.

### Zur Wirksamkeit, nüchtern

Ältere Arbeiten (Rhea 2002) berichten bei gleichem Volumen fast doppelte Kraftzuwächse
allein durch die andere Reihenfolge. Diese Größenordnung ist nicht bestätigt worden. Die
belastbare Zahl kommt aus der volumengleichen Meta-Analyse von Moesgaard 2022: **3 bis 5 %
besseres Maximalkraft-Ergebnis, gleichwertiger Muskelaufbau.** Genau diese Arbeit trägt
schon heute die Entscheidung in ADR-0018 – wir haben uns dort bereits auf die nüchterne
Lesart festgelegt und bleiben dabei.

Für die Bau-Entscheidung heißt das: 3 bis 5 % rechtfertigen **keinen** Umbau daran, wie die
App sich Gewichte merkt. Sie rechtfertigen einen abgegrenzten neuen Baustein.

---

## 4. Die Entscheidung: der vierte Steuerweg

Der Baustein trägt **beide Listen, beide getippt**:

- die **Wochentabelle** (`week_plan`) gibt Sätze, Wiederholungen und Ziel-RIR vor,
- die **Lastliste** (`load_plan`) gibt je Woche das Gewicht als Anteil einer Bezugszahl vor.

Die heutige Anker-Regel (`planWeekLoad`) kommt für diesen Baustein **nicht** zum Einsatz.

### Warum das sauber ist

ADR-0018 kannte bisher drei Steuerwege. Sein Nachtrag hält ausdrücklich fest, dass „wer gibt
Sätze und Wiederholungen vor" und „wer gibt das Gewicht vor" **zwei getrennte Fragen** sind
– der Wiederaufbau hat sie getrennt. Damit ergibt sich eine Matrix, in der bisher ein Feld
frei war:

| Steuerweg | Sätze / Wdh. / RIR | Gewicht |
| --- | --- | --- |
| 1 – Kraft, Intensivierung, Test/Peak | Wochentabelle | Coach (Anker + Wochenschritt) |
| 2 – Hypertrophie, Kraftausdauer, Wiedereinstieg, Erhaltung | Coach | Coach |
| 3 – Wiederaufbau | Coach | Lastliste |
| **4 – Eigenbau (neu)** | **Wochentabelle** | **Lastliste** |

Der neue Baustein füllt das leere Feld. Er ist keine Sonderlocke, sondern die letzte
verbleibende Kombination – und beide Hälften sind gebaut und getestet.

Der Nachtrag zu ADR-0018 hält außerdem fest, dass der Wochenplan gewänne, falls eine Phase je
beides trüge, und dass heute kein Baustein beides kombiniert. **Dieser Vorrang wird hier
nicht gebraucht:** Es gibt keinen Konflikt, weil jede Liste eine andere Frage beantwortet.
Der Satz im Nachtrag bezog sich darauf, dass beide dasselbe Gewicht vorgeben könnten – das
tut die Wochentabelle hier gerade nicht.

Damit gilt:

- Der Zickzack funktioniert, weil jede Woche ihren eigenen Anteil nennt.
- Der Anker und sein Gedächtnis werden nicht angefasst.
- Getippter Plan und Wechselblock sind zusammen erledigt, es ist ein Baustein.
- Wer 5/3/1 nachbauen will, kann das; wer vier Wochenarten will, auch.

Der Preis steht in Abschnitt 9 und ist bewusst akzeptiert: innerhalb des Blocks wächst das
Gewicht nicht aus der Leistung mit, es folgt den getippten Anteilen.

---

## 5. Wie eine Zeile aussieht

Der Nutzer füllt eine Tabelle mit einer Zeile je Phasenwoche:

| Woche | Sätze | Wiederholungen | Ziel-RIR | Anteil |
| --- | --- | --- | --- | --- |
| 1 | 3 | 8–12 | 2 | 70 % |
| 2 | 4 | 4 | 1 | 88 % |
| 3 | 3 | 8–12 | 2 | 73 % |
| 4 | 4 | 3 | 1 | 92 % |

Die ersten vier Spalten werden zur Wochentabelle, die letzte zur Lastliste. Für den Nutzer
ist es eine Tabelle; dass sie in den Daten auf zwei Listen fällt, merkt er nicht.

Der Wochentext (`note`) bleibt vorerst außen vor: Die Kraftphasen setzen ihn seit #275
bewusst leer, weil Sätze, Wiederholungen und RIR sich selbst erklären. Ob ein getippter
Block ein Textfeld verdient, entscheidet sich am fertigen Bildschirm.

---

## 6. Die Bezugszahl – der offene Kern

> **Kurz gesagt.** Die Prozente brauchen eine Zahl, auf die sie sich beziehen. Drei kommen
> in Frage, und die Wahl entscheidet, ob die Zahlen aus der Literatur bei uns dasselbe
> bedeuten. Empfohlen: das gespeicherte Maximum, bewusst gedämpft, und beim Journey-Start
> eingefroren.

Alle Beispiele aus Abschnitt 3 sind Prozente **vom Maximum**, nicht vom Arbeitsgewicht. Die
Lastliste bezieht sich heute aber auf `reference_weight`: das Arbeitsgewicht, beim
Journey-Start eingefroren (`rampLoad` in `lib/coach.ts` rechnet `referenceWeight × Anteil`).

### Was das gespeicherte Maximum wirklich ist

Wichtig für die Wahl, und leicht misszuverstehen: `rm` ist **kein Testergebnis, sondern ein
beweisgebundener Rekord** (`engine/oneRM.ts`). Nach jeder Einheit schätzt die App aus den
sauberen Arbeitssätzen ein Maximum und übernimmt es nur, wenn es höher liegt als das
gespeicherte – und nur aus Sätzen mit höchstens `RECORD_MAX_REPS` (5) Wiederholungen.

Daraus folgen zwei Eigenschaften, die die ganze Entscheidung tragen:

- **Er steigt nur.** Von allein sinkt er nie; das kann nur ein bewusster 1RM-Test.
- **Er steht auf der Bestmarke**, nicht auf der Tagesform.

„Das 1RM nehmen" und „es aus den Einheiten rechnen" sind damit **derselbe** Weg – das eine
ist das gespeicherte Ergebnis des anderen. Es gibt hier also keine zwei Optionen, sondern
drei ganz andere.

### Die drei Varianten

Beispiel: Rekord der Kniebeuge 140 kg, normales Arbeitsgewicht 100 kg.

| Bezug | Hypertrophiewoche (70 %) | Kraftwoche (88 %) | Urteil |
| --- | --- | --- | --- |
| Arbeitsgewicht (`reference_weight`) | 70 kg | 88 kg | zu leicht – für eine echte Kraftwoche bräuchte es 125 % |
| Rekord roh (`rm`) | 98 kg | 123 kg | richtige Größenordnung, aber an einer Bestmarke, die nie fällt |
| **Rekord gedämpft (90 % = 126 kg)** | **88 kg** | **111 kg** | **empfohlen** |

Die erste Variante kostet nichts, macht aber die Zahlen aus der Literatur bedeutungslos: Du
müsstest bei jedem Block selbst umrechnen, und schwere Wochen lägen dauerhaft über 100 %,
was das Vokabular der Lastliste („Anteil", „Entlastung", „volle Last") auf den Kopf stellt.

Die zweite trifft die Größenordnung, hängt aber an einem Wert, der nur nach oben geht. Nach
einer Erkältungspause oder drei ruhigen Monaten steht dort immer noch die alte Bestmarke –
und 123 kg fühlen sich dann sehr anders an als geplant.

Die dritte ist die Antwort der Praxis auf genau dieses Problem: Der Training Max bei 5/3/1
liegt bewusst bei 90 % des echten Maximums. Der Puffer fängt eine optimistische Schätzung
ab, ohne dass der Nutzer irgendetwas nachrechnen muss.

### Die zweite Frage: wann wird eingefroren?

Rechnet die App den Bezug bei jeder Einheit frisch aus, verschiebt eine Bestmarke in Woche 2
den Rest des Blocks – Woche 3 wäre plötzlich schwerer als geplant. Wird er beim Journey-Start
eingefroren, steht der Block so, wie er getippt wurde, und ein neuer Rekord wirkt erst im
nächsten Block.

**Vorschlag: einfrieren.** Das ist auch der Rhythmus von 5/3/1 (der Bezug steigt einmal je
Zyklus), und die App friert beim Journey-Start ohnehin schon Werte ein.

### Was das technisch heißt

Die Lastliste muss lernen, auf **welche** Bezugszahl sie sich bezieht. Heute ist das implizit
immer `reference_weight`. Das ist der einzige echte Zubau an der Mechanik.

### Zwei Haken, die dazugehören

- **Nicht jede Übung hat ein Maximum.** Bei Ausfallschritten und ähnlichem fällt die App auf
  das letzte Arbeitsgewicht zurück. Dieselben Prozentzahlen bedeuten dort etwas anderes als
  bei der Kniebeuge. Das ist heute schon so und fällt bisher nicht auf, weil nur das
  Startgewicht daran hängt – bei einem Prozent-Block hängt jede Woche daran.
- **Das Risiko ist die Richtung, nicht das Alter.** Ein Rekord, der nie fällt, ist nach einer
  Pause zu hoch, egal wie frisch er datiert ist (`rm_as_of` kennt das Datum, gewarnt wird
  nirgends). Die Dämpfung ist die eigentliche Antwort; ein Hinweis wäre höchstens für „lange
  nicht trainiert" sinnvoll, und dann eher beim Journey-Start als im Editor.

### Warum keine festen Kilo statt Prozente

Naheliegend und leider unmöglich: Die getippte Tabelle gilt für **alle** Hauptübungen
gleichzeitig (Abschnitt 9). „90 kg" wäre für Kniebeuge, Bankdrücken und Kreuzheben
gleichzeitig sinnlos – ein Prozentsatz skaliert je Übung, eine Kilozahl nicht. Feste Kilo
setzten eine Tabelle **je Übung** voraus, und das ist ausdrücklich ein anderes Vorhaben.

Die Sorge dahinter („Prozente sind zu abstrakt") lässt sich trotzdem auflösen, aber am
Bildschirm statt in den Daten: Die Zeile kann neben dem Prozentsatz zeigen, was daraus für
deine Übungen wird („70 % · Kniebeuge 88 kg, Bank 62 kg"). Dann tippst du Prozente und liest
Kilo. Gehört in Abschnitt 10.

---

## 7. Was das in der Datenbank bedeutet

> **Kurz gesagt.** Drei Dinge ändern sich. Erstens bekommt die Liste der Bausteine eine
> neunte Zeile – dort steht, wie der Eigenbau heißt und was an ihm einstellbar ist.
> Zweitens bekommt die Vorlagenphase **eine** neue Spalte, in der die getippte Tabelle
> liegt; sie heißt so, dass man ihr ansieht, dass nur dieser eine Baustein sie benutzt.
> Drittens braucht die Wochentabelle einen Vermerk „getippt, nimm sie wie sie ist" – nicht
> wegen einer Rechnung, sondern damit die App überhaupt weiß, dass die Tabelle das Sagen
> hat. Fürs Gewicht braucht es keinen solchen Vermerk. Der Rest dieses Abschnitts sind die
> genauen Feld- und Regelnamen für den Bau.

### Der neunte Baustein

`phase_types` bekommt eine neunte Zeile je Nutzer. Die Eckwerte, so weit sie feststehen:

| Feld | Wert |
| --- | --- |
| `key` | `custom` – englisch wie alle acht bestehenden Schlüssel |
| `name` | „Eigenbau" – deutsch wie alle acht Anzeigenamen |
| `control` | `plan`, die Tabelle regiert |
| `plan_builder` | die neue Bauregel, siehe unten |
| `load_builder`, `load_start_default`, `load_end_default` | leer, siehe unten |
| `sets_locked`, `rep_band_locked` | `true` – Satzrampe und Band sind wirkungslos |
| `careful` | `false` |
| `deload_allowed` | `false` – eine Entlastungswoche wird als Zeile getippt |
| `weeks_min` / `weeks_max` / `weeks_default` | offen, Abschnitt 11 |
| Satzrampe und Band (`sets_*`, `rep_*`) | wirkungslos, brauchen aber Werte – `sets_max` muss mindestens die Rampe decken, ein Band darf leer bleiben, solange auch der Korridor leer ist |

Dazu ein `summary` in der Form der anderen acht, der sagt, was der Baustein tut statt wie er
heißt. Dafür nötig:

- Der Schlüssel muss in die `CHECK`-Liste der Migration 0043 und in `focusEnum`
  (`src/schemas/shared.ts`). Beide Phasentabellen zeigen seit Migration 0048 per
  Fremdschlüssel auf `phase_types (user_id, key)`
  ([ADR-0021](./adr/0021-phasentyp-fremdschluessel.md)) – ein erfundener Fokus ist damit
  ausgeschlossen, ein neuer muss durch beide Stellen.
- Der Seed legt Bausteine vor den Journey-Vorlagen an (`src/lib/seedWrite.ts`); die neue Zeile
  reiht sich dort ein.

### Der Speicherort in der Vorlage: eine Spalte `custom_plan`

Das ist der eigentliche Eingriff, und er ist am 24.08.2026 entschieden: **eine** neue,
nullbare Spalte an `journey_template_phases`, die die getippte Tabelle als jsonb hält.
Der Name sagt, wem sie gehört – `custom_plan` oder ähnlich, jedenfalls nicht `week_plan`.

**Warum überhaupt gespeichert wird.** Eine Bauregel ist eine Funktion; sie läuft beim
Journey-Start und hat kein Gedächtnis. Zwischen dem Tippen der Tabelle und dem Start
können Monate liegen. Die Zahlen müssen also irgendwo liegen, und die vorhandenen Spalten
können sie nicht halten: Dort steht **eine** Satzrampe und **ein** Band für die ganze
Phase, kein Wert je Woche und kein RIR.

**Warum es kein Rückbau von Migration 0050 ist.** 0050 hat `week_plan` und `load_plan` aus
dieser Tabelle entfernt, weil beide **Kopien** eines Rechenergebnisses waren – ableitbar
aus Baustein und Wochenzahl, und damit überflüssig und veraltungsfähig. Die neue Spalte ist
das Gegenteil: eine **Quelle**, Zahlen, die es sonst nirgends gibt. Eine Kopie abzuschaffen
hindert nie daran, später eine Quelle anzulegen. Für die acht gerechneten Bausteine bleibt
0050 unverändert gültig, sie speichern weiterhin nichts.

Die Migration selbst hat diesen Fall sogar vorgesehen. Dort steht wörtlich, der Fall „die
Phase nennt ihre Stufen selbst" sei nicht zurückgekommen, weil ihn keine Vorlage nutze –
und: soll eine Vorlage das künftig können, *bekommt sie ein eigenes Feld, das ausdrücklich
so heißt, und keine Kopie des Gebauten*. Genau das wird hier umgesetzt.

**Warum der Name zählt.** An der laufenden Phase ist der Wochenplan ein *Ergebnis*: beim
Start gerechnet und danach eingefroren. In der Vorlage ist die Tabelle eine *Eingabe*.
Gleiche Form, entgegengesetzte Rolle. Hießen beide `week_plan`, hielte in einem Jahr jemand
die Vorlagenspalte für einen Zwischenspeicher und räumte sie auf.

**Die Datenbank schreibt die Zugehörigkeit selbst fest.** Damit die Spalte keine still
mitlaufende Sonderregel wird, bekommt sie einen `CHECK` in der Form, die `phase_types`
schon benutzt:

```
(focus = 'custom') = (custom_plan is not null)
```

Das bindet beides aneinander: Kein anderer Baustein kann die Spalte je füllen, und ein
Eigenbau ohne Tabelle kann gar nicht erst entstehen. Damit ist die Ausnahme nicht mehr
stillschweigend, sondern in der Datenbank erklärt – und die leere Spalte bei acht
Bausteinen ist keine Nachlässigkeit, sondern eine erzwungene Aussage.

**Eine Eingabe, zwei Listen.** Für den Nutzer ist es eine Tabelle. Beim Journey-Start
zerlegt die Bauregel sie in die beiden Listen, die die Engine schon kennt: Sätze,
Wiederholungen und RIR werden zur Wochentabelle der Phase, die Prozentspalte zur Lastliste
(Abschnitt 4). Die Phase sieht danach aus wie jede andere.

Damit erledigt sich nebenbei Abschnitt 5 des
[Ideenpapiers zum Journey-Editor](./Idee-Journey-Editor.md): Die dort geforderten Spalten
`load_start`/`load_end` für den Wiederaufbau werden von der allgemeineren Lösung
mitabgedeckt, sobald eine Phase ihre Anteile selbst nennen darf.

### Die Bauregeln: eine neue, nicht zwei

Am 24.08.2026 gegen die Live-Tabelle und ihre `CHECK`s geprüft. Das Ergebnis ist eindeutig
und fiel anders aus als zunächst angenommen.

**Für die Wochentabelle braucht es eine neue Bauregel.** `plan_builder` ist heute ein Enum
aus `strength_ladder`, `power_ladder` und `test`, und drei `CHECK`s hängen daran – alle
zeigen in die gewünschte Richtung: `phase_types_plan_stimmig` bindet `control = 'plan'` an
eine gesetzte Bauregel, `phase_types_saetze_stimmig` erzwingt damit `sets_locked`, und
`phase_types_band_ruht_nur_im_plan` erlaubt ein ruhendes Band nur mit Bauregel. Genau das
soll gelten: Die Tabelle regiert, Satzrampe und Band sind wirkungslos. Erweitert werden
müssen die `CHECK`-Listen an `phase_types` **und** an `phases`. Zur Laufzeit hängt an der
Bauregel außerdem die Weiche aus Abschnitt 8 (`hasPlanBuilder`).

**Für die Lastliste braucht es keine.** Drei Gründe:

- **Es entscheidet nichts daran.** Anders als `plan_builder`, an dem vier Funktionen hängen
  (`hasPlanBuilder`, `buildsRisingPlan`, `buildsTestPlan`, `planGovernsLoad`), wird
  `load_builder` zur Laufzeit nirgends abgefragt – er ist reiner Vermerk. Ob eine Phase
  überhaupt eine Last vorgibt, liest `usesLoadPlan` an der Liste selbst.
- **Der `CHECK` passt nicht.** `phase_types_last_stimmig` erzwingt
  `(load_builder is not null) = (load_start_default is not null)` und deckelt
  `load_end_default` bei 1. Eine getippte Liste hat aber weder Start- noch Zielanteil,
  sondern Werte – und der Deckel kollidiert mit der offenen Frage aus Abschnitt 6.
- **Der Weg existiert schon.** `buildPhasePlans` baut aus getippten Stufen eine Lastliste und
  lässt den Vermerk dabei leer; `phases.load_builder` erlaubt `null` ausdrücklich. Eine Phase
  mit Lastliste ohne Bauregel ist damit heute schon eine gültige Form.

Der Baustein trägt `load_builder`, `load_start_default` und `load_end_default` also allesamt
leer, und `phase_types_last_stimmig` ist ohne jede Änderung erfüllt. Der Deckel bei 100 %
gilt nur für den Vorgabe-Verlauf eines Bausteins, nicht für getippte Wochenanteile: Die
Lastliste selbst kennt keine Obergrenze (`loadPct` ist lediglich `positive()`), die Frage aus
Abschnitt 6 ist datenseitig also nicht blockiert.

Damit bleibt der Bauart-Vermerk aussagekräftig: Die Wochentabelle sagt weiterhin, was sie
tut – die Festlegung aus Teil 1 bleibt gewahrt –, und die Lastliste braucht das nie
behauptet zu haben.

**Dafür gibt es ein wörtliches Vorbild.** `PhaseAdjustments.load` erlaubt schon heute
ausdrücklich vorgegebene Laststufen, die die Bauregel des Bausteins ersetzen („getippte
Stufen gehen vor", `buildPhasePlans` in `engine/phaseBuild.ts`, gebaut über
`loadPlanFromShares`). Die Lastliste dieses Bausteins geht genau diesen Weg; für die
Wochentabelle entsteht daneben dasselbe Muster.

---

## 8. Was die Engine lernen muss

> **Kurz gesagt.** Auch hier drei Stellen. Die App koppelt heute zwei Fragen aneinander,
> die beim Eigenbau auseinanderfallen: „gibt es eine Wochentabelle?" und „bestimmt sie das
> Gewicht?". Die müssen getrennt werden. Dann muss der Coach lernen, Sätze und
> Wiederholungen aus der Tabelle zu nehmen und das Gewicht aus der Prozentliste – heute
> kann er nur entweder-oder. Und die Deckelung des Gewichts muss geprüft werden. Alles
> andere – Anzeige, Kurve, Rückschau, Export – bleibt unberührt.

Drei Stellen, alle klein und benennbar.

**Die Weiche im Phasen-Standort trennen.** `lib/phaseContext.ts` baut den Plan-Bezug heute
nur, wenn `planGovernsLoad(phase)` wahr ist – die Bedingung koppelt „es gibt eine
Wochentabelle" an „die Wochentabelle bestimmt das Gewicht". Für den neuen Baustein gilt das
erste, aber nicht das zweite. Die beiden Fragen müssen auseinander: Ob ein Plan-Bezug
entsteht, entscheidet `hasPlanBuilder`; ob er das Gewicht setzt, weiterhin `planGovernsLoad`
(`engine/weekPlan.ts`). Die neue Bauregel kommt in die erste Liste und **nicht** in die
zweite.

**Vorschlag kombinieren.** `suggestForExercise` (`lib/coach.ts`) ist heute
Entweder-oder: Entweder der Plan liefert den ganzen Vorschlag (`planSuggestion`, inklusive
Gewicht über `planWeekLoad`), oder der Coach rechnet und die Lastliste greift im Fallback.
Der vierte Steuerweg braucht die Mischung: Sätze, Wiederholungen und RIR aus der Tabelle, das
Gewicht aus der Lastliste. Das ist die eigentliche Bauarbeit dieses Vorhabens.

**Die Deckelung über 100 % prüfen.** `rampLoad` liefert neben dem Gewicht ein Kennzeichen,
ob der Wert Obergrenze ist (`cap`) – gesetzt wird es nur unterhalb der vollen Last. Oberhalb
gilt der Wert nur als Untergrenze, der Coach dürfte also darüber gehen. Für eine vorgegebene
schwere Woche ist das falsch: Dort ist der Wert das Ziel. Fällt die Entscheidung in
Abschnitt 6 zugunsten des 1RM als Bezug, liegen die Anteile ohnehin unter 100 % und der Fall
tritt seltener ein – geprüft werden muss er trotzdem.

Nicht angefasst werden: der Anker und sein Gedächtnis, die Doppelprogression, die
Wochen-Buchhaltung, die Anzeige der Lastliste. Letztere ist der stille Gewinn dieses
Zuschnitts: Weil das Gewicht über die Lastliste läuft und nicht über die Wochenzeile,
funktionieren Phasenliste, Hinweistext, Spannenbeschriftung, Periodisierungskurve, Rückschau
und Coach-Export ohne Änderung mit (`loadPercent`, `loadSpanLabel`, `loadFactorNote`,
`bandLoadLabel`). Zu prüfen bleibt nur der Wortlaut: `loadFactorNote` nennt jeden Anteil ab
100 % „volle Last", was bei einem Wechselblock schief klingen kann.

---

## 9. Was der Baustein bewusst nicht kann

- **Keine Steigerung aus der Leistung heraus.** Innerhalb des Blocks folgen die Gewichte den
  getippten Anteilen. Wer stärker wird, merkt es erst im nächsten Block, wenn die Bezugszahl
  neu bestimmt wird. Das entspricht der gängigen Praxis (Abschnitt 3), ist aber ein anderes
  Gefühl als der sonst mitdenkende Coach – und muss auf dem Bildschirm gesagt werden.
- **Keine getrennten Gewichte je Wochenart.** Der teure Weg. Verworfen, weil ihn die Praxis
  nicht geht und 3–5 % ihn nicht tragen.
- **Keine planfreien Wochen.** Ist eine Tabelle da, gilt sie für alle Wochen. Eine
  „Hypertrophiewoche nach Doppelprogression" innerhalb desselben Blocks gibt es nicht; sie
  wird als Zeile mit Band geschrieben.
- **Keine Werte je Übung.** Die Tabelle gilt für alle Hauptübungen gleich. Bank 5×5 neben
  Kniebeuge 3×8 in derselben Woche ist ein anderes, deutlich größeres Vorhaben – die Listen
  hängen an der Phase, nicht an der Übung.
- **Keine Tagesvariante.** Siehe Abschnitt 3.
- **Keine Wirkung auf Zusatzübungen.** Wie in jeder Phase mit Plan.

---

## 10. Die Oberfläche

Der Baustein fällt aus dem Bedienschema des
[Ideenpapiers zum Journey-Editor](./Idee-Journey-Editor.md). Dort folgt alles aus „fest, im
Korridor, frei", und jede Einstellung ist ein Regler mit Anschlag. Hier ist die Einstellung
eine Tabelle mit einer Zeile je Woche und fünf Spalten.

Das ist der aufwendigste Teil des Vorhabens und auf dem Telefon der anspruchsvollste
Bildschirm, den die App bisher hätte. Er gehört deshalb **nicht** in dieses Papier, sondern
wird eigenständig besprochen, sobald die Datenseite steht. Absehbar ist nur:

- **Die Wochenzahl ist frei innerhalb der Spanne des Bausteins**, genau wie überall sonst.
  Die vier Zeilen der Beispieltabelle in Abschnitt 5 sind ein Beispiel und keine Festlegung;
  die Spanne selbst steht in Abschnitt 11 zur Entscheidung.
- **Die Tabelle führt die Wochenzahl, nicht ein Regler.** Zeile hinzufügen, Zeile löschen,
  die Spanne des Bausteins bremst. Ein Regler würde hier selbst getippte Zeilen anlegen und
  wegnehmen: nach unten ginge Arbeit verloren, nach oben müsste die App raten, was in der
  neuen Zeile steht – und ein Muster fortzuschreiben wäre genau das Rechnen, das dieser
  Baustein nicht tut. Bei den acht anderen Bausteinen bleibt der Regler, dort wird die Liste
  ohnehin neu gerechnet.
- **Prozente tippen, Kilo lesen.** Ein Prozentsatz ist abstrakt, und feste Kilo scheiden
  aus (Abschnitt 6). Die Zeile kann aber zeigen, was aus dem Anteil für die eigenen Übungen
  wird – „70 % · Kniebeuge 88 kg, Bank 62 kg". Dann bleibt die Eingabe skalierbar und die
  Anzeige konkret.
- **Nicht jede Wochenzahl ist gleich sinnvoll.** Ein Wechsel hat eine Periode; bei einer
  ungeraden Wochenzahl endet der Block mitten im Zyklus. Warnen kann die App davor nicht, weil
  sie das getippte Muster nicht kennt – dafür steht jede Woche als eigene Zeile sichtbar da.
- Eine leere oder halb gefüllte Tabelle darf nicht startbar sein.
- Eine Vorbelegung, die man überschreibt, ist besser als ein leeres Raster.

---

## 11. Zu entscheiden

- **Die Bezugszahl (Abschnitt 6).** Der wichtigste Punkt, drei Varianten: Arbeitsgewicht,
  Rekord roh, Rekord gedämpft. Empfohlen ist der gedämpfte Rekord – nur damit bedeuten die
  Zahlen aus der Literatur bei uns dasselbe, und der Puffer fängt ab, dass der Rekord eine
  Bestmarke ist, die nie fällt. Zu entscheiden ist damit auch der Dämpfungsfaktor (5/3/1
  nimmt 90 %) und ob die Lastliste eine zweite Bezugsart lernt.
- **Wann der Bezug eingefroren wird (Abschnitt 6).** Beim Journey-Start oder bei jeder
  Einheit frisch. Empfohlen: einfrieren, sonst verschiebt eine Bestmarke mitten im Block
  dessen restliche Wochen.
- **Ob ein Hinweis nach langer Pause nötig ist.** Nicht wegen des Alters des Rekords,
  sondern weil er nur steigt und nach einer Pause zu hoch steht. Wenn überhaupt, beim
  Journey-Start statt im Editor.
- **Ob der Anteil eingetippt wird** oder ob eine Vorbelegung je Wochenart („leicht / mittel /
  schwer") die Tabelle schmaler macht. Eine Frage an den Bildschirm, nicht an die Daten.
- **Wochengrenzen des Bausteins.** `weeks_min`/`weeks_max` müssen gesetzt werden. Die
  Vierwochenzyklen der Literatur legen 4 bis 8 nahe.

---

## 12. Vorgeschlagener Schritt-Zuschnitt

Erst wenn abgestimmt ist, dass gebaut wird, entstehen daraus ein Vorhaben-Issue und die
Schritt-Issues.

1. **Speicherort in der Vorlage.** Migration: eine neue nullbare Spalte `custom_plan` an
   `journey_template_phases`, samt dem `CHECK`, der sie an `focus = 'custom'` bindet. Dazu
   Schema und Schreibnaht. Solange es den neunten Baustein nicht gibt, kann die Spalte gar
   nicht gefüllt werden und nichts ändert sich.
2. **Der neunte Baustein.** Migration (Schlüssel in `CHECK` und `focusEnum`, Baustein-Zeile je
   Nutzer, die neue Bauregel der Wochentabelle in beiden `CHECK`-Listen), Seed, Schema,
   Bezugszahl nach Abschnitt 6. Danach existiert er, ohne dass man ihn bedienen kann.
3. **Die Weiche trennen.** `hasPlanBuilder` statt `planGovernsLoad` als Bedingung für den
   Plan-Bezug (Abschnitt 8). Für die bestehenden Bausteine ändert sich nichts – beide
   Antworten fallen dort zusammen. Für sich testbar.
4. **Der vierte Steuerweg wirkt.** `suggestForExercise` kombiniert Tabelle und Lastliste, die
   Deckelung wird geprüft, Journey-Start und Vorlagen-Vorschau lesen `custom_plan` und
   zerlegen es in die beiden Listen, statt sie zu rechnen. Danach läuft eine von Hand
   eingetragene Vorlage vollständig durch.
5. **Der Bildschirm.** Eigenes Konzept, siehe Abschnitt 10.
6. **Doku.** `Architektur.md`, Nachtrag zu ADR-0018 um den vierten Steuerweg samt der Matrix
   aus Abschnitt 4, dieses Papier auf den gebauten Stand ziehen.

Die Schritte 1 bis 4 sind die Datenseite und für sich abgeschlossen: Danach ließe sich ein
Eigenbau-Block per Migration als Vorlage anlegen und benutzen, auch ohne Editor. Das ist
absichtlich so geschnitten – es macht den teuren Schritt 5 überprüfbar, bevor er gebaut wird.

---

## Quellen

- Moesgaard L. et al. (2022): *Effects of Periodization in Volume-Equated Resistance Training
  Programs.* Sports Med 52(7). [PubMed](https://pubmed.ncbi.nlm.nih.gov/35044672/) – die
  belastbare Zahl (3–5 %), zugleich Grundlage von ADR-0018.
- Williams T. et al. (2017): Meta-Analyse zu periodisiertem Training, 18 Studien.
  Periodisiert schlägt nicht-periodisiert; wechselnde Modelle liegen bei Fortgeschrittenen
  vorn.
- Rhea M. et al. (2002): die oft zitierte Ausgangsstudie mit sehr großen Effekten. Hier
  bewusst **nicht** als Erwartungswert verwendet.
- [Weekly Undulating Periodization – Brookbush Institute](https://brookbushinstitute.com/glossary/weekly-undulating-periodization)
- [Training Max Definition & Examples – Lift Vault](https://liftvault.com/resources/531-training-max-definition-examples/)
  und [5/3/1 Program Guide – Type A Training](https://www.typeatraining.com/blog/5-3-1-program-guide-jim-wendlers-proven-strength-system/)
  – Zahlen zum Training Max und den Wochenprozenten.
- [Complete Guide to Undulating Periodization – Adam Loiacono](https://adamloiacono.com/undulating-periodization-for-smarter-strength-gains/)
  – Tagesvariante, Vergleichstabelle der Modelle, Hinweis „requires precise monitoring of
  load".
- [RPE vs. Percentage 1RM Loading in Periodized Programs – Frontiers in Physiology](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2018.00247/full)
  – Prozentsteuerung gegen Anstrengungssteuerung; Hintergrund zu Abschnitt 6.
