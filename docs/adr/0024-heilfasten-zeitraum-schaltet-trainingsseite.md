# ADR-0024 – Der Heilfasten-Zeitraum schaltet die Trainingsseite um

**Status:** akzeptiert
**Datum:** 2026-09-24

## Kontext

Zeiträume (Migration 0014) waren als reiner Rückschau-Kontext angelegt: ein Band im
Kalender, das die eigene Historie erklärt („hier lagen zwei Wochen Fasten"). Kalender,
Journey-Woche, Häufigkeitsziel und Coach lasen sie bewusst nicht.

Während des Heilfastens nach Buchinger wird aber nicht trainiert, höchstens Yoga und
Spaziergänge. Die Trainingsseite bot trotzdem Tag für Tag Empfehlung, weitere Workouts und
Skills an – genau das, was in dieser Zeit nicht passieren soll. Gewünscht war stattdessen
ein Begleiter, der je Fastentag erklärt, was im Körper passiert, wie man sich fühlen kann
und worauf zu achten ist (Vorhaben #503).

Zur Wahl standen ein eigener Fasten-Schalter (Einstellung oder eigene Tabelle mit Start
und Ende) und der vorhandene Kalender-Zeitraum.

## Entscheidung

**Der Zeitraum vom Typ „heilfasten" ist die einzige Quelle.** Liegt heute in einem solchen
Zeitraum (Start- und Endtag eingeschlossen, ohne Ende läuft er weiter), wird die
Trainingsseite zur Fastenseite: Journey, Testwoche, Empfehlung, weitere Workouts und Skills
fallen weg, oben steht der Fastenbegleiter, Yoga und der Verlauf bleiben. Die Rechnung
„welcher Fastentag ist heute?" steht an genau einer Stelle (`lib/fasten.ts`,
`fastenStand`). Andere Zeitraum-Typen ändern an der Trainingsseite nichts.

**Keine Sperre außerhalb der Trainingsseite.** Die Journey läuft im Hintergrund unverändert
weiter, der 1RM-Test auf der Übungsseite bleibt erreichbar. Einen „Trotzdem
trainieren"-Knopf gibt es nicht; wer doch trainieren will, verkürzt den Zeitraum.

**Die Tagestexte sind Definitionen in der Datenbank** (ADR-0002): Tabelle `fasten_tage`,
ein Text je Fastentag 1–21 und Nutzer, nachziehend über den Seed, für Bestandskonten über
Migration 0066. Läuft ein Fasten länger, bleibt der Text von Tag 21 stehen. Der
persönliche Rahmen (Tee, Wasser, eine Gemüsebrühe, bei Schwäche Honig) und die
Warnzeichen sind an jedem Tag gleich und stehen fest im Baustein, nicht in der Tabelle.

## Konsequenzen

- Kein zweiter Zustand neben dem Kalender: Fasten anlegen, verlängern oder abbrechen
  heißt, den Zeitraum zu bearbeiten.
- Die Trainingsseite wartet beim Laden zusätzlich auf die Zeiträume. Sonst blitzte die
  Empfehlung samt Start-Knopf kurz auf, bevor die Fastenseite erscheint.
- Die Aussage aus Migration 0014, Zeiträume seien reiner Rückschau-Kontext, gilt für den
  Typ „heilfasten" nicht mehr. Journey-Woche, Häufigkeitsziel und Coach lesen Zeiträume
  weiterhin nicht.
- Seed-Texte und Migration müssen denselben Wortlaut tragen; ein Test hält das fest
  (`src/seed/__tests__/fastenTage.test.ts`). Eine spätere Textänderung braucht darum
  immer beides: Seed und eine neue Migration.
- Aufbau- und Entlastungstage vor und nach dem Fasten sind bewusst nicht Teil dieser
  Entscheidung.
