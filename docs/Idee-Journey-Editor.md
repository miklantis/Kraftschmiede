# Journey-Editor – Ideenpapier (Teil 2)

> Doku-Typ: Idee. Denkstand, kein Konzept und kein Auftrag.
>
> Am 23.08.2026 ist eine Sache entschieden: **Editiert wird die Vorlage** (Abschnitt 5).
> Die beiden anderen Wege sind damit vom Tisch, alles Weitere baut auf diesem auf. Gebaut
> wird deshalb noch nichts – es liegen bewusst keine Issues dazu.
>
> Stand 23.08.2026: gegen Code und Live-Datenbank durchgeprüft, nachdem Teil 1 gebaut war
> (Vorhaben #321, Migrationen 0043 bis 0050). Die Befunde sind eingearbeitet – die größte
> Korrektur betrifft Abschnitt 1: Die Felder einer Phase sind **nicht frei**, sie sind
> **im Korridor einstellbar**. Daraus folgt der neue Abschnitt 3. Zwei Zeilen der
> Reglertabelle lagen daneben (Erhaltung, Wiederaufbau) und sind gegen die geseedeten
> Werte korrigiert. Wo der erste Entwurf danebenlag, steht das an Ort und Stelle dabei,
> statt still ersetzt zu werden.

Teil 2 von zwei. Dieses Papier befasst sich **nur mit der Bedienung**: wie die Bausteine
für den Nutzer sichtbar und editierbar werden. Die Bausteine selbst, ihre Eigenschaften
und die Frage, was die Datenbank dafür braucht, stehen in
[`Konzept-Bausteine-Datenstruktur.md`](./Konzept-Bausteine-Datenstruktur.md) (Teil 1).

Teil 1 ist seit dem 23.08.2026 gebaut – er war die Voraussetzung, aber keine
Verpflichtung: Journeys entstehen weiter per Migration, nur eben aus einem sauberen
Baukasten. Ob dieser Teil 2 je gebaut wird, ist offen. Die bestehenden Vorlagen decken den
heutigen Bedarf.

Grundlage: [`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md)
samt Nachtrag und [`Architektur.md`](./Architektur.md).

---

## 1. Warum das überhaupt geht

Eine Phase ist eine Datenzeile, und ihre Felder sind einstellbar: `name`, `weeks`,
`sets_start`/`sets_end`, `deload_week`, `rep_target_min`/`max`, `position`. Fest ist der
Baustein (`focus`) und was aus ihm folgt: der Steuerweg (`control`), die Bauart
(`plan_builder`, `load_builder`, `careful`) und die daraus gebauten Listen (`week_plan`,
`load_plan`). Diese Felder schreibt kein Regler – sie entstehen beim Anlegen der Phase aus
dem Baustein und stehen an der Vorlage seit den Migrationen 0049 und 0050 gar nicht mehr.

> **Korrektur zum ersten Entwurf.** Dort stand, die Felder seien „schon freie Werte". Das
> stimmt für die Spalte, nicht für den Baustein: Seit Teil 1 hat jede dieser Einstellungen
> Anschläge – `weeks_min`/`weeks_max`, `sets_max`, `rep_bound_min`/`rep_bound_max`. Eine
> Hypertrophiephase darf drei bis acht Wochen lang sein, nicht eine und nicht zwanzig. Der
> Unterschied ist keine Kleinigkeit: „frei" hieße ein leeres Zahlenfeld, „im Korridor"
> heißt ein Regler mit Anschlag, der nichts Unsinniges zulässt. Abschnitt 3 baut darauf
> auf.

Drei Eigenschaften des heutigen Systems machen einen Editor überhaupt denkbar:

- **Ein gesetztes Wiederholungsband schlägt den Typ.** Der Baustein liefert nur den
  Ersatzwert für den leeren Fall (`phaseRepBand` in `engine/journey.ts`). „Expliziter Wert
  schlägt Ableitung" ist also schon angelegt.
- **Der Wochenplan wird generisch gelesen, aber nach Bauregel gebaut.** Das System fragt
  nie, warum in Woche 3 steht, was dort steht – nur, was gilt (`weekPlanForWeek`). An der
  Bauregel der Phase hängt allein das Erzeugen (`buildWeekPlanFor`, für die Lastliste
  `buildLoadPlanFor`), und das passiert genau einmal, beim Journey-Start.
- **Eine Phase entsteht seit Teil 1 aus einem Baustein.** `buildPhaseFromType`
  (`engine/phaseBuild.ts`) nimmt den Baustein plus die Anpassungen, die der Editor
  ohnehin sammeln würde (Name, Wochen, Satzrampe, Band, Entlastungswoche, notfalls
  getippte Laststufen), und gibt die fertige Phase zurück – samt Wochen- und Lastliste und
  mit einer zu spät liegenden Entlastungswoche automatisch zurückgenommen
  (`cappedDeloadWeek`). Die Bau-Funktion, die ein Editor bräuchte, steht damit schon.

Ein Editor schreibt also im Wesentlichen Felder. Die einzige Stelle, an der er in die
Engine greift, ist die Vorschau: Seit Issue #343 speichert die Vorlage die beiden Listen
gar nicht mehr, sie werden zur Anzeige gebaut und beim Journey-Start eingefroren
(`buildPhasePlans`, benutzt von `buildTemplatePhaseInputs` in `lib/journey.ts`).

---

## 2. Bedienidee: der Nutzer wählt Bausteine, keine Wege

- **Der Nutzer wählt einen Baustein, die Steuerwege bleiben unsichtbar.** Niemand muss
  wissen, dass eine Kraftphase anders rechnet als eine Hypertrophiephase, um sie zu
  benutzen. Das Wort `control` (`coach` oder `plan`) taucht auf keinem Bildschirm auf.
- **Je Baustein erscheinen nur die Optionen, die dort etwas bewirken.** Ein Feld, an dem
  man zieht und nichts passiert, ist schlimmer als kein Feld.
- **Was fest ist, bleibt fest und wird nicht angeboten**: die vier Sätze der Kraftphase,
  die Ziel-Anstrengung, die Bauregel der Testphase (ADR-0018).
- **Die Abfolge liegt beim Nutzer.** Das System prüft nicht, ob ein Block
  trainingslogisch klug sitzt. Hinweise ja (`placement_hint`: der Wiederaufbau gehört an
  den Anfang), Verbote nein.

Damit ist eine Phase in vier Handgriffen definiert: **Baustein wählen → Wochen wählen →
gegebenenfalls Entlastungswoche → Reihenfolge festlegen.**

---

## 3. Fest, im Korridor, frei – die drei Grade

Der erste Entwurf hatte eine binäre Regel: „ein Regler erscheint, wenn die zugehörige
Eigenschaft nicht gesperrt ist". Die Daten aus Teil 1 kennen aber drei Zustände, und genau
der mittlere ist der interessante – der Baustein steht fest, lässt aber Spiel.

| Grad | Woran der Editor das erkennt | Was er zeigt |
| --- | --- | --- |
| **Fest** | `sets_locked`, `rep_band_locked`, `deload_allowed = false`, dazu Bauart und Steuerweg | gar nichts – der Wert steht in der Phase, aber ohne Bedienelement |
| **Im Korridor** | `weeks_min`/`weeks_max`, `sets_max`, `rep_bound_min`/`rep_bound_max` | Regler mit Anschlag, Vorgabewert vorbelegt |
| **Frei** | keine Grenze in den Daten: `name`, `position` | Textfeld, Pfeile hoch/runter |

Drei Dinge folgen daraus:

- **Der Anschlag ist keine Fehlermeldung.** Ein Regler, der bei acht Wochen stehen bleibt,
  erklärt die Grenze besser als ein Feld, das jede Zahl annimmt und hinterher meckert.
- **Der Korridor gilt schon heute.** Der Abgleichstest prüft seit #334, dass die Phasen,
  die der Seed baut, in den Grenzen ihres Bausteins liegen (Abgleich 4 und 8 in
  `seed/__tests__/abgleich.test.ts`). Der Editor macht diese Grenzen sichtbar, er erfindet
  sie nicht.
- **Der Editor bearbeitet Vorlagen, nicht Bausteine.** Die Bausteine tragen die
  Trainingslogik; die Korridore sind das Geländer. Sie sind zwar pro Nutzer geseedet
  (ADR-0002) und wären damit technisch änderbar – aber wer das Geländer verstellen kann,
  bekommt vom Geländer keine Hilfe mehr. Vorerst: nicht anbieten.

### Was je Baustein tatsächlich einstellbar ist

Gegen die geseedeten Werte geprüft (Live-Stand 23.08.2026, `phase_types`):

| Baustein | Wochen | Sätze | Wiederholungsband | Entlastung | Last |
| --- | --- | --- | --- | --- | --- |
| Kraftausdauer | 3–8, Vorgabe 4 | Rampe 2→4, bis 6 | 12–18, Korridor 10–25 | ja, Vorgabe Woche 3 | – |
| Hypertrophie | 3–8, Vorgabe 5 | Rampe 2→6, bis 8 | 8–12, Korridor 6–15 | ja, Vorgabe Woche 4 | – |
| Wiedereinstieg | 1–4, Vorgabe 2 | 2, bis 3 | 5–8, Korridor 5–12 | nein | – |
| Erhaltung | 1–12, Vorgabe 3 | 3, bis 5 | keins – die Übung behält ihr eigenes | ja, ohne Vorgabe | – |
| Maximalkraft | 3–6, Vorgabe 5 | fest 4 | fest 4–6 | nein | – |
| Intensivierung | 3–4, Vorgabe 3 | fest 4 | fest 3–5 | nein | – |
| Test/Peak | 1–2, Vorgabe 2 | fest 2 | fest 2–4 | nein | – |
| Wiederaufbau | 3–6, Vorgabe 3 | Rampe 2→4, bis 6 | 6–10, Korridor 5–15 | nein | 65 % → 95 % |

> **Zwei Korrekturen zum ersten Entwurf.** Dort stand bei der **Erhaltung** nur „Wochen,
> Satzzahl" – tatsächlich ist `deload_allowed = true`, die Entlastungswoche gehört also
> angeboten (erlaubt, aber ohne Vorgabe: `deload_default` ist leer). Und beim
> **Wiederaufbau** fehlte die Satzrampe: `sets_locked` ist dort `false`, die Rampe geht von
> 2 auf 4 und darf bis 6. Dafür sind Start- und Zielanteil dort gelistet, obwohl sie
> nirgends hinpassen – siehe Abschnitt 4.

Daraus ergeben sich die sichtbaren Regler:

| Baustein | sichtbare Regler |
| --- | --- |
| Hypertrophie, Kraftausdauer | Wochen, Satzrampe, Wiederholungsband, Entlastungswoche |
| Wiedereinstieg | Wochen, Satzrampe, Wiederholungsband |
| Erhaltung | Wochen, Satzzahl, Entlastungswoche |
| Maximalkraft, Intensivierung, Test/Peak | nur Wochen |
| Wiederaufbau | Wochen, Satzrampe, Wiederholungsband (Last: siehe Abschnitt 4) |

### Rampe oder eine Zahl?

Die Daten sagen, **wie hoch** die Sätze gehen dürfen (`sets_max`), aber nicht, **ob** eine
Rampe gemeint ist. Erhaltung startet und endet bei 3, Hypertrophie geht von 2 auf 6 – der
Unterschied steht nur in den Vorgabewerten, nicht als eigene Eigenschaft.

Zwei Wege, ohne dass die Datenstruktur angefasst werden muss:

1. **Aus der Vorgabe ablesen.** `sets_start_default == sets_end_default` → ein Zahlenfeld,
   sonst zwei. Kostet nichts, ist aber eine Vermutung, die nirgends geschrieben steht.
2. **Immer die Rampe zeigen**, mit gleichem Start- und Zielwert als Normalfall. Ehrlicher,
   aber auf dem Telefon ein Bedienelement mehr, wo eine Zahl gereicht hätte.

Vorschlag: Weg 1 mit einem kleinen Schalter „über die Phase steigern", der auf Weg 2
umstellt. Entschieden wird das sinnvoll erst am fertigen Bildschirm, nicht hier.

---

## 4. Der eine Punkt, an dem Teil 2 die Datenbank anfasst

Die Laststufen des Wiederaufbaus haben in einer Vorlage keinen Platz.

`journey_template_phases` trägt heute: `name`, `focus`, `weeks`, `sets_start`, `sets_end`,
`deload_week`, `rep_target_min`, `rep_target_max`, `position`. Start- und Zielanteil stehen
nur am Baustein (`load_start_default` = 0,65 und `load_end_default` = 0,95), und
`buildPhaseFromType` nimmt zwar getippte Stufen entgegen (`load: number[]`), aber eine
Vorlage kann sie nicht speichern.

Solange die einzige Wiederaufbau-Vorlage genau die Baustein-Vorgabe benutzt, fällt das
nicht auf. Ein Editor, der die beiden Anteile anbietet, braucht vorher zwei Spalten –
`load_start` und `load_end` an der Vorlagenphase, leer = Vorgabe des Bausteins. Das wäre
der erste Schritt eines gebauten Teil 2 und der einzige mit einer Migration.

> **Damit hängt auch der Testphasen-Vorschlag hier dran.** Der erste Entwurf wollte, dass
> der Editor beim Wiederaufbau eine Testphase vorschlägt und den Zielanteil dann auf 95 %
> statt 100 % setzt. Nachgesehen: Der Zielanteil steht bereits auf 95 %, und die Vorlage
> „Wiederaufbau nach Fasten" hat die Testwoche seit Migration 0047 fest dahinter. Der
> Vorschlag beschreibt also den Ist-Zustand, nicht eine Rechenhilfe. Was bliebe: Nimmt der
> Nutzer die Testphase weg, müsste der Zielanteil auf 100 % hoch – und dafür fehlt genau
> der Speicherort oben. Der Punkt ist nicht erledigt, er wartet auf die zwei Spalten.

Der zweite Punkt des ersten Entwurfs ist dagegen wirklich weg: ~~beim Ändern der Wochenzahl
die Listen neu bauen~~. Erledigt durch #343 (Migration 0050) – die Vorlage speichert die
Listen nicht mehr, sie entstehen erst beim Journey-Start aus Baustein und Wochenzahl. Damit
kann keine gespeicherte Leiter mehr unpassend werden. Was der Editor stattdessen braucht,
ist die Live-Vorschau, die die Vorlagen-Auswahl seither ohnehin baut.

---

## 5. Entschieden: editiert wird die Vorlage

Heute entstehen Journeys aus Vorlagen. Drei Wege waren denkbar. Die Frage war vor allem
anderen zu klären, weil alles Weitere daraus folgt – **am 23.08.2026 ist sie entschieden:
Weg 1**, siehe unten.

| Weg | Was es heißt | Risiko |
| --- | --- | --- |
| **Vorlagen editierbar machen** ✔ | Der Nutzer ändert die Bauanleitung, nicht das Laufende. Wirkt erst beim nächsten Journey-Start | gering |
| **Journey ohne Vorlage anlegen** | Ein leeres Blatt, Bausteine hinstellen, starten | gering – siehe unten |
| **Laufende Journey anpassen** | Der Standort wird aus den absolvierten Trainingswochen abgeleitet, nicht aus dem Kalender | hoch |

> **Korrektur zum ersten Entwurf.** Dort stand beim mittleren Weg „mittleres Risiko – eine
> Journey ohne Vorlage hat kein `source_template_id`". Nachgesehen in der Live-Datenbank:
> Die einzige laufende Journey („Rückkehr 2026", seit 31.05.2026, vier Phasen über
> 14 Wochen) hat **genau das** – kein `source_template_id`. Sie trägt seit knapp drei
> Monaten, und nichts Rechnendes hängt daran: Der Verweis wird an zwei Stellen gelesen, für
> den Vorlagennamen in der Journey-Ansicht (`useJourneyView`) und für die Markierung der
> aktiven Karte im Vorlagen-Wähler. Beides ist Anzeige. Der Weg ist damit nicht mittel-,
> sondern geringriskant – nur zwei Anzeigen müssen den leeren Fall aushalten, was sie
> heute schon tun.

Zum dritten Weg bleibt es beim Befund: Verkürzt man eine laufende Phase, springt der
Standort – und die Gewichtsanker (`reference_phase_id`, `plan_start_weight`) hängen
plötzlich woanders. Vermutliche Trennung, falls es je dazu kommt: **kommende Phasen ja,
laufende und vergangene nein.**

### Die Entscheidung

**Weg 1, mit einer einzigen Erweiterung: eine Vorlage duplizieren und die Kopie
bearbeiten.** Damit ist das Bestehende geschützt und trotzdem alles gestaltbar – die
Originale bleiben stehen, und wer sich verrennt, wirft die Kopie weg.

Was daraus folgt:

- **Die laufende Journey bleibt außen vor.** Eine geänderte Vorlage wirkt frühestens beim
  nächsten Journey-Start. Die Gewichtsanker der laufenden Journey kann der Editor damit
  gar nicht erreichen – das Risiko aus der dritten Zeile stellt sich nicht.
- **Der Editor braucht kein leeres Blatt.** Eine neue Journey entsteht weiter, indem eine
  Vorlage gewählt wird; neu ist nur, dass es mehr Vorlagen geben kann. Der zweite Weg
  bleibt möglich, wird aber nicht gebraucht.
- **Vorlagen-Verwaltung wird Pflicht statt Kür.** Sobald es Kopien gibt, müssen sie sich
  benennen, ordnen und löschen lassen (Abschnitt 7, erster Punkt).

Nicht entschieden ist, **ob und wann** gebaut wird. Die bestehenden Vorlagen decken den
heutigen Bedarf; es liegen bewusst keine Issues dazu.

---

## 6. Was der Editor nicht kaputt machen kann

Nützlich zu wissen, bevor man über Sicherheitsnetze nachdenkt – das meiste ist schon eins:

- **Keine unpassenden Leitern.** Die Listen entstehen beim Journey-Start, nicht beim
  Speichern der Vorlage (#343). Eine geänderte Wochenzahl kann nichts Altes stehen lassen.
- **Keine zu späte Entlastungswoche.** `cappedDeloadWeek` zieht sie beim Bauen zurück und
  wirft sie unter drei Wochen ganz weg.
- **Keine laufende Journey trifft es.** Die Werte werden beim Anlegen in die Phasenzeile
  kopiert; eine geänderte Vorlage wirkt frühestens beim nächsten Start.
- **Keine Phase ohne Baustein.** Der Fremdschlüssel aus Migration 0048 lässt keinen
  erfundenen `focus` zu.

Was ein Editor dagegen sehr wohl erzeugen könnte und wogegen es heute keine Regel gibt:
eine Vorlage **ohne jede Phase**. Eine Mindestzahl von einer Phase gehört in die
Oberfläche.

---

## 7. Weiter offen

- **Vorlagen-Verwaltung.** Umbenennen, löschen, Reihenfolge – und was mit einer Vorlage
  passiert, aus der schon Journeys entstanden sind (`journeys.source_template_id`, siehe
  Abschnitt 5: der Verweis darf leer werden).
- **Vorschau.** Die Periodisierungskurve gibt es bereits; ob sie im Editor live mitläuft
  oder erst am Ende erscheint, ist Geschmacks- und Aufwandsfrage.
- **Mobile Bedienung.** Bausteine umsortieren ist auf dem Telefon der unangenehmste Teil.
  Eher Pfeile hoch/runter als Ziehen.
- **Rampe oder eine Zahl** bei den Sätzen (Abschnitt 3, letzter Punkt).
- **Wie viel Erklärung.** Jeder Baustein bringt seit Teil 1 seine Kurzbeschreibung als
  Daten mit (`phase_types.summary`, dazu `placement_hint`). Ob das reicht oder ob es je
  Baustein eine ausführlichere Seite braucht, zeigt sich erst am fertigen Bildschirm.
