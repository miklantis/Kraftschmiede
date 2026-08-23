# Journey-Editor – Ideenpapier (Teil 2)

> Doku-Typ: Idee. Denkstand, kein Konzept und kein Auftrag.

Teil 2 von zwei. Dieses Papier befasst sich **nur mit der Bedienung**: wie die Bausteine
für den Nutzer sichtbar und editierbar werden. Die Bausteine selbst, ihre Eigenschaften
und die Frage, was die Datenbank dafür braucht, stehen in
[`Konzept-Bausteine-Datenstruktur.md`](./Konzept-Bausteine-Datenstruktur.md) (Teil 1).

Teil 1 ist seit dem 23.08.2026 gebaut (Vorhaben #321) – er war die Voraussetzung, aber
keine Verpflichtung: Journeys entstehen weiter per Migration, nur eben aus einem sauberen
Baukasten. Ob dieser Teil 2 je gebaut wird, ist offen. Die bestehenden Vorlagen decken den
heutigen Bedarf.

Grundlage: [`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md)
samt Nachtrag und [`Architektur.md`](./Architektur.md).

---

## 1. Warum das überhaupt geht

Eine Phase ist eine Datenzeile, und fast alle ihre Felder sind schon freie Werte: `name`,
`weeks`, `sets_start`/`sets_end`, `deload_week`, `rep_target_min`/`max`, `position`. Fest
ist der Baustein (`focus`) und was aus ihm folgt: die Bauart (`plan_builder`,
`load_builder`, `careful`) und die daraus gebauten Listen (`week_plan`, `load_plan`).
Diese Felder schreibt kein Regler – sie entstehen beim Anlegen der Phase aus dem
Baustein und stehen an der Vorlage seit den Migrationen 0049 und 0050 gar nicht mehr.

Drei Eigenschaften des heutigen Systems machen einen Editor überhaupt denkbar:

- **Ein gesetztes Wiederholungsband schlägt den Typ.** Der Baustein liefert nur den
  Ersatzwert für den leeren Fall (`phaseRepBand`). „Expliziter Wert schlägt Ableitung" ist
  also schon angelegt.
- **Der Wochenplan wird generisch gelesen, aber nach Bauregel gebaut.** Das System fragt
  nie, warum in Woche 3 steht, was dort steht – nur, was gilt (`weekPlanForWeek`). An der
  Bauregel der Phase hängt allein das Erzeugen (`buildWeekPlanFor`, für die Lastliste
  `buildLoadPlanFor`), und das passiert genau einmal, beim Anlegen der Phase.
- **Eine Phase entsteht seit Teil 1 aus einem Baustein.** `buildPhaseFromType`
  (`engine/phaseBuild.ts`) nimmt den Baustein plus die Anpassungen, die der Editor
  ohnehin sammeln würde (Name, Wochen, Satzrampe, Band, Entlastungswoche, notfalls
  getippte Laststufen), und gibt die fertige Phase zurück – samt Wochen- und Lastliste und
  mit einer zu spät liegenden Entlastungswoche automatisch zurückgenommen. Die
  Bau-Funktion, die ein Editor bräuchte, steht damit schon.

Ein Editor schreibt also im Wesentlichen Felder. Die einzige Stelle, an der er in die
Engine greift, ist die Vorschau: Seit Issue #343 speichert die Vorlage die beiden Listen
gar nicht mehr, sie werden zur Anzeige gebaut und beim Journey-Start eingefroren
(`buildPhasePlans`, Abschnitt 3).

---

## 2. Bedienidee: der Nutzer wählt Bausteine, keine Wege

- **Der Nutzer wählt einen Baustein, die Steuerwege bleiben unsichtbar.** Niemand muss
  wissen, dass eine Kraftphase anders rechnet als eine Hypertrophiephase, um sie zu
  benutzen.
- **Je Baustein erscheinen nur die Optionen, die dort etwas bewirken.** Ein Feld, an dem
  man zieht und nichts passiert, ist schlimmer als kein Feld. Die dafür nötige Information
  steht seit Teil 1 als Daten bereit (`sets_locked`, `rep_band_locked`, `deload_allowed`,
  dazu die Korridore `rep_bound_min`/`rep_bound_max` und `sets_max`) – die Oberfläche muss
  sie nicht erraten.
- **Was fest ist, bleibt fest und wird nicht angeboten**: die vier Sätze der Kraftphase,
  die Ziel-Anstrengung, die Bauregel der Testphase (ADR-0018).
- **Die Abfolge liegt beim Nutzer.** Das System prüft nicht, ob ein Block
  trainingslogisch klug sitzt. Hinweise ja (der Wiederaufbau gehört an den Anfang),
  Verbote nein.

Damit ist eine Phase in vier Handgriffen definiert: **Baustein wählen → Wochen wählen →
gegebenenfalls Entlastungswoche → Reihenfolge festlegen.**

---

## 3. Was der Editor je Baustein zeigt

Die Regel ist einfach, weil die Daten sie tragen: Ein Regler erscheint, wenn die
zugehörige Eigenschaft am Baustein nicht gesperrt ist.

| Baustein | sichtbare Regler |
| --- | --- |
| Hypertrophie, Kraftausdauer | Wochen, Satzrampe, Wiederholungsband, Entlastungswoche |
| Wiedereinstieg | Wochen, Satzrampe, Wiederholungsband |
| Erhaltung | Wochen, Satzzahl |
| Maximalkraft, Intensivierung | nur Wochen |
| Test/Peak | nur Wochen (eine oder zwei) |
| Wiederaufbau | Wochen, Startanteil, Zielanteil, Wiederholungsband |

Zwei Stellen, an denen der Editor mitdenken sollte:

- **Beim Wiederaufbau die Testphase vorschlagen.** Eine Woche, ohne Entlastung, direkt
  dahinter – und der Zielanteil des Wiederaufbaus geht dann auf 95 % statt 100 %.
  Wegnehmen ist erlaubt; nimmt man sie weg, steht der Zielanteil wieder auf 100 %.
- ~~**Beim Ändern der Wochenzahl die Listen neu bauen.**~~ Erledigt durch Issue #343
  (Migration 0050): Die Vorlage speichert die beiden Listen nicht mehr, sie entstehen
  erst beim Journey-Start aus Baustein und Wochenzahl. Damit kann keine gespeicherte
  Leiter mehr unpassend werden – die Aufgabe ist nicht gelöst, sondern überflüssig. Was
  der Editor stattdessen braucht, ist die Live-Vorschau, die die Vorlagen-Auswahl seither
  ohnehin baut (`buildTemplatePhaseInputs` in `lib/journey.ts`, gerechnet mit
  `buildPhasePlans`).

---

## 4. Die offene Kernfrage: was wird eigentlich editiert?

Heute entstehen Journeys nur aus Vorlagen. Drei Wege sind denkbar, mit sehr verschiedenem
Risiko – und diese Frage ist vor allem anderen zu klären, weil alles Weitere daraus folgt.

| Weg | Was es heißt | Risiko |
| --- | --- | --- |
| **Vorlagen editierbar machen** | Der Nutzer ändert die Bauanleitung, nicht das Laufende. Wirkt erst beim nächsten Journey-Start | gering |
| **Journey ohne Vorlage anlegen** | Ein leeres Blatt, Bausteine hinstellen, starten | mittel – eine Journey ohne Vorlage hat kein `source_template_id` |
| **Laufende Journey anpassen** | Der Standort wird aus den absolvierten Trainingswochen abgeleitet, nicht aus dem Kalender | hoch |

Zum dritten Weg: Verkürzt man eine laufende Phase, springt der Standort – und die
Gewichtsanker (`reference_phase_id`, `plan_start_weight`) hängen plötzlich woanders.
Vermutliche Trennung, falls es je dazu kommt: **kommende Phasen ja, laufende und vergangene
nein.**

Der einfachste sinnvolle Anfang wäre Weg 1 mit einer einzigen Erweiterung: eine Vorlage
duplizieren und die Kopie bearbeiten. Damit ist das Bestehende geschützt und trotzdem
alles gestaltbar.

---

## 5. Weiter offen

- **Vorlagen-Verwaltung.** Umbenennen, löschen, Reihenfolge – und was mit einer Vorlage
  passiert, aus der schon Journeys entstanden sind (`journeys.source_template_id`).
- **Vorschau.** Die Periodisierungskurve gibt es bereits; ob sie im Editor live mitläuft
  oder erst am Ende erscheint, ist Geschmacks- und Aufwandsfrage.
- **Mobile Bedienung.** Bausteine umsortieren ist auf dem Telefon der unangenehmste Teil.
  Eher Pfeile hoch/runter als Ziehen.
- **Wie viel Erklärung.** Jeder Baustein bringt seit Teil 1 seine Kurzbeschreibung als
  Daten mit (`phase_types.summary`, dazu `placement_hint`). Ob das reicht oder ob es je
  Baustein eine ausführlichere Seite braucht, zeigt sich erst am fertigen Bildschirm.
