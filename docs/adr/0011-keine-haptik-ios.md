# ADR-0011 – Keine Haptik in der Web-App auf aktuellen iPhones

**Status:** akzeptiert
**Datum:** 2026-06-26

## Kontext

Geplant war taktiles Tipp-Feedback (Vibration) beim Bedienen der App. Auf Android steht
`navigator.vibrate` zur Verfügung. Auf iOS kennt Safari diese API nicht; der einzige
Web-Weg war ein Trick mit einem versteckten Schalter
(`<input type="checkbox" switch>` + `label.click()`). Apple hat diesen Trick in iOS 26.5
geschlossen.

## Entscheidung

Keine Haptik aus der Web-App auf aktuellen iPhones. Das in einer Zwischenversion
eingeführte taktile Feedback wurde wieder vollständig ausgebaut, weil ein toter Schalter
in den Einstellungen irreführend wäre.

## Konsequenzen

- Auf Android bleibt die Vibration über den bestehenden Vibrations-Schalter erhalten
  (z. B. Satz-Haken).
- Auf iOS gibt es kein Vibrations-Feedback; das ist eine Plattformgrenze, kein App-Fehler.
- Bevor Haptik erneut versucht wird, muss geprüft werden, ob Apple einen offiziellen
  Web-Weg geschaffen hat. Sonst ist der Aufwand verloren.
