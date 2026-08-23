# Journey-Editor – Ideenpapier (Teil 2)

> Doku-Typ: Idee. Denkstand und Grundlage, kein Auftrag. Ob und wann gebaut wird, ist
> offen – die heutigen Vorlagen decken den Bedarf. Es liegen bewusst keine Issues dazu.

Teil 2 von zwei, und der befasst sich **nur mit der Bedienung**: wie die Bausteine für den
Nutzer sichtbar und einstellbar werden. Die Bausteine selbst und ihre Datenstruktur stehen
in [`Konzept-Bausteine-Datenstruktur.md`](./Konzept-Bausteine-Datenstruktur.md) (Teil 1,
gebaut). Grundlage:
[`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md) samt Nachtrag
und [`Architektur.md`](./Architektur.md).

---

## 1. Die acht Bausteine

Ein Baustein ist eine Zeile in `phase_types`. Er sagt, womit eine Phase anfängt und wie
weit sie sich verstellen lässt – nicht, wie gerechnet wird. Das ist die ganze Grundlage
des Editors:

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

Was in dieser Tabelle **nicht** steht, ist genauso wichtig: der Steuerweg (rechnet der
Coach oder gibt die Phase vor), die Bauregeln der Wochen- und Lastliste, die
Ziel-Anstrengung. Das gehört zum Baustein und wird nie angeboten.

---

## 2. Fest, im Korridor, frei

Die Regel, aus der die ganze Oberfläche folgt. Jede Einstellung einer Phase hat einen von
drei Graden, und der steht in den Daten:

| Grad | Woran der Editor das erkennt | Was er zeigt |
| --- | --- | --- |
| **Fest** | `sets_locked`, `rep_band_locked`, `deload_allowed = false`, dazu Steuerweg und Bauart | gar nichts – der Wert steht in der Phase, aber ohne Bedienelement |
| **Im Korridor** | `weeks_min`/`weeks_max`, `sets_max`, `rep_bound_min`/`rep_bound_max` | Regler mit Anschlag, Vorgabewert vorbelegt |
| **Frei** | keine Grenze in den Daten: `name`, `position` | Textfeld, Pfeile hoch/runter |

Drei Folgerungen:

- **Der Anschlag ist keine Fehlermeldung.** Ein Regler, der bei acht Wochen stehen bleibt,
  erklärt die Grenze besser als ein Feld, das jede Zahl annimmt und hinterher meckert.
- **Die Grenzen gelten schon heute.** Der Abgleichstest prüft seit #334, dass die Phasen
  aus dem Seed in den Grenzen ihres Bausteins liegen. Der Editor macht sie sichtbar, er
  erfindet sie nicht.
- **Der Editor bearbeitet Vorlagen, nicht Bausteine.** Die Bausteine tragen die
  Trainingslogik, die Korridore sind das Geländer. Wer das Geländer verstellen kann,
  bekommt vom Geländer keine Hilfe mehr.

Daraus ergeben sich die sichtbaren Regler je Baustein:

| Baustein | sichtbare Regler |
| --- | --- |
| Hypertrophie, Kraftausdauer | Wochen, Satzrampe, Wiederholungsband, Entlastungswoche |
| Wiedereinstieg | Wochen, Satzrampe, Wiederholungsband |
| Erhaltung | Wochen, Satzzahl, Entlastungswoche |
| Maximalkraft, Intensivierung, Test/Peak | nur Wochen |
| Wiederaufbau | Wochen, Satzrampe, Wiederholungsband (Last: siehe Abschnitt 5) |

---

## 3. Bedienidee

- **Der Nutzer wählt einen Baustein, die Steuerwege bleiben unsichtbar.** Niemand muss
  wissen, dass eine Kraftphase anders rechnet als eine Hypertrophiephase, um sie zu
  benutzen.
- **Je Baustein erscheinen nur die Regler, die dort etwas bewirken.** Ein Feld, an dem man
  zieht und nichts passiert, ist schlimmer als kein Feld.
- **Die Abfolge liegt beim Nutzer.** Hinweise ja (`placement_hint`: der Wiederaufbau
  gehört an den Anfang), Verbote nein.

Eine Phase ist damit in vier Handgriffen definiert: **Baustein wählen → Wochen wählen →
gegebenenfalls Entlastungswoche → Reihenfolge festlegen.**

---

## 4. Editiert wird die Vorlage

Der Nutzer dupliziert eine Vorlage und bearbeitet die Kopie. Die Originale bleiben stehen,
und wer sich verrennt, wirft die Kopie weg.

- **Die laufende Journey bleibt außen vor.** Eine geänderte Vorlage wirkt frühestens beim
  nächsten Journey-Start. Der Standort einer laufenden Journey hängt an absolvierten
  Trainingswochen, die Gewichtsanker (`reference_phase_id`, `plan_start_weight`) daran –
  das kann der Editor so gar nicht erreichen.
- **Kein leeres Blatt nötig.** Eine neue Journey entsteht weiter, indem eine Vorlage
  gewählt wird. Neu ist nur, dass es mehr Vorlagen geben kann.
- **Vorlagen-Verwaltung wird Pflicht.** Sobald es Kopien gibt, müssen sie sich benennen,
  ordnen und löschen lassen.

---

## 5. Der eine Punkt, an dem Teil 2 die Datenbank anfasst

Die Laststufen des Wiederaufbaus haben in einer Vorlage keinen Platz.
`journey_template_phases` trägt Name, Baustein, Wochen, Satzrampe, Entlastungswoche, Band
und Reihenfolge – Start- und Zielanteil stehen nur am Baustein. Ein Editor, der die beiden
Anteile anbietet, braucht vorher zwei Spalten (`load_start`, `load_end`, leer = Vorgabe
des Bausteins). Das wäre der erste Schritt eines gebauten Teil 2 und der einzige mit einer
Migration.

Daran hängt auch: Nimmt der Nutzer die Testwoche hinter dem Wiederaufbau weg, gehört der
Zielanteil von 95 auf 100 Prozent hoch – und dafür fehlt genau dieser Speicherort.

---

## 6. Was der Editor nicht kaputt machen kann

Das meiste ist schon abgesichert:

- **Keine unpassenden Leitern.** Wochen- und Lastliste entstehen beim Journey-Start aus
  Baustein und Wochenzahl, nicht beim Speichern der Vorlage. Eine geänderte Wochenzahl
  kann nichts Altes stehen lassen.
- **Keine zu späte Entlastungswoche.** `cappedDeloadWeek` zieht sie beim Bauen zurück und
  wirft sie unter drei Wochen ganz weg.
- **Keine laufende Journey trifft es.** Die Werte werden beim Anlegen in die Phasenzeile
  kopiert.
- **Keine Phase ohne Baustein.** Der Fremdschlüssel lässt keinen erfundenen `focus` zu.

Der eine Fall ohne Regel: eine Vorlage **ohne jede Phase**. Eine Mindestzahl von einer
Phase gehört in die Oberfläche.

---

## 7. Offen

- **Rampe oder eine Zahl?** Die Daten sagen, wie hoch die Sätze gehen dürfen, aber nicht,
  ob eine Rampe gemeint ist. Erhaltung startet und endet bei 3, Hypertrophie geht von 2
  auf 6 – der Unterschied steht nur in den Vorgabewerten. Denkbar: aus der Vorgabe ablesen
  (gleicher Start und Zielwert → ein Zahlenfeld) und einen Schalter „über die Phase
  steigern" danebenstellen. Entscheidet sich am fertigen Bildschirm.
- **Vorlagen-Verwaltung.** Umbenennen, löschen, Reihenfolge – und was mit einer Vorlage
  passiert, aus der schon Journeys entstanden sind (`journeys.source_template_id` darf
  leer werden, nur zwei Anzeigen lesen ihn).
- **Vorschau.** Die Periodisierungskurve gibt es bereits; ob sie im Editor live mitläuft
  oder erst am Ende erscheint, ist Geschmacks- und Aufwandsfrage.
- **Mobile Bedienung.** Bausteine umsortieren ist auf dem Telefon der unangenehmste Teil.
  Eher Pfeile hoch/runter als Ziehen.
- **Wie viel Erklärung.** Jeder Baustein bringt seine Kurzbeschreibung als Daten mit
  (`phase_types.summary`, dazu `placement_hint`). Ob das reicht, zeigt sich erst am
  fertigen Bildschirm.
