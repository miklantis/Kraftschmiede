# ADR-0014 – Journey-Abschluss an der Einheit, freies Training ohne Vorgabe

**Status:** teilweise ersetzt durch [ADR-0017](./0017-journey-abschluss-ueber-den-kalender.md)
**Datum:** 2026-08-08

> Der Abschluss an der Einheit gilt nicht mehr – die Journey ist durchlaufen, wenn alle
> geplanten Wochen erfüllt und vorbei sind (ADR-0017). „Ohne Journey gibt der Coach nichts
> vor" gilt unverändert weiter.

## Kontext

Eine Journey lief bisher unbemerkt aus: Das Signal „durchlaufen“ der Platzierung
(`phasePlacement.done`) wurde nirgends ausgewertet, die Journey blieb aktiv, und der Coach
rechnete dauerhaft mit dem Kontext der letzten Phase weiter. Der journeylose Zustand war
nur vor der ersten Journey erreichbar; der Coach arbeitete dort mit Standardannahmen
(drei Arbeitssätze, übungseigenes Repband, normale Doppelprogression) und hätte also auch
ohne Ziel weiter Gewichte hochgeschlagen.

## Entscheidung

**Abschluss hängt an einer konkreten Einheit, nicht am Kalender.** Beim Beenden einer
Krafteinheit prüft `completesJourney` (Engine, rein): Liegt die Einheit in der letzten
geplanten Journey-Woche oder darüber hinaus, und erfüllt sie das Wochen-Pensum? Dann ist
die Journey durchlaufen. Das `>=` fängt zugleich Journeys ab, die längst überfällig sind –
sie schließen mit der nächsten erfüllten Woche statt hängen zu bleiben.

**Archivieren im selben Schreibvorgang.** Die Archivierung (`active=false`,
`status='archived'`, `end_date`) hängt als letzter Schritt in `writeFinishStrength`. Damit
folgt sie einer offline pausierten Einheit: die Journey wird erst archiviert, wenn die
auslösende Einheit tatsächlich geschrieben ist.

**Enddatum als eigenes Feld** (Migration 0019) statt Rekonstruktion aus der letzten
Einheit. Auch der Journey-Wechsel setzt es und korrigiert dabei den bisher stehen
gebliebenen Status der abgelösten Journey.

**Ohne Journey gibt der Coach nichts vor.** Kein Steigern, Senken oder aktives Halten. Jede
Übung bekommt die Werte der letzten Einheit als reine Vorbelegung – technisch dieselbe
Übernahme, die Begleitübungen schon nutzen (`carrySuggestion` → `freeCarry`, Entscheidung
`carry`). Die Satzzahl kommt aus der letzten Einheit statt aus der Phasen-Rampe.

## Konsequenzen

- Die auslösende Einheit gehört noch zur Journey; eine weitere Einheit in derselben Woche
  läuft bereits im freien Training. Das ist gewollt.
- Der Übungs-Status zeigt ohne Journey „frei anpassbar“ statt hoch/halten/senken – dieselbe
  Coach-Naht wie der Live-Aufbau, keine zweite Rechnung.
- Das Arbeitsgewicht wird auch im freien Training fortgeschrieben: es ist eine Aufzeichnung
  des Getanen, keine Empfehlung.
- Die Abschluss-Meldung ist flüchtig (geräte-lokaler Mini-Store, wie die Live-Session), da
  sie zum Moment des Abschlusses gehört. Der Zustand selbst bleibt sichtbar: Journey-Streifen
  und Journey-Seite benennen das freie Training.
