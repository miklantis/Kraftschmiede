# Journey-Abschluss und freies Training – Konzept

> Doku-Typ: Konzept. Hält den besprochenen Stand fest, bevor gebaut wird. Noch nicht in Umsetzung.

Status: Arbeitsdokument. Inhaltliche Basis abgestimmt, Schritt-Zuschnitt als Vorschlag.
Verwandt und als Referenz: `archive/Konzept-Workouts-und-Journey-Zuordnung.md`.

---

## 1. Ziel

Eine Journey soll einen klaren Abschluss bekommen, statt unbemerkt auszulaufen.
Wenn die letzte geplante Woche ihr Pensum erreicht hat, gilt die Journey als
durchlaufen: Sie wird geschlossen und archiviert, und der Nutzer bekommt eine
sichtbare Meldung. Danach kann er entweder direkt die nächste Journey starten oder
bewusst ohne Journey weitertrainieren.

Damit verbunden sind zwei weitere Bausteine: ein sauber definiertes Verhalten für
den Zustand *ohne aktive Journey* („freies Training") und ein Archiv abgeschlossener
Journeys zum Nachschlagen.

Trainingslogischer Hintergrund: Eine Journey ist ein Makrozyklus. Ein Zyklus sollte
enden, eine kurze Bestandsaufnahme erlauben und bewusst in den nächsten Block
übergehen. Der journeylose Zustand ist dabei kein Defekt, sondern eine legitime
Erhaltungs- bzw. Übergangsphase.

---

## 2. Ausgangslage (Ist-Zustand)

Wichtig, weil einige Punkte heute anders laufen als gewünscht.

**Kein Abschluss vorgesehen.** Eine Journey wird heute nur deaktiviert, wenn eine
neue aus einer Vorlage gestartet wird. Es gibt keinen Abschluss und keinen
„Journey beenden"-Weg. Ist eine Journey inhaltlich durchlaufen (alle Phasenwochen
erfüllt), bleibt sie trotzdem aktiv. Intern entsteht zwar ein „durchlaufen"-Signal,
das aber nirgends ausgewertet wird: keine Meldung, kein Umschalten.

**Coach friert ein.** Solange eine durchlaufene Journey aktiv bleibt, rechnet der
Coach dauerhaft mit dem Kontext der letzten Phase weiter (deren Fokus, Repband,
Satzvolumen), als liefe diese Phase endlos.

**Journeyloses Verhalten heute.** Der Zustand ganz ohne Journey ist aktuell nur
erreichbar, bevor je eine Journey gewählt wurde. In diesem Fall arbeitet der Coach
mit Standardannahmen weiter: feste drei Arbeitssätze, das übungseigene Repband und
die normale Doppelprogression. Das heißt: Er würde auch ohne Ziel weiter Gewichte
hochschlagen – genau das ist unerwünscht.

**Zuordnung der Einheiten ist bereits fest.** Jede abgeschlossene Einheit speichert
zum Trainingszeitpunkt fest, zu welcher Journey und Phase sie gehörte (`journey_id`,
`phase_id`). Diese Zuordnung bleibt dauerhaft erhalten, auch nach einem Wechsel. Ein
Archiv und eine Rückschau sind dadurch ohne Zeitfenster-Rekonstruktion tragfähig.

**Coach-Export existiert schon.** Es gibt einen schlanken Coach-Export fürs Gespräch,
der Journeys, Phasen, Einheiten (jeweils mit Journey-/Phasen-Bezug) und Körperdaten
enthält, wahlweise „letzte X Wochen" oder „alles". Ein Journey-Export wäre also eine
Erweiterung, kein Neubau.

---

## 3. Journey-Abschluss (Automatik)

**Auslöser.** Der Abschluss hängt an einer konkreten Einheit, nicht an einem vagen
Wochenende. Sind für die letzte Journey-Woche z. B. drei Einheiten vorgesehen, löst
die Einheit, die dieses Wochen-Pensum in der letzten Woche erfüllt, den Abschluss aus.
In genau diesem Moment wird die Journey geschlossen und archiviert.

Diese Bindung an eine beendete Einheit löst zugleich den bekannten Haken der
rückwirkenden Wochen-Erfüllung: Es gibt einen eindeutigen Zeitpunkt, an dem der
Abschluss greift.

**Meldung.** Nach der auslösenden Einheit erscheint eine Meldung im Sinne von
„Diese Journey ist abgeschlossen und archiviert". Von dort führt der Weg entweder zu
einer neuen Journey oder bewusst in den journeylosen Modus.

**Randfall.** Macht der Nutzer in derselben Woche nach dem Abschluss noch eine weitere
Einheit, läuft diese bereits im journeylosen Modus (siehe Abschnitt 4). Das ist so
gewollt und konsistent.

---

## 4. Journeyloser Modus („freies Training")

Der zentrale, bewusst getroffene Entscheid: Ohne Journey gibt der Coach nichts vor.

**Coach schweigt.** Keine Progression, kein Steigern, Senken oder aktives Halten,
keine Empfehlung. Es gibt ohne Journey kein übergeordnetes Ziel, an dem sich eine
Empfehlung orientieren könnte – also soll auch keine gegeben werden. Der Mensch steuert.

**Anzeige beim Workout-Start.** Bei jeder Übung stehen die zuletzt geschafften Werte
als reine Vorbelegung: Gewicht, Wiederholungen und Sätze der letzten Einheit. Der
Nutzer passt selbst an, wenn er will.

**Sichtbarkeit.** Der Zustand wird klar benannt (z. B. „Freies Training – keine aktive
Journey"), damit erkennbar ist, dass dies gewollt ist und kein Defekt.

**Variante für den Start: stilles Freifeld.** Die App zeigt nur die letzten Werte und
behauptet nichts dazu. Ein späterer, expliziter Erhaltungsmodus (App sagt aktiv
„halten") ist möglich, ändert aber an den angezeigten Zahlen nichts – Unterschied ist
nur, ob die App dazu etwas aussagt. Erst das stille Freifeld, Erhaltungsmodus optional
später, wenn Bedarf besteht.

---

## 5. Archiv abgeschlossener Journeys

Auf der Journey-Seite, unterhalb der aktiven Journey bzw. des Leerzustands, eine Liste
abgeschlossener Journeys. Je Eintrag: Name, Zeitraum (von–bis), Dauer.

Antippen öffnet eine grobe Rückschau: die Phasen der Journey und die absolvierten
Einheiten. Bewusst schlicht gehalten – zum Nachschlagen, nicht zum Auswerten. Die
Daten liegen dank der festen Journey-/Phasen-Zuordnung je Einheit vollständig vor.

Eine tiefere Auswertung (Fortschritt, Bestwerte, Volumen über die Journey) ist bewusst
nicht Teil des Starts und kann später ergänzt werden, wenn Bedarf entsteht.

---

## 6. Journey-Export für den Coach

Aus einem Archiv-Eintrag heraus soll sich genau diese eine Journey als JSON für den
Coach exportieren lassen. Umsetzung als Erweiterung des bestehenden Coach-Exports um
einen Filter „nur diese Journey", nicht als parallele Neuentwicklung.

---

## 7. Bewusst offen / später

- Expliziter Erhaltungsmodus mit aktiver „Halten"-Ansage (statt stillem Freifeld).
- Tiefere Auswertung im Archiv (Bestwerte, Volumen, Fortschrittskurven je Journey).
- Feinschliff der Rückschau-Detailansicht.

---

## 8. Vorgeschlagener Schritt-Zuschnitt

Klein und einzeln testbar. Reihenfolge so, dass das Fundament zuerst steht.

1. **Abschluss und freies Training (Fundament).** Abschluss automatisch erkennen und
   auslösen (Einheit erfüllt letzte Journey-Woche), Journey schließen und archivieren,
   Meldung anzeigen. Journeylosen Modus als Coach-Verhalten umsetzen: Coach still,
   letzte geschaffte Werte als Vorbelegung, Zustand sichtbar benannt.
2. **Archiv-Liste** abgeschlossener Journeys auf der Journey-Seite.
3. **Rückschau-Detailansicht** (grob: Phasen und absolvierte Einheiten).
4. **Journey-Filter im Coach-Export.**

Zuschnitt wird beim Bauen angepasst, falls sich etwas verschiebt.
