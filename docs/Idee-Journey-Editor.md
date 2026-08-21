# Journey-Editor – Ideenpapier

> Doku-Typ: Idee. Festgehaltener Denkstand, noch kein Konzept. Nichts davon ist
> entschieden, nichts davon ist beauftragt.

Status: Sammelpapier. Entstanden aus der Frage, ob Phasen eines Tages selbst
zusammengestellt werden könnten, statt nur aus festen Vorlagen zu kommen.
Grundlage der Bestandsaufnahme: `adr/0018-steuerung-je-phasentyp.md` und
`Architektur.md`.

---

## 1. Die Frage

Heute entsteht jede Journey aus einer Vorlage. Die Vorlage bringt ihre Phasen mit,
beim Start werden sie eins zu eins in die Journey kopiert, und danach ist an der
Journey nur noch der Name änderbar. Vorlagen selbst sind in der App nicht
editierbar. Es gibt zwei davon: „Wiedereinstieg & Aufbau" und „Wiederaufbau nach
Fasten".

Die Frage lautet: Ließe sich daraus ein Baukasten machen? Also Phasen selbst
anlegen, benennen, in eine Reihenfolge bringen und mit eigenen Werten versehen –
statt aus einer festen Liste zu wählen.

Die kurze Antwort auf die Machbarkeit: ja, und das Datenmodell ist näher dran, als
es von außen aussieht. Der Aufwand steckt nicht in der Rechenlogik, sondern in zwei
Entscheidungen, die noch niemand getroffen hat (siehe Abschnitt 7 und 9).

---

## 2. Was heute schon frei ist

Eine Phase ist eine Datenzeile mit diesen Feldern. Fast alle sind bereits freie
Werte, nicht abgeleitete:

| Feld | Frei? | Bemerkung |
| --- | --- | --- |
| `name` | ja | reine Anzeige, ohne Wirkung |
| `focus` | nur 7 Werte | der Typ; siehe Abschnitt 3 |
| `weeks` | ja | bestimmt bei Plan-Phasen zugleich die Wiederholungsleiter |
| `sets_start` / `sets_end` | ja | Satzrampe über die Phasenwochen |
| `deload_week` | ja | Woche mit gesenktem Volumen |
| `rep_target_min` / `max` | ja | **hat Vorrang vor dem Band des Fokus** |
| `load_factor` | ja | Anteil des Referenzgewichts – ein eigener Steuerweg, siehe Abschnitt 5 |
| `week_plan` | ja (jsonb) | die Wochentabelle; siehe Abschnitt 4 |
| `position` | ja | Reihenfolge in der Journey |

Bemerkenswert ist die Zeile zum Wiederholungsband: Steht dort etwas, gewinnt es
gegen den Fokus. Der Fokus liefert nur den Ersatzwert für den leeren Fall
(`phaseRepBand` in `engine/journey.ts`). Das Prinzip „expliziter Wert schlägt
Ableitung aus dem Typ" ist im Modell also schon angelegt – es gilt bisher nur für
dieses eine Feld.

---

## 3. Was am Fokus klebt

Der Fokus ist heute kein Etikett, sondern ein Schalter, der **vier Dinge
gleichzeitig** entscheidet:

1. **Gibt es überhaupt einen Wochenplan?** `WEEK_PLAN_FOCUSES` – ja bei `strength`,
   `power`, `test`.
2. **Nach welcher Bauregel wird er erzeugt?** `buildWeekPlan` – Leiter bei
   `strength`/`power`, Entlastung plus Testwoche bei `test`.
3. **Wer steuert das Gewicht?** `planGovernsLoad` – Rampe aufwärts, fester Anteil
   vom Anker, oder der Coach.
4. **Gilt der vorsichtige Coach-Sonderweg?** Nur bei `reentry` (Steigerung nur bei
   niedriger Anstrengung *und* ohne Schmerzmeldung).

Nicht am Fokus hängt dagegen der Lastfaktor – er ist ein eigenes Feld und ein
eigener Steuerweg (Abschnitt 5). Wer nur den Fokus auflöst, hat ihn noch nicht
erfasst.

Diese Bündelung ist praktisch, solange es sieben feste Typen gibt, und steht im Weg,
sobald jemand eine eigene Phase bauen will. Sie ist zugleich der Grund, warum
ADR-0018 warnt, ein falsch gesetzter Fokus schicke eine Übung „stumm auf den anderen
Weg".

**Nomenklatur-Hinweis:** ADR-0018 nennt den Wochenplan „Weg 1" und den Coach
„Weg 2". Dieses Papier vermeidet die Nummern und sagt **Plan-Weg** und
**Coach-Weg**, weil die Nummern in Gesprächen wiederholt vertauscht wurden.

---

## 4. Der Kernbefund: der Plan ist schon ein freies Format

Der Wochenplan liegt als Liste an der Phase, eine Zeile je Woche, mit: Sätzen,
Ziel-Wiederholungen (von/bis), Ziel-Anstrengung als RIR, Anteil am Arbeitsgewicht
und einem Hinweistext.

Entscheidend ist, dass das **Lesen dieses Formats vollständig generisch** ist. Das
System fragt nie, warum in Woche 3 steht, was dort steht – es fragt nur, was gilt
(`weekPlanForWeek`). Fokusabhängig ist ausschließlich das **Erzeugen**
(`buildWeekPlan`), und das passiert genau einmal, beim Anlegen der Phase.

Daraus folgt: Eine frei editierbare Wochentabelle wäre kein neues System, sondern
ein Editor auf ein Format, das bereits existiert, bereits an der Phase liegt,
bereits mit der Journey mitwandert und bereits über ein Zod-Schema validiert
eingelesen wird. Der Plan-Weg ist damit heute schon vollständig datengetrieben – nur
ohne Bedienung.

Der Coach-Weg ist das Gegenteil: Dort gibt es keine Tabelle, sondern Regeln, die aus
Band, Satzrampe und Verlauf rechnen. Frei machen hieße hier nicht „Tabelle
editieren", sondern „Regler stellen".

---

## 5. Der dritte Steuerweg: der Lastfaktor

Plan-Weg und Coach-Weg sind nicht die ganze Wahrheit. Es gibt einen dritten Weg,
und er hängt nicht am Fokus, sondern an einem eigenen Feld: dem Lastfaktor.

Trägt eine Phase einen Lastfaktor unter 100 %, steuert **weder der Coach noch ein
Wochenplan** das Gewicht, sondern die Journey: Referenzgewicht × Faktor, und dieser
Wert ist Ziel und Deckel zugleich (`rampLoad` in `lib/coach.ts`, angewandt in
`withRamp`, `engine/progression.ts`). Ein guter Tag hebt ihn nicht an – genau das
ist der Zweck. Bei 100 % kippt das Verhalten: Dann wirkt der Wert nur noch als
Untergrenze, damit die Journey wieder am alten Niveau ankommt und der Coach von dort
normal übernimmt.

Genutzt wird das heute von genau einer Vorlage: „Wiederaufbau nach Fasten", vier
Phasen zu je einer Woche mit 65 % → 80 % → 95 % → 100 %.

**Die versteckte Nebenwirkung.** Der Lastfaktor braucht einen festen Bezugspunkt,
und den setzt nicht die Phase, sondern der Journey-Start: Trägt *irgendeine* Phase
der Vorlage einen Faktor ungleich 100 %, wird beim Start der Journey der aktuelle
Stand **aller** Übungen als Referenzgewicht eingefroren; trägt keine einen, wird der
alte Bezugspunkt weggeräumt (`nutztLastfaktor` / `friereReferenzgewichteEin` in
`lib/journeyWrite.ts`). Ohne eingefrorenen Bezug greift der Lastfaktor gar nicht,
und der Coach rechnet stumm wie gewohnt weiter.

Für einen Editor ist das der wichtigste Satz dieses Papiers: **Eine Einstellung an
einer einzelnen Phase löst eine Wirkung auf Journey-Ebene aus, die einmalig beim
Start fällt und danach feststeht.** Ein Baukasten, der Phasen isoliert behandelt,
übersieht das – und der Fehler wäre stumm, nicht laut.

---

## 6. Die sieben Typen als Bausteine

Wenn ein Editor entsteht, sind die sieben Typen seine Bausteine. Deshalb hier, was
jeder von ihnen tut und was an ihm überhaupt einstellbar wäre. Sortiert von leicht
nach schwer.

| Typ | Wiederholungen | Steuerweg | Sätze | Heute in Vorlage |
| --- | --- | --- | --- | --- |
| Kraftausdauer (`endurance`) | 12–18 | Coach | Rampe | nein |
| Hypertrophie (`hypertrophy`) | 8–12 | Coach | Rampe | ja |
| Wiedereinstieg (`reentry`) | 5–8 | Coach, vorsichtig | Rampe | ja |
| Erhaltung (`maintenance`) | Band der Übung | Coach | Rampe | nein |
| Maximalkraft (`strength`) | Leiter 5→2 | Wochenplan | 4 fest | ja |
| Intensivierung (`power`) | Leiter, kürzer | Wochenplan | 4 fest | nein |
| Test/Peak (`test`) | 3–5, dann 1 | Wochenplan | 2, dann 0 | ja |

**Kraftausdauer** – Kapazität und Durchhaltevermögen. Doppelprogression im breitesten
Band des Systems; weil das Band so weit ist, steigt das Gewicht selten. Einstellbar:
Wochen, Satzrampe, Entlastungswoche, Band.

**Hypertrophie** – Muskelaufbau über Volumen, der Typ mit der meisten Arbeit. Die
Satzrampe ist hier der Motor (in „Wiedereinstieg & Aufbau" 2 → 6 Sätze über fünf
Wochen, Entlastung in Woche 4). Ab fünf Sätzen toleriert der Coach zwei
Wiederholungen Abfall in den späteren Sätzen, sonst fröre das Gewicht ein.
Einstellbar: Wochen, Satzrampe, Entlastungswoche, Band.

**Wiedereinstieg** – zurück ins Training nach Pause oder Verletzung. Eigener,
vorsichtiger Coach-Zweig: Ziel ist immer der Bandanfang, das Gewicht steigt nur bei
niedriger Anstrengung *und* ohne Schmerzmeldung, gerundet wird immer ab. Der einzige
Typ, bei dem eine Schmerzmeldung allein die Steigerung stoppt. Einstellbar: wie
oben, plus in der Praxis der Lastfaktor.

**Erhaltung** – halten statt aufbauen. Der einzige Typ ohne eigenes
Wiederholungsband: Jede Übung behält ihr eigenes, gebremst wird über wenige Sätze.
Einstellbar: Wochen, Satzzahl.

**Maximalkraft** – schwer werden. Wochenplan aus der Phasenlänge: feste Leiter,
durchgehend vier Arbeitssätze, RIR 2 und in den letzten beiden Wochen RIR 1. Das
Gewicht startet aus dem geschätzten 1RM und steigt wöchentlich, aber nur nach einer
sauberen Vorwoche; gesenkt wird nie. Keine Entlastungswoche – die steht in der
Testphase. Einstellbar: **nur die Wochenzahl.**

**Intensivierung** – Zuspitzung nach der Kraftphase. Technisch identisch mit
Maximalkraft, nur mit engerem Rückfallband (3–5) und typischerweise drei Wochen, was
die Leiter auf 5 · 4 · 3 kürzt. Einstellbar: **nur die Wochenzahl.**

**Test/Peak** – Abschluss. Bauregel: letzte Woche ist die reine Testwoche (null
Sätze, plant nichts, erfüllt sich selbst), jede Woche davor ist Entlastung mit 60 %
vom Startgewicht der Kraftphase. Einstellbar: **nur die Wochenzahl**, und die
bedeutet hier allein, wie viele Entlastungswochen vor dem Test liegen.

Die Wiederholungsleitern der Plan-Typen hängen an der Wochenzahl:

| Wochen | Leiter |
| --- | --- |
| 3 | 5 · 4 · 3 |
| 4 | 5 · 4 · 3 · 2 |
| 5 | 5 · 5 · 4 · 3 · 2 |
| 6 | 5 · 5 · 4 · 4 · 3 · 2 |

Außerhalb von 3–6 rechnet `repLadder` weiter (kürzer wird von hinten geschnitten,
länger wird die erste Woche wiederholt), sinnvoll ist es nicht. 3–6 wäre der
ehrliche Bereich für einen Regler.

---

## 7. Bedienidee: der Nutzer wählt Typen, keine Wege

Der naheliegendste Zuschnitt, und er kommt ohne jede Änderung am Datenmodell aus:

**Der Nutzer wählt einen der sieben Typen. Die Steuerwege bleiben unsichtbar.**
Plan-Weg, Coach-Weg und Lastfaktor sind Systemwissen – niemand muss verstehen, dass
eine Kraftphase anders rechnet als eine Hypertrophiephase, um sie zu benutzen. Der
Typ bringt sein Verhalten mit, so wie heute.

**Je Typ erscheinen nur die Optionen, die dort etwas bewirken.** Bei Hypertrophie:
Wochen, Satzrampe, Entlastungswoche. Bei Maximalkraft: nur Wochen (3–6). Bei
Test/Peak: gar nichts oder fast nichts. Ein Feld, das nichts bewirkt, ist schlimmer
als kein Feld – man zieht daran und es passiert nichts.

**Was fest ist, bleibt fest und wird nicht angeboten.** Die vier Sätze der
Kraftphase, die Ziel-Anstrengung, die Bauregel der Testphase: alles Werte mit
Begründung (ADR-0018), keine Geschmacksfragen.

**Die Abfolge liegt beim Nutzer.** Das System prüft nicht, ob ein Block
trainingslogisch klug zusammengesetzt ist – ob eine Testphase nach einer
Hypertrophiephase Sinn ergibt, entscheidet der Nutzer. Das ist eine bewusste
Entscheidung für Verantwortung statt Bevormundung, und sie hat einen Preis: siehe
den Punkt zum Bezugspunkt der Entlastung in Abschnitt 9.

Damit wäre die Blockdefinition: **Typ wählen → Wochen wählen → gegebenenfalls
Entlastungswoche → Reihenfolge festlegen → fertig.** Vier Handgriffe je Phase, und
das Ergebnis ist eine Phasenzeile, wie sie heute schon in der Datenbank steht.

### Zwei Dinge, die dabei zu klären sind

**Feste Wochenzahl bei Test/Peak?** Die Idee, sie auf zwei Wochen festzunageln
(eine Entlastung, dann Test), ist sauber – aber es gibt einen dokumentierten
Gegenfall: „Wiederaufbau nach Fasten" hat bewusst eine **einwöchige** Testphase
(„Standort"). Begründung in Migration `0037`: Die drei Wochen davor laufen ohnehin
bei 65/80/95 %, „eine Entlastung wäre Erholung von etwas, das nie belastet hat."
Also entweder Vorgabe 2 mit Abweichungsmöglichkeit, oder Auswahl nur zwischen 1 und
2 – aber nicht hart auf 2, sonst ließe sich eine bestehende Vorlage nicht mehr
nachbauen.

**Der Wochenplan muss neu gerechnet werden, wenn sich die Wochenzahl ändert.**
Heute entsteht er genau einmal – beim Seeden oder per Migration. Ändert jemand eine
Kraftphase von fünf auf vier Wochen, passt die gespeicherte Leiter nicht mehr zur
Phasenlänge. Der Editor müsste den Plan bei jeder Änderung neu erzeugen
(`buildWeekPlan`), und das ist die einzige Stelle, an der er wirklich in die Engine
greift. Alles andere ist Schreiben von Feldern.

---

## 8. Die zweite Ausbaustufe: die Bündelung auflösen

Abschnitt 7 lässt die sieben Typen unangetastet – der Nutzer wählt aus ihnen, das
System behält sein Wissen. Das reicht für einen Editor völlig aus. Erst wenn jemand
*eigene* Typen bauen können soll, die es heute nicht gibt, braucht es die folgende
Stufe. Sie ist ausdrücklich nicht der nächste Schritt, sondern der übernächste.

Skizze, nicht Vorschlag. Der Fokus würde zum **Etikett** herabgestuft (Name, Farbe,
Einordnung in der Periodisierungskurve), und die vier Fragen aus Abschnitt 3 würden
zu eigenen, sichtbaren Feldern an der Phase. Im Kern drei Schalter:

- **Steuerung:** Coach-Weg oder Plan-Weg
- **Gewichtsregel:** Coach entscheidet / Rampe aufwärts / fester Anteil vom
  Startgewicht / Vorgabe der Journey (Lastfaktor, Abschnitt 5)
- **Vorsichtsmodus:** an oder aus (heute: `reentry`)

Der Lastfaktor ist dabei die unbequemste dieser Gewichtsregeln: Er ist heute schon
ein freies Feld, also scheinbar der einfachste Baustein – aber er ist der einzige,
dessen Wirkung nicht in der Phase endet.

Danach wäre eine Phase ein Baukasten: Name frei, Wochen frei, und je nach Steuerweg
entweder Band plus Satzrampe (Coach-Weg) oder eine Wochentabelle (Plan-Weg). Die
sieben heutigen Typen wären dann sieben gespeicherte Voreinstellungen dieses
Baukastens – was sie inhaltlich ohnehin schon sind.

Die Rechenlogik in `engine/` bliebe dabei unberührt. Was sich ändert, ist allein,
woher die Verzweigung ihre Antwort bekommt: heute aus dem Fokus, dann aus einem
gespeicherten Wert.

---

## 9. Offene Fragen und Stolpersteine

Diese Punkte sind der eigentliche Inhalt eines späteren Konzepts.

**Die Null-Sätze-Woche.** Eine Planwoche mit null Sätzen verlangt keine Einheit und
erfüllt sich dadurch selbst (`weekDemandsSession`, `engine/journey.ts`). Das ist
heute genau einmal gewollt: die Testwoche am Ende. In einem freien Editor ließe sich
das versehentlich mitten in eine Phase setzen – das Ergebnis wäre eine Woche, die
von allein weiterzählt, egal ob trainiert wird. Verbieten oder als bewusste Option
benennen?

**Der Bezugspunkt der Entlastung.** Die 60 % der Testphase beziehen sich auf
`plan_start_weight`, das Startgewicht der vorangegangenen Kraftphase. Steckt jemand
eine Testphase direkt hinter eine Hypertrophiephase, ist offen, wovon entlastet
wird. Braucht eine klare Regel, bevor Phasen frei zusammensteckbar werden.

**Ändern während es läuft.** Der heikelste Teil, und er betrifft nicht den Editor,
sondern die Journey. Die Position wird aus den absolvierten Trainingswochen
abgeleitet, nicht aus dem Kalender. Verkürzt man eine laufende Phase von fünf auf
drei Wochen, springt der Standort – und die Gewichtsanker, die per
`reference_phase_id` an der Phase hängen, stehen plötzlich woanders. Vermutliche
Trennung: Vorlagen frei editierbar, laufende Journey nur eingeschränkt (kommende
Phasen ja, laufende und vergangene nein).

**Lastfaktor und Plan-Weg schließen sich heute still aus.** Laut ADR-0018 wirkt der
Lastfaktor im Plan-Weg nicht – dort kommt die Last aus dem Plan. Beide zusammen gibt
es heute faktisch nicht: „Wiederaufbau nach Fasten" hat zwar eine Plan-Phase
(„Standort", Fokus `test`), die trägt aber Faktor 100 % und plant ohnehin nichts.
Ein Editor könnte die Kombination erstmals scharf erzeugen – dann verlöre der
Lastfaktor stillschweigend seine Wirkung. Entweder sperren oder auflösen.

**Wo gehört der Lastfaktor überhaupt hin?** Er steht an der Phase, wirkt aber über
die Journey (Abschnitt 5). Drei denkbare Antworten, jede mit Folgen: an der Phase
lassen und die Nebenwirkung sichtbar machen („diese Journey friert deinen Stand beim
Start ein"); an die Journey hochziehen und die Phasen nur noch Prozentwerte tragen
lassen; oder ihn als eigene Bauart der Phase führen, die den Coach-Weg ersetzt statt
ihn zu überlagern. Vor dieser Frage lässt sich keine Bedienung entwerfen.

**Was passiert bei einem Lastfaktor ohne Bezugspunkt?** Heute unmöglich, weil das
Einfrieren automatisch am Journey-Start hängt. Sobald Phasen einzeln editierbar
werden – etwa ein Lastfaktor, der einer laufenden Journey nachträglich hinzugefügt
wird –, entsteht der Fall zum ersten Mal. Ohne eingefrorenes Referenzgewicht wirkt
der Faktor gar nicht, und zwar ohne jede Meldung.

**Wie viel Freiheit überhaupt?** Zwei Enden derselben Achse: eine frei editierbare
Wochentabelle (maximal frei, maximal Verantwortung beim Nutzer) oder ein Baukasten
mit wenigen Reglern, aus dem die Tabelle weiterhin gerechnet wird (weniger frei,
kaum kaputtzumachen). Diese Frage entscheidet fast alles andere.

**Vorlage oder Journey – was wird eigentlich editiert?** Heute entstehen Journeys
nur aus Vorlagen (`writeJourneyStart`). Denkbar wären: Vorlagen editierbar machen,
eine Journey ohne Vorlage anlegen, oder eine laufende Journey anpassen. Das sind
drei verschiedene Vorhaben mit verschiedenem Risiko.

---

## 10. Was hier bewusst nicht steht

Kein Layout, kein Komponentenschnitt, keine Schrittfolge, keine Migration. Das
gehört in ein Konzept, und ein Konzept entsteht erst, wenn die Fragen aus
Abschnitt 9 beantwortet sind – vor allem die nach dem Freiheitsgrad.

Auch keine Aussage darüber, ob das überhaupt gebaut werden soll. Die beiden
bestehenden Vorlagen decken den heutigen Bedarf; von sieben ursprünglichen Vorlagen
wurden fünf wieder entfernt, weil sie nie gebraucht wurden (Migration `0036`). Ein
Editor wäre eine Antwort auf einen Bedarf, der bisher nicht belegt ist – das ist
kein Gegenargument, aber es gehört in die Abwägung.

---

## 11. Nächster Schritt

Wenn daraus ein Konzept werden soll: mit Abschnitt 9 anfangen, nicht mit dem
Editor. Zuerst der Freiheitsgrad, dann die Frage Vorlage-oder-Journey. Alles Weitere
folgt daraus.
