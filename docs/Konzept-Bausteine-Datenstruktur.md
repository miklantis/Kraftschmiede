# Bausteine in der Datenbank – Konzept (Teil 1)

> Doku-Typ: Konzept. Hält den besprochenen Stand fest, bevor gebaut wird. Noch nicht in
> Umsetzung.
>
> Stand 22.08.2026: gegen Code und Live-Datenbank durchgeprüft. Die Befunde sind
> eingearbeitet – die größte Korrektur betrifft den Steuerweg (Abschnitt 2, „Die Phase
> trägt ihre Bauart mit"). Wo der erste Entwurf danebenlag, steht das an Ort und Stelle
> dabei, statt still ersetzt zu werden.
>
> Ebenfalls am 22.08.2026 entschieden: die Leiter der Intensivierung (Abschnitt 8), die
> Entlastungswoche der Kraftausdauer (Abschnitt 4) und der Name der Testphase
> (Abschnitt 9). Damit ist von den fachlichen Fragen keine mehr offen; was noch aussteht,
> steht in Abschnitt 13.

Teil 1 von zwei. Dieses Papier befasst sich **nur mit der Datenstruktur**: Die
Phasen-Bausteine bekommen eine eigene Definition in der Datenbank, samt ihrer
Eigenschaften – welche Bausteine es gibt, wie viele Wochen sie erlauben, mit welchen
Werten sie starten, und was an ihnen überhaupt einstellbar ist.

Wie man das später sichtbar und bedienbar macht, steht in
[`Idee-Journey-Editor.md`](./Idee-Journey-Editor.md) (Teil 2). Teil 1 hängt nicht daran:
Er ist auch ohne Editor sinnvoll und für sich testbar.

**Ziel nach Teil 1:** Alle acht Bausteine sind im System vorhanden und sind die **Quelle**
für die Werte einer Phase – nicht mehr eine Beschreibung dessen, was ohnehin im Code
steht. Engine und Coach verstehen sie und reagieren richtig darauf. Aus ihnen lassen sich
neue Journey-Vorlagen zusammenstellen – vorerst per Migration, noch nicht per Oberfläche.

Grundlage: [`adr/0018-steuerung-je-phasentyp.md`](./adr/0018-steuerung-je-phasentyp.md),
[`adr/0002-definitionen-in-db.md`](./adr/0002-definitionen-in-db.md),
[`adr/0001-offline-first.md`](./adr/0001-offline-first.md) und
[`Architektur.md`](./Architektur.md).

---

## 1. Ausgangslage: wo ein Baustein heute steht

Ein Baustein ist heute kein Ding, sondern ein Wort: der Textwert in `phases.focus`. Was
dieses Wort bedeutet, steht verteilt über den Code und keiner davon in der Datenbank:

| Was | Wo heute |
| --- | --- |
| Welche Werte überhaupt erlaubt sind | `CHECK`-Liste in `0001_initial_schema.sql` (zweimal) und `focusEnum` in `schemas/shared.ts` |
| Welches Wiederholungsband dazugehört | `repTargetForFocus` in `engine/journey.ts` (switch) |
| Welcher Anzeigename dazugehört | `FOCUS_LABELS` in `lib/labels.ts` |
| Ob ein Wochenplan entsteht und welcher | `buildWeekPlan` in `engine/weekPlan.ts` |
| Ob der Plan die Last steuert | `WEEK_PLAN_FOCUSES` und `LOAD_PLAN_FOCUSES` in `engine/weekPlan.ts` |
| Der vorsichtige Zweig des Wiedereinstiegs | `focus === "reentry"` in `lib/coach.ts` |
| Wie stark schwere Hauptübungen empfohlen werden | `engine/suitability.ts` (eigene Liste `strength`/`power`/`test`) |
| Ob nach einer Einheit der Phasen-Anker nachgezogen wird | `hooks/useFinishSession.ts` |
| Ob Testhinweis und Wochentabelle erscheinen | `focus === "test"` in `lib/journey.ts` |

Wochenzahlen, Satzrampen, Entlastungswochen und Lastfaktoren stehen dagegen gar nirgends
als Eigenschaft des Bausteins – sie sind je Vorlagenphase von Hand in den Seed getippt
(`seed/definitions.ts`). Es gibt keinen Ort, an dem steht „eine Kraftphase dauert 3 bis 6
Wochen". Diese Grenzen existieren nur in Köpfen und in diesem Repo als Prosa.

Genau das dreht Teil 1 um.

### Stand der Daten beim Schreiben dieses Papiers

Geprüft gegen die Live-Datenbank, damit der Umbau nicht auf Annahmen steht:

- Die Werte in der Datenbank stimmen **Wert für Wert mit dem Seed überein**. Es gibt keine
  Abweichung, die man beim Umbau erst suchen müsste.
- Die laufende Journey ist „Rückkehr 2026" aus der Vorlage **Wiedereinstieg & Aufbau**
  (14 Wochen, gestartet Ende Mai, rund Woche 12).
- Die Vorlage **Wiederaufbau nach Fasten** ist derzeit **nicht in Benutzung**. Ihr Umbau
  (Abschnitt 9) rührt damit keine laufende Journey an. Auf ein Fenster „wenn gerade keine
  Journey läuft" muss nicht gewartet werden.
- Es gibt genau **eine** Journey überhaupt (die laufende) und **keine einzige** Phase mit
  einem Lastfaktor ungleich 1,0 – weder in den Vorlagen noch in der Journey. Der Ausbau
  des Lastfaktors (Abschnitt 7) nimmt damit nachweislich keinem Wert seine Wirkung.
- **Intensivierung (`power`) kommt nirgends vor** – in keiner Vorlage und in keiner Phase.
  Die neue Leiter aus Abschnitt 8 kann darum nichts verschieben.

Nachgeprüft am 22.08.2026 gegen die Live-Datenbank; alle Punkte oben bestätigt.

---

## 2. Die Entscheidung: der Katalog in der Datenbank ist die Quelle

Es entsteht eine neue Stammdaten-Tabelle **`phase_types`** (im Gespräch: „Bausteine"),
pro Nutzer geseedet wie Übungen und Vorlagen (ADR-0002). Sie beantwortet drei Fragen:

1. **Welche Bausteine gibt es** – eine Zeile je Baustein, mit Name und Beschreibung.
2. **Womit fängt eine Phase dieses Typs an** – Vorgabewerte für Wochen, Sätze, Band,
   Entlastung, Last.
3. **Was ist an ihm einstellbar und in welchen Grenzen** – und was ist fest, weil eine
   Einstellung dort wirkungslos wäre.

Sie beantwortet ausdrücklich **nicht**, wie gerechnet wird. Der Steuerweg steht als
Schlüsselwort in der Zeile, die dazugehörige Rechnung bleibt im Code.

### Quelle heißt: die Werte verschwinden aus dem Code

Das ist der Unterschied zu einer bloßen Beschreibung, und es ist die zentrale Festlegung
dieses Papiers. Eine Tabelle, die dieselben Zahlen noch einmal aufschreibt, die im Code
stehen, ist keine Quelle – sie ist eine zweite Wahrheit, die niemand prüft, weil sie
nichts tut. Sobald jemand ein Band im Code ändert und die Tabelle vergisst, laufen beide
lautlos auseinander, und zwar auf Monate.

Deshalb gilt: Was in die Tabelle wandert, geht aus dem Code **raus**.

| Wandert in die Tabelle | Was aus dem Code verschwindet |
| --- | --- |
| Wiederholungsbänder je Baustein | `repTargetForFocus` (`engine/journey.ts`) |
| Anzeigenamen der Bausteine | `FOCUS_LABELS` (`lib/labels.ts`) |
| Steuerweg je Baustein | `WEEK_PLAN_FOCUSES`, `LOAD_PLAN_FOCUSES` (`engine/weekPlan.ts`) – ersetzt durch den Bauart-Vermerk an der Phase, siehe unten |
| Wochen, Sätze, Entlastung, Last je Vorlagenphase | die getippten Zahlen in `seed/definitions.ts` |

Zwei Bemerkungen dazu, weil beides einfacher ist, als es klingt:

- **Die Wiederholungsbänder im Code sind heute schon totes Kapital.** Jede Vorlagenphase
  trägt ihr Band bereits explizit mit; die Liste im Code ist nur ein Notnagel, der nie
  gezogen wird. Sie ersatzlos zu streichen ändert an keinem einzigen Vorschlag etwas.
- **Die beiden Listen „läuft über einen Plan" fallen weg – aber nicht ersatzlos.** Ein
  früherer Entwurf dieses Papiers wollte sie streichen mit der Begründung, die Phase sage
  ohnehin selbst, ob ein Plan die Last steuert: Wochenplan gesetzt heißt Plan. Beim
  Abgleich mit dem Code hat sich das als falsch erwiesen, und der Fehler ist lehrreich –
  siehe den eigenen Abschnitt gleich unten.

Im Code bleiben muss die Zuordnung „welcher Baustein-Schlüssel wird von welcher Bauregel
bedient" – und die Bauregeln selbst. Das ist Rechnung, keine Einstellung. Wie beides
zusammengehalten wird, steht in Abschnitt 12.

### Die Phase trägt ihre Bauart mit

Hier steckt eine der beiden großen Korrekturen gegenüber dem ersten Entwurf dieses
Papiers – die andere steht in Abschnitt 7. Sie ist der Grund, warum die Phasenzeile drei
Felder mehr bekommt als geplant.

**Ein Wochenplan allein sagt nicht, was er tut.** Zwei ganz verschiedene Phasenarten
tragen heute einen: Kraft- und Intensivierungsphasen, deren Plan das Gewicht Woche für
Woche **hochfährt**, und die Testphase, deren Plan bewusst auf 60 % **entlastet** und
deren letzte Woche gar nichts plant. „Hat einen Wochenplan" trifft auf beide zu.

Zwei Stellen im Code brauchen die Unterscheidung wirklich:

- **Nach jeder beendeten Einheit** wird in einer Kraft-/Intensivierungsphase das erreichte
  Gewicht als Anker der Phase nachgezogen (`hooks/useFinishSession.ts`). In einer
  Testphase darf das nicht passieren – dort wird absichtlich leicht trainiert, und dieser
  Wert würde den Anker verderben.
- **Die Entlastungswoche der Testphase** rechnet vom Startgewicht der vorangegangenen
  Kraft-/Intensivierungsphase. Die Suche danach läuft rückwärts durch die Phasen
  (`lib/phaseContext.ts`); fragte sie nur „hat einen Wochenplan", könnte sie bei einer
  anderen Testphase landen und mit dem falschen Gewicht rechnen.

**Festlegung: Die Phase bekommt beim Anlegen die Namen ihrer Bauregeln mitgeschrieben** –
`plan_builder` und `load_builder`, Wort für Wort die Werte des Bausteins. Danach sagt jede
Phase selbst, wie sie gebaut wurde, und keine Liste von Schlüsselwörtern muss daneben
gepflegt werden.

Das ist kein Sonderfall, sondern genau die Regel dieses Abschnitts: Was die Phase zur
Laufzeit braucht, steht an der Phase – so wie der Wochenplan, das Band und die Satzrampe
auch. Der Vermerk wird einmal beim Anlegen geschrieben und danach nur noch gelesen.

Der geprüfte Gegenentwurf war, die Zuordnung „Schlüssel → Bauregel" im Code zu lassen und
daraus abzuleiten, welche Bausteine die Last hochfahren. Das hätte ebenfalls funktioniert
und ohne Eingriff in die laufende Journey ausgekommen. Verworfen, weil die Phase dann für
diese eine Frage doch wieder nicht aus sich heraus lesbar wäre – und weil der Editor in
Teil 2 die Bauart ohnehin an der Phase braucht, um beim Ändern der Wochenzahl die richtige
Liste neu zu bauen. Der Preis ist eine Nachtrag-Migration für die bestehenden Phasen
(Abschnitt 11, Schritt 2).

### Bausteine wirken beim Anlegen, nicht beim Rechnen

Der Punkt, der den Umfang klein hält:

**Die Bausteine-Tabelle wird gelesen, wenn eine Phase entsteht – nicht, wenn der Coach
rechnet.** Beim Anlegen einer Phase werden die Werte des Bausteins samt der gewählten
Anpassungen in die Phasenzeile geschrieben, genau wie heute schon der Wochenplan
(`buildWeekPlan` läuft einmal, das Ergebnis liegt als `week_plan` an der Phase). Danach
ist die Phase vollständig aus sich heraus lesbar.

Der Gegenentwurf – die Phase merkt sich nur „ich bin ein Hypertrophie-Block" und holt
alles Weitere zur Laufzeit aus der Tabelle – wurde geprüft und verworfen. Er wäre
sparsamer, hat aber zwei Nachteile, die schwerer wiegen: eine geänderte Baustein-Vorgabe
würde mitten in eine laufende Journey greifen, und der Coach bräuchte im Training einen
zusätzlichen Datenzugriff. Die App ist bewusst offlinefähig gebaut (ADR-0001).

Die Kopie hat drei Folgen, alle erwünscht:

- **Engine und Coach ändern ihre Datenquelle nicht.** Sie lesen weiter die Phasenzeile.
  Kein neuer Zugriff im Trainingsablauf, keine zweite Wahrheit zur Laufzeit.
- **Eine geänderte Baustein-Definition rührt laufende Journeys nicht an.** Wer die
  Vorgabe „Hypertrophie startet mit 5 Wochen" ändert, ändert nichts an einer Journey, die
  gerade läuft.
- **Der Steuerweg muss zur Laufzeit nicht nachgeschlagen werden.** Er steht als
  Bauart-Vermerk an der Phase selbst (siehe oben): `plan_builder` sagt, welche Wochenliste
  sie gebaut hat, `load_builder`, welche Lastliste – beide leer heißt: der Coach steuert.

In Teil 1 hat die Tabelle damit **genau einen Leser**: die Stelle, an der die Vorlagen
entstehen. Das ist wenig, aber es ist ein echter – und es ist derselbe Weg, den der
Editor in Teil 2 benutzen wird.

Damit das so bleibt, gilt für die Anzeigenamen dieselbe Regel: Der Name eines Bausteins
wird beim Anlegen in den **Phasennamen** geschrieben, statt zur Anzeigezeit aus der
Tabelle geholt zu werden. Sonst bekäme die Journey-Seite eine neue Datenabhängigkeit und
die Tabelle einen zweiten Leser im Anzeigepfad – genau das, was dieser Abschnitt vermeiden
will. Was das für die Anzeige heißt, steht in Abschnitt 10.

### Bleibt bewusst im Code

- Die Bauregeln der Wochenlisten (Kraftleiter, Intensivierungsleiter, Testphase,
  Wiederaufbau-Rampe) und die Wiederholungsleitern selbst. Ein Baustein nennt den Bauplan
  beim Namen, er beschreibt ihn nicht.
- Die Progression selbst (`engine/progression.ts`, `engine/planLoad.ts`).
- Der vorsichtige Coach-Zweig. Er ist eine Rechenregel und keine Einstellung – die
  Tabelle sagt nur, **welche** Bausteine ihn bekommen (siehe Abschnitt 5).
- Die Ankerregel der Testphase (welche Phase das Startgewicht stellt). Sie ist eine
  Beziehung zwischen Phasen, keine Eigenschaft eines Bausteins. Gesucht wird die
  vorangegangene Phase mit einer **hochfahrenden** Wochenliste – ablesbar am
  Bauart-Vermerk, nicht mehr an einer Fokus-Liste im Code.
- Die Gewichtung der Workout-Empfehlung (`engine/suitability.ts`). Sie zählt in Kraft-,
  Intensivierungs- und Testphasen jede schwere Hauptübung extra und behandelt alle übrigen
  Phasen neutral. Das ist eine Empfehlungsregel, keine Baustein-Eigenschaft – sie liest
  aber ebenfalls den Bauart-Vermerk statt einer eigenen Fokus-Liste. Der neue Wiederaufbau
  fällt damit in den neutralen Zweig; das ist gewollt, weil er keine schweren Hauptübungen
  erzwingen soll.

Damit gilt: **Ein Baustein-Schlüssel ist ein Vertrag mit dem Code.** Neue Zeilen in der
Tabelle kann sich niemand ausdenken – die Engine wüsste nicht, was sie damit tun soll.

---

## 3. Die Felder der Baustein-Zeile

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `key` | text | Schlüssel, identisch mit `phases.focus`. Der Vertrag mit dem Code. |
| `name` | text | Anzeigename („Maximalkraft") – ab jetzt **hier** und nicht mehr im Code |
| `summary` | text | ein bis zwei Sätze, was der Baustein tut – für die Auswahl in Teil 2 |
| `position` | int | Reihenfolge in der Auswahl |
| `control` | text | `coach` oder `plan` – gibt eine Wochenliste Sätze und Wiederholungen vor? |
| `plan_builder` | text, null | welche Wochenliste gebaut wird (`strength_ladder`, `power_ladder`, `test`); null bei `control = coach` |
| `load_builder` | text, null | welche Lastliste gebaut wird (`rebuild_ramp`); null = die Phase gibt kein Gewicht vor |
| `careful` | bool | vorsichtige Steigerung des Coaches (siehe Abschnitt 5) |
| `weeks_min` / `weeks_max` / `weeks_default` | int | erlaubter Bereich und Vorgabewert |
| `sets_start_default` / `sets_end_default` | int | Satzrampe von der ersten zur letzten Phasenwoche |
| `sets_max` | int | Obergrenze für die einstellbare Satzzahl |
| `sets_locked` | bool | true = die Sätze kommen aus der Wochenliste und sind nicht einstellbar |
| `rep_min_default` / `rep_max_default` | int, null | Vorgabe-Wiederholungsband; null = die Übung behält ihr eigenes |
| `rep_bound_min` / `rep_bound_max` | int, null | Korridor, in dem das Band verstellt werden darf |
| `rep_band_locked` | bool | true = das Band hat in diesem Steuerweg keine Wirkung (ADR-0018) |
| `deload_allowed` | bool | ob eine Entlastungswoche überhaupt sinnvoll ist |
| `deload_default` | int, null | Vorgabe-Entlastungswoche, wenn erlaubt; null = erlaubt, aber aus |
| `load_start_default` / `load_end_default` | numeric, null | Start- und Ziellast der Rampe; nur bei gesetztem `load_builder` |
| `placement_hint` | text, null | reiner Hinweistext („gehört an den Anfang der Journey") – ohne jede Wirkung, das System prüft die Abfolge nicht |

Zur Form: **einzelne Spalten statt einem `jsonb`-Feld.** Ein Baustein hat wenige, feste
Eigenschaften; als Spalten sind sie im SQL lesbar, per `CHECK` prüfbar und im Zod-Schema
klar. Das offene `props`-Feld wäre nur dann besser, wenn Bausteine sehr verschiedene
Eigenschaften hätten – haben sie nicht.

Die Sperren (`sets_locked`, `rep_band_locked`) sind ausdrücklich Teil der Daten und nicht
erst Sache der Oberfläche. Sie halten fest, was ADR-0018 an Wirkung festgelegt hat: In
einer Kraftphase steht das Wiederholungsband zwar in der Zeile, greift aber nicht. Wer
das nur in der Oberfläche versteckt, hat die Falle nur unsichtbar gemacht.

Bewusst **nicht** aufgenommen: ein Feld „braucht ein 1RM". Es wäre reine Beschreibung –
liegt kein 1RM vor, fällt die Rechnung von selbst auf das letzte Arbeitsgewicht zurück
(ADR-0018), ohne dass irgendetwas blockiert oder gemeldet werden müsste. Eine Spalte, die
nichts entscheidet, gehört nicht in die Quelle.

---

## 4. Die acht Bausteine mit ihren Werten

| Baustein (`key`) | Steuerweg | Wochen min/max/Vorgabe | Sätze | Wdh.-Band | Entlastung | Last | vorsichtig |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kraftausdauer (`endurance`) | coach | 3 / 8 / 4 | 2 → 4 | 12–18 | ja, Woche 3 | – | nein |
| Hypertrophie (`hypertrophy`) | coach | 3 / 8 / 5 | 2 → 6 | 8–12 | ja, Woche 4 | – | nein |
| Wiedereinstieg (`reentry`) | coach | 1 / 4 / 2 | 2 → 2 | 5–8 | nein | – | **ja** |
| Erhaltung (`maintenance`) | coach | 1 / 12 / 3 | 3 → 3 | – (Übung behält ihres) | erlaubt, Vorgabe aus | – | nein |
| Maximalkraft (`strength`) | plan (`strength_ladder`) | 3 / 6 / 5 | 4 (fest) | 4–6 (ruht) | in der Testphase | – | nein |
| Intensivierung (`power`) | plan (`power_ladder`) | 3 / 4 / 3 | 4 (fest) | 3–5 (ruht) | in der Testphase | – | nein |
| Test/Peak (`test`) | plan (`test`) | 1 / 2 / 2 | 2 (fest) | 2–4 (ruht) | steckt in der Bauregel | – | nein |
| Wiederaufbau (`rebuild`) | coach + Lastliste (`rebuild_ramp`) | 3 / 6 / 3 | 2 → 4 | 6–10 | nein | 65 % → 95 % | **ja** |

Woher die Zahlen kommen:

- **Die 3 bis 6 Wochen der Plan-Typen sind technisch gesetzt.** Darunter schneidet die
  Leiter von hinten ab – es fallen genau die schweren Wochen weg, wegen derer die Phase
  existiert. Darüber wiederholt sie nur die erste Woche.
- **Die Untergrenze der Coach-Typen folgt aus der Satzrampe.** Sie braucht drei Wochen,
  um ein Verlauf zu sein; eine Entlastungswoche lohnt erst ab vier. Wiedereinstieg und
  Erhaltung sind die Ausnahmen: Beide haben kein Ziel, das sich über Wochen aufbaut, und
  dürfen deshalb kurz sein.
- **Die Obergrenzen sind Ermessenssache** und bewusst großzügig. Sie verhindern Unsinn
  (eine 30-Wochen-Kraftphase), nicht ungewöhnliche Wünsche.
- **`maintenance` hat als einziger Baustein kein Band.** Jede Übung behält ihr eigenes,
  gebremst wird über die niedrige Satzzahl.
- **Eine Entlastungswoche darf nie die letzte Woche der Phase sein.** Sie soll die Rampe
  entlasten und danach wieder Anlauf geben; liegt sie am Ende, verpufft sie und die Phase
  hört auf einer Absenkung auf. Ein früherer Entwurf gab der Kraftausdauer bei vier Wochen
  Vorgabe die Entlastung in Woche 4 – genau dieser Fall. Korrigiert auf Woche 3;
  Hypertrophie liegt mit Woche 4 von 5 schon richtig. Diese Regel gilt auch für verstellte
  Werte und gehört deshalb in die Bau-Funktion, nicht nur in die Vorgaben (Abschnitt 5).
  **Dass die Kraftausdauer überhaupt eine Entlastungswoche bekommt, ist bestätigt**
  (22.08.2026) – zur Debatte stand nur ihre Lage, nicht ihr Dasein.
- **Kraftausdauer, Intensivierung und Erhaltung stehen heute in keiner Vorlage.** Nach
  Teil 1 sind sie als Daten vorhanden und benutzbar – das ist ein Teil des Ziels „alle
  Bausteine im System".

---

## 5. Was ist einstellbar, was ist fest

Die Leitregel: **einstellbar ist, was auch wirkt.** Wo eine Wochenliste die Sätze und
Wiederholungen vorgibt, wäre eine Einstellung ein totes Rad – der Nutzer dreht daran und
nichts passiert. Genau diese Falle hält die Tabelle in den Daten fest, statt sie in der
Oberfläche zu verstecken.

| Baustein | Wochen | Sätze | Band | Entlastung | Sonstiges |
| --- | --- | --- | --- | --- | --- |
| Kraftausdauer | 3–8 | frei, bis 6 | frei im Korridor 10–25 | frei, Vorgabe Woche 4 | – |
| Hypertrophie | 3–8 | frei, bis 8 | frei im Korridor 6–15 | frei, Vorgabe Woche 4 | – |
| Wiedereinstieg | 1–4 | frei, höchstens 3 | frei im Korridor 5–12 | gesperrt | – |
| Erhaltung | 1–12 | frei, bis 5 | frei, Vorgabe „keins" | frei, Vorgabe aus | – |
| Maximalkraft | 3–6 | gesperrt | gesperrt | gesperrt | – |
| Intensivierung | 3–4 | gesperrt | gesperrt | gesperrt | – |
| Test/Peak | 1–2 | gesperrt | gesperrt | gesperrt | – |
| Wiederaufbau | 3–6 | frei, bis 6 | frei im Korridor 5–15 | gesperrt | **Start- und Ziellast frei** |

Vier Festlegungen dahinter, die nicht selbsterklärend sind:

- **Bänder bekommen einen Korridor.** Das Band *ist* die Identität eines Coach-Bausteins.
  Ohne Grenze ließe sich eine Kraftausdauer-Phase auf 4–6 Wiederholungen stellen – das ist
  dann keine Kraftausdauer mehr, heißt aber weiter so. Der Korridor hält den Baustein bei
  dem, was sein Name verspricht. **Ausnahme Erhaltung:** Sie hat keine Vorgabe („die Übung
  behält ihres"), also auch keinen Korridor. Wird dort doch ein Band gesetzt, ist es
  ungebremst – hinnehmbar, weil die Erhaltung über die niedrige Satzzahl bremst und kein
  Versprechen im Namen trägt, das ein Band brechen könnte.
- **Erhaltung darf eine Entlastungswoche haben**, auch wenn sie im Normalfall keine
  braucht: Bei bis zu zwölf Wochen Laufzeit ist das Verbot zu streng. Vorgabe aus,
  erlaubt ja.
- **Beim Wiederaufbau sind Start- und Ziellast einstellbar.** Nach einer Fastenwoche sind
  65 % richtig, nach vier Wochen Krankheit eher weniger. Es ist der einzige Baustein, bei
  dem die Last selbst eine sinnvolle Einstellung ist – er ist genau dafür gebaut.
- **Die vorsichtige Steigerung ist eine Eigenschaft, kein fest verdrahteter Schlüssel.**
  Sie steht als `careful` in der Tabelle und gilt für Wiedereinstieg **und** Wiederaufbau.
  Bisher hängt sie allein am Wort `reentry`. Das ist der eine Punkt, an dem das bisherige
  Konzept die heutige Fasten-Journey stillschweigend verschlechtert hätte: Ihre ersten
  beiden Wochen laufen heute als Wiedereinstiegs-Phasen und steigern deshalb nur, wenn die
  letzte Einheit leicht und schmerzfrei war. Der neue Wiederaufbau-Baustein wäre kein
  Wiedereinstieg gewesen und hätte diese Vorsicht verloren. Meist fiele das nicht auf,
  weil der Lastdeckel ohnehin bremst – aber genau dann nicht, wenn für eine Übung kein
  Referenzgewicht vorliegt (etwa eine neu aufgenommene Übung). Dort greift heute die
  Vorsicht und künftig sonst gar nichts.

Was die Wochenzahl anrichtet, ist bei Plan-Bausteinen bewusst spürbar: Eine Kraftphase
über drei Wochen bekommt eine andere Leiter als eine über fünf. Das ist gewollt – die
Leiter ist die Phase. Daraus folgt allerdings, dass eine geänderte Wochenzahl die
Wochenliste **neu bauen** muss. Solange Phasen nur per Migration entstehen, passiert das
ohnehin; ab Teil 2 muss es an genau einer Stelle passieren. Deshalb entsteht die
Bau-Funktion („Phase aus Baustein plus Anpassungen") schon in Teil 1 als eine Funktion und
nicht verteilt.

Die Wochenzahl zieht dabei drei Dinge nach sich, nicht nur eins – alle drei gehören in
diese eine Funktion:

1. **Die Wochenliste** wird neu gebaut (Kraft, Intensivierung, Test).
2. **Die Lastliste** wird neu gebaut (Wiederaufbau). Die Stufen verteilen sich zwischen
   Start und Ziel und hängen damit direkt an der Wochenzahl (Abschnitt 6).
3. **Die Entlastungswoche wird gekappt**, wenn sie hinter die neue Phasenlänge fällt oder
   auf deren letzte Woche rutscht. Wird eine Hypertrophie-Phase von fünf auf drei Wochen
   gestellt, liegt die Vorgabe „Woche 4" draußen; ohne Kappen bliebe eine Entlastung
   stehen, die nie eintritt. Regel: auf die vorletzte Woche zurücknehmen, und bei Phasen
   unter drei Wochen ganz entfallen lassen.

---

## 6. Der neue Baustein: Wiederaufbau (`rebuild`)

Sieben Bausteine gibt es. Der achte ist neu und der einzige echte Zubau in Teil 1.

Die Vorlage „Wiederaufbau nach Fasten" ist heute in vier Einzelphasen zerlegt (65 / 80 /
95 / 100 %), weil eine Phase nur **einen** Lastwert tragen kann. Sie ist aber keine
Abfolge von Blöcken, sondern eine einzige Bewegung: vom gedrosselten Gewicht zurück auf
hundert Prozent. Als Baustein gedacht heißt das: **ein Block, drei Wochen, 65 % → 95 %.**

### Was er tut

- Je Phasenwoche eine Laststufe, als **Liste an der Phase** – nicht als Rechnung zur
  Laufzeit. Warum das der springende Punkt ist, steht in Abschnitt 7.
- Bezugsgröße ist das **beim Journey-Start eingefrorene Referenzgewicht**
  (`friereReferenzgewichteEin`). Ohne diesen Bezugspunkt wirkt der Anteil gar nicht, und
  zwar ohne jede Meldung.
- Unter 100 % ist der vorgegebene Wert **Ziel und Deckel zugleich**: Ein guter Tag hebt
  ihn nicht an, genau das ist der Zweck. Bei 100 % wirkt er nur noch als Untergrenze,
  damit der Coach von dort normal übernimmt. (Das ist das heutige Verhalten des
  Lastfaktors, unverändert.)
- Die Wiederholungen steuert der Coach im Band, das Gewicht nicht.
- Gesteigert wird **vorsichtig** (`careful`), wie beim Wiedereinstieg.

### Die Laststufen bei anderer Wochenzahl

Bei drei Wochen sind es 65 / 80 / 95 – die heutige Vorlage. Wird die Wochenzahl verstellt
(3 bis 6), werden die Stufen **gleichmäßig zwischen Start und Ziel verteilt** und einmal
beim Anlegen ausgerechnet:

| Wochen | Stufen |
| --- | --- |
| 3 | 65 / 80 / 95 |
| 4 | 65 / 75 / 85 / 95 |
| 5 | 65 / 72,5 / 80 / 87,5 / 95 |
| 6 | 65 / 71 / 77 / 83 / 89 / 95 |

Auf ein Raster (etwa volle 5 %) wird bewusst **nicht** gerundet: Bei fünf Wochen ergäbe
das ungleiche Schritte, und das gerechnete Gewicht wird ohnehin auf eine ladbare Stufe
gerundet. In der Anzeige werden die Prozentwerte kaufmännisch auf ganze Prozent gebracht.

### Festlegungen

- **Mindestens drei Wochen.** Zwei Wochen sind kein Verlauf, sondern ein Sprung von 65 auf
  100 %. Ab drei gibt es eine echte Zwischenstufe.
- **Zielanteil 95 %, wenn eine Testphase folgt, sonst 100 %.** Die volle Last trägt dann
  die Testwoche. Drei Wochen Aufbau plus Testwoche ist zugleich die kürzeste sinnvolle
  Rückkehr.
- **Die Testwoche gehört nicht in den Baustein.** Sie bleibt eine eigene Testphase
  dahinter, sonst stünde ihre Bauregel an zwei Stellen im System.
- **Kein Wochenplan für Sätze und Wiederholungen.** Der Wiederaufbau gibt nur die Last
  vor; Sätze und Wiederholungen bleiben beim Coach. Er ist damit der einzige gemischte
  Baustein – und das ist kein Sonderfall, sondern die saubere Trennung: Wochenliste für
  das, was feststeht, Coach für das, was reagieren soll.
- **Keine Entlastungswoche.** Der Block ist bereits die Entlastung.
- **Keine Abschlussphase auf 100 %.** Heute endet die Fasten-Vorlage mit einer Phase auf
  vollem Gewicht; ihr Zweck ist, den Coach von der Vorgabe wieder loszulassen. Die neue
  Vorlage endet bei 95 % und übergibt direkt an die Testphase, die keine Lastliste trägt –
  damit rechnet der Coach dort ohnehin wieder frei. Bewusst in Kauf genommen: Der
  Code-Zweig „zurück auf volle Last" (`ramp-restore`) und der Hinweistext „danach endet die
  Vorgabe" verlieren ihren einzigen Nutzer. Beides bleibt bestehen und funktionsfähig,
  weil eine künftige Vorlage wieder auf 100 % enden kann; totgelegt wird nichts.
- **Gehört an den Anfang der Journey.** Sonst zöge er auf ein Niveau von vor mehreren
  Wochen zurück. Das steht als `placement_hint` in den Daten und wird nicht erzwungen.

---

## 7. Die Lastliste statt der Lastrampe

Hier steckt die wichtigste Korrektur gegenüber dem ersten Entwurf dieses Papiers.

Der erste Entwurf wollte ein Feld `load_factor_end` an der Phase und eine Rechnung, die
zwischen Start- und Zielanteil über die Phasenwochen **interpoliert**. Genau dieser
Mechanismus existierte in der App schon einmal (Auslieferung vom 18.08., Issues #218/#219)
und wurde per Migration wieder ausgebaut. ADR-0018 nennt ihn beim Namen und begründet,
warum er nicht wiederkommt:

> Liste an der Phase statt Interpolation. […] Der zurückgenommene Vorläufer interpolierte
> stattdessen Prozentwerte über die Phasenwochen; jede Anzeige musste die Rechnung
> nachbauen.

Ein Konzept, das ADR-0018 als Grundlage zitiert und zugleich die dort verworfene Mechanik
wieder einführt, hebt sich selbst auf. Deshalb:

**Die Last wandert als Liste, nicht als Formel.** Die Phase trägt eine `load_plan`-Liste:
je Phasenwoche eine Zeile mit dem Anteil. Sie entsteht einmal beim Anlegen der Phase –
genau wie der Wochenplan – und wird danach nur noch gelesen.

Das löst nebenbei drei Probleme des Formel-Entwurfs, ohne dass man sie einzeln behandeln
muss: die Division durch null bei einer Ein-Wochen-Phase, das Weiterlaufen über den
Zielwert hinaus bei einer überlangen Phase, und den Zwang, dieselbe Rechnung in jeder
Anzeige noch einmal zu bauen.

### Der Lastfaktor wird dadurch ersetzt

Heute trägt jede Phase ein einzelnes Feld `load_factor` (Vorgabe 1.0). Neben einer
Lastliste wäre das eine zweite Art, dasselbe zu sagen – genau die doppelte Wahrheit, die
dieses Papier abschaffen will. Deshalb: `load_factor` **entfällt**, die Lastliste ist der
einzige Weg. Eine gleichbleibende Last ist dann eine Liste mit lauter gleichen Zeilen,
und „keine Vorgabe" ist eine leere Liste (null).

Das ist gefahrlos machbar, weil alle Phasen mit einem von 1.0 abweichenden Lastfaktor
ausschließlich in der Vorlage „Wiederaufbau nach Fasten" stehen – der Vorlage, die in
Abschnitt 9 ohnehin neu gebaut wird und die gerade nicht in Benutzung ist. Die laufende
Journey trägt durchgehend 1.0, was heute schon „keine Vorgabe" bedeutet und morgen eine
leere Liste ist. Ihr Verhalten ändert sich nicht.

---

## 8. Intensivierung bekommt eine eigene Leiter

Beim Durchgehen der Einstellungen ist aufgefallen, dass zwei Bausteine mechanisch
identisch sind: **Maximalkraft und Intensivierung nutzen heute dieselbe Bauregel**, beide
haben vier feste Sätze, bei beiden ist das Wiederholungsband gesperrt und damit
wirkungslos. Der einzige Unterschied zwischen ihnen ist ein Band, das nie zieht, und eine
andere Wochen-Obergrenze.

In der Auswahl in Teil 2 stünden damit zwei Kacheln nebeneinander, die dasselbe tun. Das
ist eine Attrappe, und Attrappen fallen erst auf, wenn jemand ihnen vertraut hat.

**Entscheidung: Intensivierung bekommt eine eigene, schwerere Leiter** (`power_ladder`).
Inhaltlich hat der Baustein seine Berechtigung – nach einer Kraftphase noch einmal
schwerer und kürzer, bevor getestet wird. Er braucht dann aber auch eine eigene Bauregel.

| Wochen | Maximalkraft (heute) | Intensivierung (neu) |
| --- | --- | --- |
| 3 | 5 / 4 / 3 | 3 / 2 / 1 |
| 4 | 5 / 4 / 3 / 2 | 3 / 3 / 2 / 1 |

Die Ziel-Anstrengung folgt derselben Regel wie bisher (RIR 2, in den schwersten Wochen
RIR 1). Ein Einzelversuch bei RIR 1 ist eine echte Peaking-Woche und bleibt klar vom
1RM-Test der Testphase unterschieden, der ohne Reserve läuft und gar keine Einheit plant.

**Bestätigt am 22.08.2026.** Die Zahlen der neuen Leiter stehen damit fest und sind kein
offener Punkt mehr.

---

## 9. Was aus den Vorlagen wird

### `journey_templates` (Kopf): unverändert

`key`, `name`, `tagline`, `for_whom`, `summary`, `position` reichen. Geprüft und
verworfen wurden zwei Ideen:

- **Ein Kennzeichen „arbeitet mit Lastvorgabe".** Überflüssig: Es ist aus den Phasen
  ablesbar, und genau so entscheidet `journeyWrite` heute schon, ob eingefroren wird.
- **Eine Gesamt-Wochenzahl.** Ergibt sich aus der Summe der Phasen. Gespeichert wäre sie
  ab der ersten Änderung falsch.

### `journey_template_phases` und `phases`

| Feld | Änderung |
| --- | --- |
| `load_factor` | **entfällt** (Abschnitt 7) |
| `load_plan` | **neu**, jsonb, nullable. Je Phasenwoche eine Zeile mit dem Lastanteil; null = keine Vorgabe |
| `plan_builder` | **neu**, text, nullable. Nach welcher Bauregel die Wochenliste entstand (`strength_ladder`, `power_ladder`, `test`); null = keine Wochenliste |
| `load_builder` | **neu**, text, nullable. Nach welcher Bauregel die Lastliste entstand (`rebuild_ramp`); null = keine Lastliste |
| `careful` | **neu**, bool, Vorgabe false. Steigert der Coach in dieser Phase vorsichtig? |

Alle vier Felder bekommen beide Tabellen, weil die Phasenzeile beim Journey-Start
unverändert mitwandert.

`careful` steht aus demselben Grund an der Phase wie die Bauart: Der Coach liest im
Training ausschließlich die Phasenzeile (Abschnitt 2). Stünde die Eigenschaft nur am
Baustein, müsste er sie zur Laufzeit nachschlagen – genau der Datenzugriff, den dieses
Papier vermeiden will. Der erste Entwurf hat das übersehen, weil er `careful` nur als
Baustein-Feld geführt hat.

Die beiden Bauart-Felder sind die Umkehrung einer Festlegung des ersten Entwurfs. Der
wollte sie ausdrücklich **nicht** an der Phase haben, weil der Steuerweg angeblich schon
ablesbar sei: Wochenplan gesetzt heiße Plan. Beim Abgleich mit dem Code hat sich das als
falsch erwiesen – Kraft- und Testphasen tragen beide einen Wochenplan und verhalten sich
gegensätzlich. Die Begründung steht in Abschnitt 2 („Die Phase trägt ihre Bauart mit").

Sie sind **keine** zweite Wahrheit neben `focus`: Der Fokus sagt, *was* die Phase ist, die
Bauart sagt, *wie* ihre Listen entstanden sind. Beides wird beim Anlegen gemeinsam
geschrieben und danach nur gelesen – wie der Wochenplan selbst.

Bewusst **kein** neues Feld:

- **Kein `phase_type_id`.** `focus` ist bereits der Schlüssel auf den Baustein. Eine
  zweite Spalte für dieselbe Aussage wäre eine Einladung zum Auseinanderlaufen.
- **Keine Kopie von `control`.** Sie wäre aus den beiden Bauart-Feldern ableitbar: beide
  leer heißt `coach`.
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
den Abgleichstest aus Abschnitt 12.

### Die Vorlage „Wiederaufbau nach Fasten"

Aus vier Phasen werden zwei: ein Wiederaufbau-Block (3 Wochen, 65 → 95 %) und eine
Testphase (1 Woche). Beide tragen ihren Baustein-Namen, heißen also „Wiederaufbau" und
„Test/Peak" – die heutigen Eigennamen „Tasten", „Reaktivieren", „Anschluss" und „Standort"
entfallen. Drei bewusste Abweichungen von heute:

1. Das Wiederholungsband ist über alle drei Wochen 6–10 statt 8–10 / 6–10 / 6–10.
2. Die Satzrampe läuft 2 → 4 statt 2 / 3 / 3–4.
3. Der Block heißt einmal „Wiederaufbau" statt dreimal „Tasten" / „Reaktivieren" /
   „Anschluss". Der Nutzer sieht damit eine Phasenkarte über drei Wochen statt drei
   Karten über je eine. Was dabei an Fortschrittsgefühl verloren geht, fängt die
   Wochentabelle auf (Abschnitt 10).

Alles drei liegt innerhalb dessen, was die Einzelphasen ohnehin taten. Die vorsichtige
Steigerung der ersten beiden Wochen bleibt erhalten (Abschnitt 5) – sie wäre sonst die
vierte, unbeabsichtigte Abweichung gewesen.

### Die Vorlage „Wiedereinstieg & Aufbau"

Sie ändert sich in ihren Werten **nicht**. Ihre vier Phasen treffen die Vorgabewerte der
Bausteine punktgenau – gegen die Live-Datenbank nachgerechnet, Wochen, Sätze, Bänder und
Entlastung stimmen Feld für Feld. Sie ist nach dem Umbau dieselbe Vorlage, nur nicht mehr
getippt, sondern aus Bausteinen zusammengesetzt. Das ist zugleich der beste verfügbare
Beweis, dass die Bausteine die heutige Welt vollständig beschreiben.

**Ein Punkt weicht doch ab, und zwar der Name der letzten Phase.** Sie heißt in der
Datenbank „Übergang / Test", der Baustein heißt „Test/Peak". Der Name ist damit das
einzige Feld, in dem Vorlage und Baustein auseinandergehen – schon heute, denn auf dem
Trainingsbildschirm steht bereits „Test/Peak", auf der Journey-Seite „Übergang / Test".
Dieselbe Phase trägt also je nach Bildschirm zwei Namen.

**Entscheidung: Die Phase heißt künftig überall „Test/Peak".** Damit fällt der Widerspruch
weg, und die Vorlage kommt für diese Phase ohne eigenen Namen aus – der Baustein-Name
greift. Umbenannt wird in Vorlage **und** laufender Journey (Abschnitt 11, Schritt 3).

Die Möglichkeit, eine Phase abweichend zu benennen, bleibt trotzdem bestehen: **Der
Baustein-Name ist die Vorgabe für den Phasennamen, nicht der Zwang.** Nach dem Umbau nutzt
sie keine der beiden Vorlagen mehr – aber eine Journey mit zwei Blöcken desselben
Bausteins bräuchte sie, und der Editor in Teil 2 ebenfalls.

---

## 10. Was Engine, Coach und Anzeige lernen müssen

| Stelle | Änderung |
| --- | --- |
| `engine/weekPlan.ts` | neue Bauregel `power_ladder`; `WEEK_PLAN_FOCUSES` und `LOAD_PLAN_FOCUSES` entfallen, die Frage „fährt der Plan die Last hoch?" beantwortet der Bauart-Vermerk der Phase |
| `engine/` (neu, klein) | Bauregel der Lastliste (`rebuild_ramp`) – reine Funktion, testbar ohne DB |
| `engine/` (neu, klein) | „Phase aus Baustein plus Anpassungen bauen" – die eine Stelle, an der eine Phase entsteht |
| `engine/journey.ts` | `repTargetForFocus` entfällt (das Band steht an der Phase) |
| `lib/labels.ts` | `FOCUS_LABELS` entfällt (der Name steht im Phasennamen) |
| `lib/journey.ts` | Testhinweis und Wochentabelle hängen am Bauart-Vermerk statt an `focus === "test"`; die Wochentabelle bekommt einen zweiten Bauweg aus der Lastliste; das berechnete, aber nirgends angezeigte Feld `focus` der Phasen-Ansicht entfällt |
| `hooks/useFinishSession.ts` | zieht den Anker nach, wenn die Phase eine **hochfahrende** Wochenliste trägt – ablesbar am Bauart-Vermerk |
| `engine/suitability.ts` | Phasen-Fit liest den Bauart-Vermerk statt einer eigenen Fokus-Liste |
| `lib/journeyReview.ts` | Rückblick zeigt bei einer Lastliste die Spanne statt einer Zahl |
| `lib/coachExport.ts` | Export gibt die Lastliste statt des einzelnen Faktors weiter |
| `hooks/useTrainingOverview.ts` | Titelzeile nimmt den Phasennamen statt des abgeleiteten Baustein-Namens |
| `lib/phaseContext.ts` | gibt statt des Lastfaktors den Wert der **laufenden Woche** aus der Lastliste weiter |
| `lib/coach.ts` | **unverändert**, bis auf: der vorsichtige Zweig hängt an `careful` statt am Wort `reentry` |
| `lib/journeyWrite.ts` | friert Referenzgewichte ein, wenn die Journey irgendwo eine Lastliste trägt |
| `lib/loadFactor.ts` | Hinweistexte nennen den Anteil der laufenden Woche; der Bezug „Stand vor der Pause" wird neutraler formuliert, weil der Baustein nicht mehr nur zur Fasten-Vorlage gehört |
| `schemas/shared.ts` | `focusEnum` um `rebuild` erweitert |
| `seed/definitions.ts` | Vorlagen entstehen aus Bausteinen statt aus getippten Zahlen |

Dass der Coach im Kern unberührt bleibt, ist kein Zufall, sondern die Probe aufs Konzept:
Die Last ist eine Vorgabe an der Phase, keine neue Regel im Coach.

### Die Anzeige

Der Satz „die bestehenden Bausteine dafür sind da" trägt nicht. Ein früherer Entwurf
zählte vier Stellen, an denen die Last als *eine Zahl pro Phase* erscheint. Nachgezählt im
Code sind es **sieben**:

1. Detailzeile jeder Phasenkarte auf der Journey-Seite (auch vergangene und künftige)
2. Hinweistext an der laufenden Phase
3. Vorlagen-Vorschau (dieselbe Detailzeile, andere Aufbereitung)
4. Periodisierungskurve
5. Hinweisband im Trainingsbildschirm
6. **Journey-Rückblick** beim Abschluss
7. **Coach-Export**

Die letzten beiden fehlten in der ersten Zählung. Beide zeigen eine abgeschlossene Phase
als eine Zahl – bei einem Block, der von 65 auf 95 wandert, wäre das schlicht falsch.

Bei einem wandernden Block ist „65 %" für eine künftige Phase ohnehin falsch – und in der
Vorlagen-Vorschau gibt es überhaupt keine laufende Woche, deren Anteil man zeigen könnte.

Festlegung:

- **Vorlagen-Vorschau, nicht laufende Phasen, Rückblick und Export** zeigen die
  **Spanne**: „65 → 95 %".
- **Die laufende Phase** zeigt den Anteil der laufenden Woche plus die **Wochentabelle**.
- **Die Periodisierungskurve** zeichnet den Wochenverlauf aus der Liste, statt einen
  konstanten Wert je Phase zu wiederholen.

**Die Wochentabelle ist mehr Arbeit als „eine Spalte mehr".** Sie entsteht heute
ausschließlich aus der Wochenliste und ist für Testphasen ausdrücklich abgeschaltet. Der
Wiederaufbau hat aber gar keine Wochenliste, nur eine Lastliste. Er braucht deshalb einen
**zweiten Bauweg** derselben Tabelle: je Phasenwoche eine Zeile mit dem Lastanteil, die
laufende Woche markiert wie gewohnt. Das ist kein großer Eingriff, aber es ist ein eigener
– und er war im ersten Entwurf nicht eingeplant.

### Der Name der Phase in der Anzeige

Beim Abgleich mit dem Code kam heraus, dass der abgeleitete Baustein-Name deutlich weniger
benutzt wird als angenommen: Auf der Journey-Seite, in der Vorlagen-Vorschau und im
Rückblick steht überall der **Phasenname**. Der abgeleitete Name wird zwar berechnet,
aber nirgends angezeigt – bis auf **eine** Stelle: die Titelzeile des Trainingsbildschirms
(„Rückkehr 2026 · Maximalkraft").

Deshalb genügt es, diese eine Stelle auf den Phasennamen umzustellen, und die Tabelle
bekommt keinen zweiten Leser im Anzeigepfad (Abschnitt 2). Weil der Baustein-Name die
Vorgabe für den Phasennamen ist (Abschnitt 9), steht dort in aller Regel dasselbe Wort wie
bisher.

**Die eine sichtbare Änderung des ganzen Umbaus** betrifft genau diese Stelle. Heute trägt
die letzte Phase der laufenden Journey zwei Namen: „Übergang / Test" auf der Journey-Seite,
„Test/Peak" auf dem Trainingsbildschirm. Nach dem Umbau steht überall derselbe Name – und
das soll **„Test/Peak"** sein (entschieden am 22.08.2026). Auf der Journey-Seite ändert
sich damit ein Wort, auf dem Trainingsbildschirm gar nichts. Umbenannt wird per Migration,
in Vorlage und laufender Journey gleichermaßen (Abschnitt 11, Schritt 3).

---

## 11. Vorgeschlagener Schritt-Zuschnitt

Acht Schritte, jeder für sich auslieferbar und testbar. Erst wenn abgestimmt ist, dass
gebaut wird, entstehen daraus ein Vorhaben-Issue und die Schritt-Issues.

1. **Bausteine-Tabelle anlegen und seeden.** Migration mit Tabelle, `CHECK`s und den acht
   Zeilen; Zod-Schema; Query-Hook. Wirkt noch nirgends – reiner Zubau.
2. **Bauart an die Phase schreiben.** Migration: `plan_builder`, `load_builder` und
   `careful` an beiden Phasen-Tabellen, **plus Nachtrag für alle bestehenden Zeilen** –
   einschließlich der laufenden Journey. Danach lesen `useFinishSession`, `phaseContext`
   und `suitability` den Vermerk statt einer Fokus-Liste. Details unten.
3. **Die Werte aus dem Code holen.** Bänder, Anzeigenamen und die beiden Steuerweg-Listen
   verschwinden; die Vorlagen entstehen im Seed aus den Bausteinen. Dazu die Migration,
   die „Übergang / Test" in Vorlage und laufender Journey auf **„Test/Peak"** umbenennt
   (Abschnitt 9). Der Abgleichstest aus Abschnitt 12 entsteht in diesem Schritt und
   beweist, dass sich sonst nichts verschiebt.
4. **Lastliste statt Lastfaktor.** Migration (`load_plan` neu, `load_factor` weg),
   Schemata, Anzeige, `focusEnum` und `CHECK` um `rebuild` erweitert. Ohne Liste verhält
   sich alles wie heute.
5. **Der Wiederaufbau-Baustein.** Bauregel der Lastliste, vorsichtige Steigerung über
   `careful`, Hinweistexte, Spanne und zweiter Bauweg der Wochentabelle in der Anzeige.
   Danach ist `rebuild` ein funktionierender Baustein.
6. **Eigene Leiter für die Intensivierung.**
7. **Vorlage „Wiederaufbau nach Fasten" umstellen.** Migration: vier Phasen werden zwei.
8. **Doku.** `Architektur.md` (neue Tabelle, neue Felder, entfallenes Feld),
   ADR-Ergänzung zu ADR-0018 um den dritten Steuerweg und die Bestätigung, dass die Last
   als Liste und nicht als Interpolation kommt, dieses Papier auf den gebauten Stand
   ziehen.

### Der Nachtrag für bestehende Phasen (Schritt 2)

Der einzige Schritt, der die laufende Journey wirklich anfasst. Er ist beherrschbar, weil
die Bauart aus dem heutigen Bestand **mechanisch ableitbar** ist – nichts muss geraten
werden:

| Bestehende Phase | `plan_builder` | `load_builder` | `careful` |
| --- | --- | --- | --- |
| `focus = strength` mit Wochenliste | `strength_ladder` | leer | nein |
| `focus = power` mit Wochenliste | `power_ladder` | leer | nein |
| `focus = test` mit Wochenliste | `test` | leer | nein |
| `focus = reentry` | leer | leer | **ja** |
| alle übrigen | leer | leer | nein |

Die Regel gilt für `phases` und `journey_template_phases` gleichermaßen, ist idempotent
und trägt für die laufende Journey genau das ein, was heute im Code steht. Danach eine
Kontrollabfrage: Jede Phase mit Wochenliste hat einen `plan_builder`, jede ohne hat keinen –
und jede `reentry`-Phase ist `careful`. Erst wenn die stimmt, geht der Code live, der den
Vermerk liest.

**Reihenfolge Migration und Deploy:** Bei Schritt 4 (Lastfaktor entfällt) zuerst deployen,
dann migrieren. Lesen ist unkritisch – die Zeilen werden beim Lesen nicht geprüft, ein
fehlender Wert fällt auf 1,0 zurück – aber alter Code, der eine Journey startet, würde in
die verschwundene Spalte schreiben wollen. Nach dem Deploy ist dieses Fenster zu.

### Zwei Nebenwirkungen, die leicht durchrutschen

- **Der gespeicherte Datenbestand im Browser.** Der Query-Cache liegt bis zu sieben Tage
  in der Browser-Datenbank. Ändert sich die Form der Phasenzeile (Schritte 2 und 4), muss
  die Cache-Marke in `lib/offline.ts` hochgezählt werden, sonst arbeitet die App nach dem
  Deploy tagelang mit alten Zeilen weiter – ohne Bauart-Vermerk und mit dem alten
  Lastfaktor. Das ist der einzige Weg, auf dem dieser Umbau die laufende Journey doch
  stören kann.
- **Sicherung und Wiederherstellung.** Die neue Tabelle muss in das Bestandsregister
  (`lib/bestandsregister.ts`), sonst fällt sie still aus Export und Wiederherstellung –
  genau der Fehler, gegen den das Register angelegt wurde; ein Test prüft Register gegen
  Schemas. Und: Eine vor Schritt 4 gezogene Sicherung lässt sich danach nicht mehr
  einspielen, weil die Zeilen ungefiltert zurückgeschrieben werden und `load_factor` dann
  keine Spalte mehr ist. Entweder der Wiederherstellungs-Pfad räumt unbekannte Felder ab,
  oder es wird bewusst gesagt: Sicherungen von vorher sind nicht mehr einspielbar.

**Zum Zeitpunkt:** Auf ein Fenster ohne laufende Journey muss nicht gewartet werden. Die
laufende Journey stammt aus der anderen Vorlage und trägt ihre Werte als Kopie; fachlich
ändert sich für sie nichts. Angefasst wird sie nur einmal, beim Nachtrag der Bauart
(Schritt 2), und dort nach einer ableitbaren Regel mit Kontrollabfrage. Abgesichert wird
das nicht terminlich, sondern durch diese Kontrolle und den Test aus Abschnitt 12.

---

## 12. Der Abgleichstest

Solange die Rechnung im Code steht und die Werte in der Datenbank, bleibt eine Naht. Die
Tabelle sagt „dieser Baustein läuft über die Bauregel *Kraftleiter*" – ob es diese
Bauregel gibt und was sie tut, weiß sie nicht. Ein Test schließt diese Naht und schlägt
fehl, sobald eine Seite vergessen wird. Er prüft bei jedem Lauf:

1. **Schlüssel:** Jeder Baustein-Schlüssel steht in allen drei Listen (`CHECK`,
   `focusEnum`, geseedete Zeilen) – keine mehr, keine weniger.
2. **Bauregeln:** Jede in der Tabelle genannte Wochenlisten- oder Lastlisten-Bauregel
   existiert im Code, und jede Bauregel im Code wird von mindestens einem Baustein
   benutzt.
3. **Stimmigkeit der Sperren:** Wer gesperrte Sätze hat, hat auch eine Wochenlisten-
   Bauregel – und umgekehrt. Wer eine Lastliste baut, hat Start- und Zielwerte.
4. **Grenzen:** Jeder Vorgabewert liegt innerhalb seiner eigenen Grenzen (die
   Vorgabe-Wochenzahl im erlaubten Bereich, das Vorgabeband im Korridor, die
   Entlastungswoche innerhalb der Phasenlänge und **nie in deren letzter Woche**).
   Geprüft wird nicht nur die Vorgabe, sondern jede erlaubte Wochenzahl des Bausteins:
   Eine Hypertrophie-Phase über drei Wochen darf keine Entlastung in Woche 4 behalten
   (Abschnitt 5).
5. **Bauart deckt sich mit der Liste:** Jede Phase mit einer Wochenliste trägt einen
   `plan_builder` und jede ohne trägt keinen; dasselbe für Lastliste und `load_builder`.
   Das ist die Naht, die der Nachtrag aus Abschnitt 11 schließt – der Test hält sie zu.
6. **Keine Verschiebung:** Die Vorlagen, die der neue Seed erzeugt, entsprechen Feld für
   Feld dem, was heute in der Datenbank steht – mit den drei in Abschnitt 9 benannten,
   gewollten Abweichungen der Fasten-Vorlage als einziger Ausnahme. Die Phasennamen zählen
   mit – nach der Umbenennung aus Schritt 3 muss die letzte Phase beider Seiten
   „Test/Peak" heißen, in der Vorlage wie in der laufenden Journey.
7. **Laufende Journey unberührt:** Die Phasen der laufenden Journey ergeben nach dem
   Umbau dieselben Vorgaben wie vorher – Band, Sätze, Wochenliste, vorsichtige Steigerung
   und Anker-Bezug der Testphase.

Punkt 6 und 7 sind die eigentliche Absicherung dieses Vorhabens: Sie machen aus „das
sollte nichts ändern" ein „das ändert nachweislich nichts".

---

## 13. Offene Punkte

Am 22.08.2026 entschieden und damit **nicht mehr offen** (Begründung jeweils am Ort):

- **Die Leiter der Intensivierung** (Abschnitt 8) – die vorgeschlagenen Zahlen gelten.
- **Die Entlastungswoche der Kraftausdauer** (Abschnitt 4) – sie bekommt eine, in Woche 3.
- **Der Name der Testphase** (Abschnitt 9) – überall „Test/Peak", per Migration auch in
  der laufenden Journey.

Weiterhin offen:

- **Sicherungen von vor dem Lastfaktor-Ausbau** (Abschnitt 11). Entweder der
  Wiederherstellungs-Pfad räumt unbekannte Felder ab, oder alte Sicherungen sind bewusst
  nicht mehr einspielbar. Zu entscheiden, bevor Schritt 4 gebaut wird.
- **Neue Vorlagen aus den Bausteinen.** Nach Teil 1 lassen sich Journeys per Migration
  zusammenstellen. Welche das sein sollen (Kraftausdauer-Block? eine reine
  Erhaltungs-Journey für ruhige Zeiten?), ist noch nicht besprochen und gehört nicht in
  dieses Papier.
- **Entlastung ohne Vorgängerphase.** Kam eine Übung in der Phase davor gar nicht vor,
  greift in der Testphase die dritte Stufe der Bezugsreihenfolge (altes 1RM). Bei
  Nebenübungen möglich, vorerst so lassen.
- **Testphase nach einem Wiederaufbau.** Ihre Entlastungswoche sucht das Startgewicht in
  einer vorangegangenen Kraft- oder Intensivierungsphase. Nach einem Wiederaufbau gibt es
  keine – dort fällt sie auf das 1RM zurück. In der neuen Fasten-Vorlage ist die Testphase
  einwöchig und hat gar keine Entlastungswoche, der Fall tritt also nicht ein; sobald
  jemand eine zweiwöchige Testphase hinter einen Wiederaufbau setzt, schon.
- **Wochenzahl im Editor ändern.** Die Bau-Funktion aus Abschnitt 5 macht es möglich; wie
  die Oberfläche damit umgeht (warnen? kommentarlos neu bauen?), gehört in Teil 2.
