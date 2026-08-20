# ADR-0017 – Journey-Abschluss über den Kalender

**Status:** akzeptiert
**Datum:** 2026-08-20

## Kontext

Der Abschluss hing an einer konkreten Einheit (ADR-0014): Beim Beenden einer Krafteinheit
prüfte die Engine, ob diese Einheit in der letzten geplanten Journey-Woche liegt und das
Wochen-Pensum erfüllt. Am Ende einer Journey steht aber die Testphase, und dort gibt es
keine Einheit, die das auslösen könnte – der 1RM-Test ist keine Session und hängt nicht an
`sessions`. Yoga- und Skill-Einheiten lösten ebenfalls nichts aus, und Zeit allein auch
nicht: es gibt keinen Hintergrund-Job, der ohne geöffnete App etwas schließt.

Die Journey blieb damit aktiv liegen, obwohl sie inhaltlich fertig war, und der Coach gab
weiter die letzte Phase vor. Zugleich zeigte sich beim Durchsprechen, dass die Testphase in
einer einzigen Woche zu eng ist: Entlastung und vier bis fünf 1RM-Tests passen nicht in
dieselben sieben Tage.

## Entscheidung

**Eine Regel: Die Journey ist durchlaufen, wenn alle geplanten Wochen erfüllt und vorbei
sind.** Ausgewertet wird das vorhandene Signal `placement.done` aus derselben Stelle, die
überall den Standort in der Journey bestimmt (`derivePhaseContext`) – keine zweite Rechnung
daneben. Die Regel „Abschluss beim Beenden einer Einheit" entfällt ersatzlos.

**Eine Woche, die nichts verlangt, erfüllt sich selbst.** Eine Journey-Woche gilt weiterhin
als erfüllt, wenn genug zählende Einheiten in ihr liegen. Genau eine Ausnahme, an genau
einer Stelle (`fulfilledWeeks` in `engine/journey.ts`): Plant die Woche gar keine Einheit,
ist sie ohne Zutun erfüllt. Eine Journey mit Testwoche am Ende schließt damit am Sonntag von
selbst; ob getestet wurde, wird nicht geprüft – das liegt beim Nutzer. Eine Journey ohne
Testwoche am Ende muss ihre letzte Woche regulär über die Einheitenzahl erfüllen.

**Bauregel der Testphase: Die letzte Woche ist die reine Testwoche, jede Woche davor ist
Entlastung** (`buildTestPhaseWeekPlan`). Die Testwoche steht mit 0 Sätzen im Wochenplan und
gibt weder dem Coach noch der Anzeige etwas vor; Trainieren ist erlaubt, aber nicht
eingeplant. Ein neuer Phasentyp entsteht dafür nicht – die Testphase bleibt `test`, nur mit
zwei Wochen.

**Geprüft wird bei jedem App-Start und auf jeder Seite.** Der Hook (`useJourneyCompletion`)
hängt in der global gemounteten Live-Schicht. Ob die Journey vorbei ist, darf nicht davon
abhängen, welche Seite zuerst geöffnet wird.

**Der Schreibvorgang ist bewusst einfach und nicht offline-gepuffert.** Eine beendete
Einheit ist Dateneingabe und muss gepuffert werden; der Abschluss ist nur eine
Schlussfolgerung aus Daten, die schon da sind. Schlägt er fehl, ist die Bedingung beim
nächsten Öffnen unverändert wahr – der Vorgang heilt sich selbst. Die
Mutations-Registrierung (ADR-0009) bleibt dafür unberührt. Das Popup „Journey
abgeschlossen" kommt erst nach erfolgreichem Archivieren.

**Als Enddatum steht der Sonntag der letzten geplanten Woche im Archiv** (`journeyEndDate`),
nicht der Tag, an dem die App den Abschluss bemerkt. Sonst hinge die Dauer davon ab, wann
die App zufällig geöffnet wurde: zwei Wochen Urlaub ließen die Journey zwei Wochen länger
aussehen, als sie war.

**Warum die Einheiten-Regel weg ist.** Zwei Wahrheiten für dieselbe Frage laufen
auseinander: Die Anzeige rechnet über den Kalender, der Abschluss hätte über die Einheit
gerechnet. Jede spätere Änderung an einer der beiden Stellen erzeugt eine Journey, die sich
abgeschlossen anzeigt und nicht abgeschlossen ist – oder umgekehrt.

## Konsequenzen

- Bei einer Journey ohne Testphase kommt das Popup nicht mehr direkt nach der letzten
  Einheit, sondern erst am nächsten Wochenanfang – die laufende Woche behält ihre Nummer bis
  Sonntag und wird erst rückwirkend erfüllt.
- Die Testwoche läuft ab, auch wenn niemand da war. Kein einziger Test ist kein Hindernis;
  die Journey schließt trotzdem.
- Ohne Netz gibt es keine Meldung. Der Abschluss wird nicht gepuffert und holt sich beim
  nächsten Öffnen mit Verbindung selbst nach.
- Eine Journey lässt sich weiterhin nicht abbrechen, außer indem die nächste gestartet wird
  (die löst die alte ab). Ein Knopf „Journey beenden" wurde bewusst verworfen.
- Die Testphase wurde von einer auf zwei Wochen verlängert (Vorlagen und laufende Journey
  per Migration, `0037`/`0038`). Journeys werden dadurch eine Woche länger.
- Die Sonderregel „eine Kalenderwoche mit abgeschlossenem 1RM-Test gilt als erfüllt" ist
  überflüssig geworden: Die Entlastungswoche erfüllt sich normal über ihre Einheiten, die
  Testwoche über den Kalender.
