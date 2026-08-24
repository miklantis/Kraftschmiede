# Der Eigenbau-Baustein: eine getippte Wochentabelle – Konzept

> Doku-Typ: Konzept. Hält den besprochenen Stand fest, bevor gebaut wird. Noch nicht in
> Umsetzung, es liegen bewusst keine Issues dazu. Grundlage:
> [`Konzept-Bausteine-Datenstruktur.md`](./Konzept-Bausteine-Datenstruktur.md) (Teil 1,
> gebaut), [`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md)
> samt Nachtrag und [`Architektur.md`](./Architektur.md).
>
> Stand 24.08.2026: gegen Code, Schema und die Live-Tabelle `phase_types` durchgeprüft, dazu
> eine Recherche zur Trainingspraxis (Abschnitt 3, Quellen am Ende). Entschieden und damit
> nicht mehr offen: Name und Schlüssel des Bausteins (Eigenbau / `custom`, Abschnitt 1) und
> die Bauregeln (Abschnitt 7). Was noch zu entscheiden ist, steht in Abschnitt 11.

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

Alle Beispiele aus Abschnitt 3 sind Prozente **vom Maximum**, nicht vom Arbeitsgewicht. Die
Lastliste bezieht sich heute aber auf `reference_weight`: das Arbeitsgewicht, beim
Journey-Start eingefroren (`rampLoad` in `lib/coach.ts` rechnet `referenceWeight × Anteil`).

Das passt nicht zusammen, und der Unterschied ist groß genug, um das Feature unbrauchbar zu
machen: Ein Arbeitsgewicht für 8–12 Wiederholungen liegt bei rund 70 % des Maximums. „88 %"
davon wären etwa 62 % des Maximums – als Maximalkraftwoche deutlich zu leicht. Umgekehrt
müssten die Anteile einer schweren Woche regelmäßig über 100 % liegen, was das ganze
Vokabular der Lastliste („Anteil", „Entlastung", „volle Last") auf den Kopf stellt.

**Vorschlag: die Lastliste dieses Bausteins bezieht sich auf ein gedämpftes 1RM.** Die App
führt je Übung ein geschätztes Maximum (`rm`, `rm_as_of`, `rm_stale`); der Plan-Weg rechnet
damit heute schon sein Startgewicht aus. Wie bei 5/3/1 wird nicht das volle Maximum als Bezug
genommen, sondern ein Anteil davon (dort 90 %) – das fängt eine zu optimistische Schätzung
ab, ohne dass der Nutzer rechnen muss.

Technisch heißt das: Die Lastliste muss lernen, auf **welche** Bezugszahl sie sich bezieht.
Heute ist das implizit immer `reference_weight`. Das ist der einzige echte Zubau an der
Mechanik, und er gehört in die Entscheidung (Abschnitt 11).

Zwei Haken, die dazugehören:

- **Nicht jede Übung hat ein 1RM.** Bei Ausfallschritten und ähnlichem fällt die App auf das
  letzte Arbeitsgewicht zurück. Dieselben Prozentzahlen bedeuten dort etwas anderes als bei
  der Kniebeuge. Das ist heute schon so und fällt bisher nicht auf, weil nur das
  Startgewicht daran hängt – bei einem Prozent-Block hängt jede Woche daran.
- **Das 1RM ist eine Schätzung ohne Verfallsdatum.** `rm_stale` merkt sich, ob überhaupt ein
  frischer Wert vorliegt, nicht wie alt er ist. Prozente auf einer veralteten Schätzung
  laufen still daneben. Die Dämpfung oben ist die Antwort darauf; ob zusätzlich eine Warnung
  nötig ist, steht in Abschnitt 11.

---

## 7. Was das in der Datenbank bedeutet

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
- Der Seed legt Bausteine vor den Journey-Vorlagen an (`src/lib/seed.ts`); die neue Zeile
  reiht sich dort ein.

### Der Speicherort in der Vorlage

Das ist der eigentliche Eingriff. Migration 0050 hat `week_plan` und `load_plan` aus
`journey_template_phases` **entfernt**, weil beide Listen aus Baustein und Wochenzahl
vollständig ableitbar waren. Für getippte Listen stimmt das nicht mehr: Sie sind die
Einstellung, nicht ihre Folge.

Beide Listen müssen an der Vorlagenphase wieder einen Platz bekommen. **Das ist kein Rückbau
von 0050:** Für die acht bestehenden Bausteine bleibt die Begründung richtig, und sie bleiben
ohne gespeicherte Liste. Nur der neue Baustein speichert seine Tabellen. Die Migration
schreibt das ausdrücklich so hin, damit später niemand den Widerspruch sucht.

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
- **Nicht jede Wochenzahl ist gleich sinnvoll.** Ein Wechsel hat eine Periode; bei einer
  ungeraden Wochenzahl endet der Block mitten im Zyklus. Warnen kann die App davor nicht, weil
  sie das getippte Muster nicht kennt – dafür steht jede Woche als eigene Zeile sichtbar da.
- Eine leere oder halb gefüllte Tabelle darf nicht startbar sein.
- Eine Vorbelegung, die man überschreibt, ist besser als ein leeres Raster.

---

## 11. Zu entscheiden

- **Die Bezugszahl (Abschnitt 6).** Der wichtigste Punkt: gedämpftes 1RM oder weiterhin das
  Arbeitsgewicht. Davon hängt ab, ob die recherchierten Zahlen das bedeuten, was sie in der
  Literatur bedeuten, und ob die Lastliste eine zweite Bezugsart lernen muss.
- **Ob eine Warnung bei altem 1RM nötig ist**, oder ob die Dämpfung reicht.
- **Ob der Anteil eingetippt wird** oder ob eine Vorbelegung je Wochenart („leicht / mittel /
  schwer") die Tabelle schmaler macht. Eine Frage an den Bildschirm, nicht an die Daten.
- **Wochengrenzen des Bausteins.** `weeks_min`/`weeks_max` müssen gesetzt werden. Die
  Vierwochenzyklen der Literatur legen 4 bis 8 nahe.

---

## 12. Vorgeschlagener Schritt-Zuschnitt

Erst wenn abgestimmt ist, dass gebaut wird, entstehen daraus ein Vorhaben-Issue und die
Schritt-Issues.

1. **Speicherort in der Vorlage.** Migration: `week_plan` und `load_plan` kehren an
   `journey_template_phases` zurück, ausdrücklich nur für getippte Bausteine. Dazu Schema und
   Schreibnaht. Ohne neunten Baustein bleiben die Spalten leer und nichts ändert sich.
2. **Der neunte Baustein.** Migration (Schlüssel in `CHECK` und `focusEnum`, Baustein-Zeile je
   Nutzer, die neue Bauregel der Wochentabelle in beiden `CHECK`-Listen), Seed, Schema,
   Bezugszahl nach Abschnitt 6. Danach existiert er, ohne dass man ihn bedienen kann.
3. **Die Weiche trennen.** `hasPlanBuilder` statt `planGovernsLoad` als Bedingung für den
   Plan-Bezug (Abschnitt 8). Für die bestehenden Bausteine ändert sich nichts – beide
   Antworten fallen dort zusammen. Für sich testbar.
4. **Der vierte Steuerweg wirkt.** `suggestForExercise` kombiniert Tabelle und Lastliste, die
   Deckelung wird geprüft, Journey-Start und Vorlagen-Vorschau reichen die getippten Listen
   durch statt zu rechnen. Danach läuft eine von Hand eingetragene Vorlage vollständig durch.
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
