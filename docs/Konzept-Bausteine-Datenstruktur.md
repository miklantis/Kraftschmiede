# Bausteine in der Datenbank – Konzept (Teil 1)

> Doku-Typ: Konzept. Hält den besprochenen Stand fest, bevor gebaut wird. Noch nicht in
> Umsetzung.

Teil 1 von zwei. Dieses Papier befasst sich **nur mit der Datenstruktur**: Die
Phasen-Bausteine bekommen eine eigene Definition in der Datenbank, samt ihrer
Eigenschaften – welche Bausteine es gibt, wie viele Wochen sie erlauben, mit welchen
Werten sie starten. Dazu die Frage, ob die Journey-Vorlage selbst neue Felder braucht.

Wie man das später sichtbar und bedienbar macht, steht in
[`Idee-Journey-Editor.md`](./Idee-Journey-Editor.md) (Teil 2). Teil 1 hängt nicht daran:
Er ist auch ohne Editor sinnvoll und für sich testbar.

**Ziel nach Teil 1:** Alle acht Bausteine sind im System vorhanden, Engine und Coach
verstehen sie und reagieren richtig darauf. Aus ihnen lassen sich neue Journey-Vorlagen
zusammenstellen – vorerst per Migration, noch nicht per Oberfläche.

Grundlage: [`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md),
[`adr/0002-definitionen-in-db.md`](./adr/0002-definitionen-in-db.md) und
[`Architektur.md`](./Architektur.md).

---

## 1. Ausgangslage: wo ein Baustein heute steht

Ein Baustein ist heute kein Ding, sondern ein Wort: der Textwert in `phases.focus`. Was
dieses Wort bedeutet, steht verteilt an vier Stellen im Code und keiner davon in der
Datenbank:

| Was | Wo heute |
| --- | --- |
| Welche Werte überhaupt erlaubt sind | `CHECK`-Liste in `0001_initial_schema.sql` (zweimal) und `focusEnum` in `schemas/shared.ts` |
| Welches Wiederholungsband dazugehört | `repTargetForFocus` in `engine/journey.ts` (switch) |
| Ob ein Wochenplan entsteht und welcher | `buildWeekPlan` in `engine/weekPlan.ts` |
| Ob der Plan die Last steuert | `planGovernsLoad` in `engine/weekPlan.ts` |
| Der vorsichtige Zweig des Wiedereinstiegs | `focus === "reentry"` in `lib/coach.ts` |

Wochenzahlen, Satzrampen, Entlastungswochen und Lastfaktoren stehen dagegen gar nirgends
als Eigenschaft des Bausteins – sie sind je Vorlagenphase von Hand in den Seed getippt
(`seed/definitions.ts`). Es gibt keinen Ort, an dem steht „eine Kraftphase dauert 3 bis 6
Wochen". Diese Grenzen existieren nur in Köpfen und in diesem Repo als Prosa.

Genau das dreht Teil 1 um.

---

## 2. Die Entscheidung: Katalog in der Datenbank, Rechenweg im Code

Es entsteht eine neue Stammdaten-Tabelle **`phase_types`** (im Gespräch: „Bausteine"),
pro Nutzer geseedet wie Übungen und Vorlagen (ADR-0002). Sie beantwortet drei Fragen:

1. **Welche Bausteine gibt es** – eine Zeile je Baustein, mit Name und Beschreibung.
2. **Womit fängt eine Phase dieses Typs an** – Vorgabewerte für Wochen, Sätze, Band,
   Entlastung, Last.
3. **Was ist an ihm einstellbar und in welchen Grenzen** – Wochen-Unter- und Obergrenze,
   und für jede Eigenschaft, ob sie überhaupt frei ist.

Sie beantwortet ausdrücklich **nicht**, wie gerechnet wird. Der Steuerweg steht als
Schlüsselwort in der Zeile (`control`), die dazugehörige Rechnung bleibt im Code.

### Bausteine wirken beim Anlegen, nicht beim Rechnen

Der wichtigste Punkt dieses Konzepts, weil er den Umfang klein hält:

**Die Bausteine-Tabelle wird gelesen, wenn eine Phase entsteht – nicht, wenn der Coach
rechnet.** Beim Anlegen einer Phase werden die Vorgabewerte des Bausteins in die
Phasenzeile geschrieben, genau wie heute schon der Wochenplan (`buildWeekPlan` läuft
einmal, das Ergebnis liegt als `week_plan` an der Phase). Danach ist die Phase
vollständig aus sich heraus lesbar.

Das hat drei Folgen, alle erwünscht:

- **Engine und Coach ändern ihre Datenquelle nicht.** Sie lesen weiter die Phasenzeile.
  Kein neuer Query-Hook im Trainingsablauf, keine zweite Wahrheit zur Laufzeit.
- **Eine geänderte Baustein-Definition rührt laufende Journeys nicht an.** Wer die
  Vorgabe „Hypertrophie startet mit 5 Wochen" ändert, ändert nichts an einer Journey, die
  gerade läuft. Das ist dieselbe Festlegung wie in ADR-0018 („Liste an der Phase statt
  Interpolation").
- **Der Steuerweg muss zur Laufzeit nicht nachgeschlagen werden.** Er ist an der Phase
  schon ablesbar: Eine Phase mit `week_plan` läuft über den Plan, eine mit gesetzter
  Lastrampe über die Vorgabe, alle anderen über den Coach.

### Bleibt bewusst im Code

- Die Bauregeln der Wochenpläne (`buildStrengthWeekPlan`, `buildTestPhaseWeekPlan`) und
  die Wiederholungsleiter. Ein Baustein nennt den Bauplan beim Namen, er beschreibt ihn
  nicht.
- Die Progression selbst (`engine/progression.ts`, `engine/planLoad.ts`).
- Der vorsichtige Coach-Zweig des Wiedereinstiegs. Er hängt weiter am Schlüssel
  `reentry`, weil er eine Rechenregel ist und keine Einstellung.

Damit gilt: **Ein Baustein-Schlüssel ist ein Vertrag mit dem Code.** Neue Zeilen in der
Tabelle kann sich niemand ausdenken – die Engine wüsste nicht, was sie damit tun soll.
Die Tabelle beschreibt das Vorhandene vollständig, sie erweitert es nicht.

---

## 3. Die Felder der Baustein-Zeile

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `key` | text | Schlüssel, identisch mit `phases.focus`. Der Vertrag mit dem Code. |
| `name` | text | Anzeigename („Maximalkraft") |
| `summary` | text | ein bis zwei Sätze, was der Baustein tut – für die Auswahl in Teil 2 |
| `position` | int | Reihenfolge in der Auswahl |
| `control` | text | Steuerweg: `coach`, `plan` oder `load_ramp` |
| `plan_builder` | text, null | welcher Wochenplan gebaut wird (`strength_ladder`, `test`); null bei `control = coach` |
| `weeks_min` / `weeks_max` / `weeks_default` | int | erlaubter Bereich und Vorgabewert |
| `sets_start_default` / `sets_end_default` | int | Satzrampe von der ersten zur letzten Phasenwoche |
| `sets_locked` | bool | true = die Sätze kommen aus dem Wochenplan und sind nicht einstellbar |
| `rep_min_default` / `rep_max_default` | int, null | Vorgabe-Wiederholungsband; null = die Übung behält ihr eigenes |
| `rep_band_locked` | bool | true = das Band hat in diesem Steuerweg keine Wirkung (ADR-0018) |
| `deload_allowed` | bool | ob eine Entlastungswoche überhaupt sinnvoll ist |
| `deload_default` | int, null | Vorgabe-Entlastungswoche, wenn erlaubt |
| `load_start_default` / `load_end_default` | numeric, null | Lastrampe; nur bei `control = load_ramp` gesetzt |
| `needs_1rm` | bool | der Baustein braucht ein gespeichertes 1RM, sonst fällt er auf das letzte Arbeitsgewicht zurück |
| `placement_hint` | text, null | reiner Hinweistext („gehört an den Anfang der Journey") – ohne jede Wirkung, das System prüft die Abfolge nicht |

Zur Form: **einzelne Spalten statt einem `jsonb`-Feld.** Ein Baustein hat wenige, feste
Eigenschaften; als Spalten sind sie im SQL lesbar, per `CHECK` prüfbar und im
Zod-Schema klar. Das offene `props`-Feld wäre nur dann besser, wenn Bausteine sehr
verschiedene Eigenschaften hätten – haben sie nicht.

Die Sperren (`sets_locked`, `rep_band_locked`) sind ausdrücklich Teil der Daten und nicht
erst Sache der Oberfläche. Sie halten fest, was ADR-0018 an Wirkung festgelegt hat: In
einer Kraftphase steht das Wiederholungsband zwar in der Zeile, greift aber nicht. Wer
das nur in der Oberfläche versteckt, hat die Falle nur unsichtbar gemacht.

---

## 4. Die acht Bausteine mit ihren Werten

| Baustein (`key`) | Steuerweg | Wochen min/max/Vorgabe | Sätze | fest | Wdh.-Band | fest | Entlastung | Last | 1RM |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kraftausdauer (`endurance`) | coach | 3 / 8 / 4 | 2 → 4 | nein | 12–18 | nein | ja, Woche 4 | – | nein |
| Hypertrophie (`hypertrophy`) | coach | 3 / 8 / 5 | 2 → 6 | nein | 8–12 | nein | ja, Woche 4 | – | nein |
| Wiedereinstieg (`reentry`) | coach | 1 / 4 / 2 | 2 → 2 | nein | 5–8 | nein | nein | – | nein |
| Erhaltung (`maintenance`) | coach | 1 / 12 / 3 | 3 → 3 | nein | – (Übung behält ihres) | nein | nein | – | nein |
| Maximalkraft (`strength`) | plan (`strength_ladder`) | 3 / 6 / 5 | 4 → 4 | ja | 4–6 | ja | nein | – | ja |
| Intensivierung (`power`) | plan (`strength_ladder`) | 3 / 4 / 3 | 4 → 4 | ja | 3–5 | ja | nein | – | ja |
| Test/Peak (`test`) | plan (`test`) | 1 / 2 / 2 | 2 → 2 | ja | 2–4 | ja | steckt in der Bauregel | – | nein |
| Wiederaufbau (`rebuild`) | load_ramp | 3 / 6 / 4 | 2 → 4 | nein | 6–10 | nein | nein | 65 % → 95 % | nein |

Woher die Zahlen kommen:

- **Die 3 bis 6 Wochen der Plan-Typen sind technisch gesetzt.** Darunter schneidet
  `repLadder` die Leiter von hinten ab – es fallen genau die schweren Wochen weg, wegen
  derer die Phase existiert. Darüber wiederholt sie nur die erste Woche.
- **Die Untergrenze der Coach-Typen folgt aus der Satzrampe.** Sie braucht drei Wochen,
  um ein Verlauf zu sein; eine Entlastungswoche lohnt erst ab vier. Wiedereinstieg und
  Erhaltung sind die Ausnahmen: Beide haben kein Ziel, das sich über Wochen aufbaut, und
  dürfen deshalb kurz sein.
- **Die Obergrenzen sind Ermessenssache** und bewusst großzügig. Sie verhindern Unsinn
  (eine 30-Wochen-Kraftphase), nicht ungewöhnliche Wünsche.
- **`maintenance` hat als einziger Baustein kein Band.** Jede Übung behält ihr eigenes,
  gebremst wird über die niedrige Satzzahl.
- **Kraftausdauer, Intensivierung und Erhaltung stehen heute in keiner Vorlage.** Nach
  Teil 1 sind sie als Daten vorhanden und benutzbar – das ist ein Teil des Ziels „alle
  Bausteine im System".

---

## 5. Der neue Baustein: Wiederaufbau (`rebuild`)

Sieben Bausteine gibt es. Der achte ist neu und der einzige echte Zubau in Teil 1.

Die Vorlage „Wiederaufbau nach Fasten" ist heute in vier Einzelphasen zerlegt (65 / 80 /
95 / 100 %), weil eine Phase nur **einen** Lastwert tragen kann. Sie ist aber keine
Abfolge von Blöcken, sondern eine einzige Bewegung: vom gedrosselten Gewicht zurück auf
hundert Prozent. Als Baustein gedacht heißt das: **ein Block, drei Wochen, 65 % → 95 %.**

### Was er tut

- Je Phasenwoche eine Laststufe, linear von `load_start` nach `load_end`:
  `Faktor(Woche) = start + (ziel − start) × (Woche − 1) / (Wochen − 1)`.
  Bei 3 Wochen und 65 → 95 % ergibt das genau 65 / 80 / 95 – die heutige Vorlage.
- Bezugsgröße ist das **beim Journey-Start eingefrorene Referenzgewicht**
  (`friereReferenzgewichteEin`). Ohne diesen Bezugspunkt wirkt der Anteil gar nicht, und
  zwar ohne jede Meldung.
- Unter 100 % ist der gerechnete Wert **Ziel und Deckel zugleich**: Ein guter Tag hebt ihn
  nicht an, genau das ist der Zweck. Bei 100 % wirkt er nur noch als Untergrenze, damit
  der Coach von dort normal übernimmt.
- Die Wiederholungen steuert der Coach im Band, das Gewicht nicht.

### Festlegungen

- **Mindestens drei Wochen.** Zwei Wochen sind kein Verlauf, sondern ein Sprung von 65 auf
  100 %. Ab drei gibt es eine echte Zwischenstufe.
- **Zielanteil 95 %, wenn eine Testphase folgt, sonst 100 %.** Die volle Last trägt dann
  die Testwoche. Drei Wochen Aufbau plus Testwoche ist zugleich die kürzeste sinnvolle
  Rückkehr.
- **Die Testwoche gehört nicht in den Baustein.** Sie bleibt eine eigene Testphase
  dahinter, sonst stünde ihre Bauregel an zwei Stellen im System.
- **Kein Wochenplan.** Lastrampe und Wochenplan zusammen ergeben keinen Sinn – dort käme
  die Last aus dem Plan. `buildWeekPlan` liefert für `rebuild` weiterhin `null`.
- **Keine Entlastungswoche.** Der Block ist bereits die Entlastung.
- **Gehört an den Anfang der Journey.** Sonst zöge er auf ein Niveau von vor mehreren
  Wochen zurück. Das steht als `placement_hint` in den Daten und wird nicht erzwungen.

### Was sich an der heutigen Vorlage dadurch ändert

Aus vier Phasen werden zwei: ein Wiederaufbau-Block (3 Wochen, 65 → 95 %) und eine
Testphase (1 Woche). Zwei kleine, bewusste Abweichungen: Das Wiederholungsband ist über
alle drei Wochen 6–10 statt in Woche 1 8–10, und die Satzrampe läuft 2 → 4 statt
2 / 3 / 3–4. Beides liegt innerhalb dessen, was die Einzelphasen ohnehin taten.

---

## 6. Braucht die Journey-Vorlage neue Felder?

Kurz: **Der Vorlagenkopf nein, die Vorlagenphase ja – ein Feld.**

### `journey_templates` (Kopf): unverändert

`key`, `name`, `tagline`, `for_whom`, `summary`, `position` reichen. Geprüft und
verworfen wurden zwei Ideen:

- **Ein Kennzeichen „arbeitet mit Lastvorgabe".** Überflüssig: Es ist aus den Phasen
  ablesbar, und genau so entscheidet `journeyWrite` heute schon, ob eingefroren wird.
  Eine zweite, pflegebedürftige Wahrheit über denselben Sachverhalt.
- **Eine Gesamt-Wochenzahl.** Ergibt sich aus der Summe der Phasen. Gespeichert wäre sie
  ab der ersten Änderung falsch.

### `journey_template_phases` und `phases`: ein neues Feld

| Feld | Änderung |
| --- | --- |
| `load_factor` | bleibt wie es ist – ab jetzt gelesen als **Startanteil** der Phase, Default 1.0 |
| `load_factor_end` | **neu**, numeric, nullable. null = konstante Last (das heutige Verhalten aller Phasen). Gesetzt = Rampe von `load_factor` nach `load_factor_end` über die Phasenwochen |

Beide Tabellen bekommen dasselbe Feld, weil die Phasenzeile beim Journey-Start
unverändert mitwandert.

Bewusst **kein** neues Feld:

- **Kein `phase_type_id`.** `focus` ist bereits der Schlüssel auf den Baustein. Eine
  zweite Spalte für dieselbe Aussage wäre eine Einladung zum Auseinanderlaufen.
- **Keine Kopie von `control` oder `plan_builder` an der Phase.** Der Steuerweg ist an der
  Phase schon ablesbar: `week_plan` gesetzt → Plan, `load_factor_end` gesetzt → Lastrampe,
  sonst Coach.
- **Keine Kopien der Grenzen** (`weeks_min` und so weiter). Grenzen gelten beim Anlegen,
  nicht danach.

### Der Fremdschlüssel: bewusst keiner

Naheliegend wäre, `phases.focus` per Fremdschlüssel an `phase_types.key` zu binden. Das
wird **nicht** gemacht: Die Bausteine liegen wie alle Definitionen pro Nutzer (ADR-0002),
der Fremdschlüssel müsste also über `(user_id, key)` laufen und den Seed-Ablauf an die
Journey-Tabellen koppeln. Der Aufwand steht in keinem Verhältnis.

Stattdessen bleibt es bei der `CHECK`-Liste, die um `rebuild` erweitert wird. Damit steht
die Menge der gültigen Schlüssel weiterhin an drei Stellen: `CHECK`, `focusEnum` und die
geseedeten Zeilen. Das ist der ehrliche Preis dieser Lösung – abgesichert wird er durch
einen Test, der die drei Listen gegeneinander prüft. Er schlägt fehl, sobald eine Stelle
vergessen wird.

---

## 7. Was Engine und Coach dafür lernen müssen

Der größte Teil der Logik ist vorhanden. Neu ist im Kern eine einzige Rechnung.

| Stelle | Änderung |
| --- | --- |
| `engine/` (neu, klein) | `phaseLoadForWeek(start, end, weeks, wocheInPhase)` – die lineare Stufe. Reine Funktion, testbar ohne DB |
| `lib/phaseContext.ts` | gibt statt des rohen `load_factor` den Wert der **laufenden Woche** weiter |
| `lib/coach.ts` | **unverändert.** Der Coach bekommt weiterhin nur einen Lastfaktor gereicht und weiß nicht, dass der jetzt wandert |
| `lib/journeyWrite.ts` | friert Referenzgewichte auch ein, wenn nur `load_factor_end` ≠ 1 ist |
| `engine/weekPlan.ts` | `rebuild` liefert weiterhin `null` – nur der Vollständigkeit halber prüfen und mit einem Test festhalten |
| `engine/journey.ts` | `repTargetForFocus` bekommt den Eintrag für `rebuild` (6–10) |
| `schemas/shared.ts` | `focusEnum` um `rebuild` erweitert |
| `lib/loadFactor.ts` | Hinweistext nennt den Anteil der laufenden Woche statt eines festen Werts |
| Anzeige | Journey-Seite und Periodisierungskurve zeigen den Wochenanteil; die bestehenden Bausteine dafür sind da |

Dass der Coach unberührt bleibt, ist kein Zufall, sondern die Probe aufs Konzept: Die
Lastrampe ist eine Vorgabe an der Phase, keine neue Regel im Coach.

---

## 8. Vorgeschlagener Schritt-Zuschnitt

Fünf Schritte, jeder für sich auslieferbar und testbar. Erst wenn abgestimmt ist, dass
gebaut wird, entstehen daraus ein Vorhaben-Issue und fünf Schritt-Issues.

1. **Bausteine-Tabelle anlegen und seeden.** Migration mit Tabelle, `CHECK`s und den acht
   Zeilen; Zod-Schema; Query-Hook; Abgleichstest gegen `focusEnum` und die `CHECK`-Liste.
   Wirkt noch nirgends – reiner Zubau.
2. **Lastrampe an Vorlage und Phase.** Migration für `load_factor_end`, `focusEnum` und
   `CHECK` um `rebuild` erweitert, Schemata nachgezogen. Ohne Rampe verhält sich alles wie
   heute.
3. **Engine und Coach.** Wochenweise Laststufe, Einfrieren der Referenzgewichte,
   Hinweistexte, Anzeige. Danach ist `rebuild` ein funktionierender Baustein.
4. **Vorlage „Wiederaufbau nach Fasten" umstellen.** Migration: vier Phasen werden zwei.
   Sinnvollerweise in dem Fenster, in dem keine Journey läuft – dann muss keine laufende
   Journey mitgezogen werden.
5. **Doku.** `Architektur.md` (neue Tabelle, neues Feld), ADR-Ergänzung zu ADR-0018 um den
   dritten Steuerweg, dieses Papier auf den gebauten Stand ziehen.

Der zeitliche Rahmen passt zum Vorhaben: In etwa zwei Wochen läuft die aktuelle Journey
aus. Schritt 4 gehört in genau dieses Fenster, Schritt 1 bis 3 können davor liegen.

---

## 9. Offene Punkte

- **Neue Vorlagen aus den Bausteinen.** Nach Teil 1 lassen sich Journeys per Migration
  zusammenstellen. Welche das sein sollen (Kraftausdauer-Block? eine reine
  Erhaltungs-Journey für ruhige Zeiten?), ist noch nicht besprochen und gehört nicht in
  dieses Papier.
- **Was aus der laufenden Fasten-Journey wird, falls doch eine läuft.** Vorschlag: nur
  Vorlagen umstellen, laufende Journeys unangetastet lassen. Ihre Einzelphasen bleiben
  gültig, weil `load_factor` ohne `load_factor_end` weiter das Alte tut.
- **Entlastung ohne Vorgängerphase.** Kam eine Übung in der Phase davor gar nicht vor,
  greift in der Testphase die dritte Stufe der Bezugsreihenfolge (altes 1RM). Bei
  Nebenübungen möglich, vorerst so lassen.
- **Neuberechnung des Wochenplans bei geänderter Wochenzahl.** Der Plan entsteht heute
  genau einmal. Solange Phasen nur per Migration entstehen, ist das kein Problem – ab
  Teil 2 schon. Gehört dorthin, ist hier nur vermerkt.
