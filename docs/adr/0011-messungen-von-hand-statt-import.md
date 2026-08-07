# ADR-0011 – Koerpermessungen von Hand pflegen statt JSON-Import

**Status:** akzeptiert
**Datum:** 2026-08

## Kontext

Koerpermessungen kamen ausschliesslich ueber einen JSON-Import in die App
(Import-Karte auf der Koerper-Seite plus die Rolle des `inbody-extractor`-Skills,
der Geraete-Screenshots in ein JSON wandelte). Das war im Alltag umstaendlich.

Schwerwiegender: Der Import lief pro Datum als Upsert ueber `user_id,date` und
ersetzte damit den kompletten Tageseintrag – auch mit leeren Feldern.
Teilmessungen sind aber normal (ein BIA-/InBody-Geraet misst nicht jeden Wert
jedes Mal neu). Dadurch konnten bereits erfasste Werte eines Messtags
ungewollt verloren gehen.

## Entscheidung

Der JSON-Import entfaellt vollstaendig. Messungen werden direkt in der
Mess-Liste von Hand gepflegt: Hinzufuegen, Bearbeiten und Loeschen je Eintrag
ueber ein gemeinsames Popup (`BodyMeasureDialog` auf dem Overlay-Baustein),
Schreibzugriffe gebuendelt in `useCompositionActions` (add/update/remove).

Das Ueberschreib-Verhalten ist bewusst festgelegt: Bearbeiten befuellt den
Dialog mit den Ist-Werten; was im Feld steht, wird gespeichert, ein leer
geraeumtes Feld entfernt den Wert bewusst (null). Kein Blind-Overwrite eines
ganzen Tages mehr – der Nutzer sieht immer den echten Ist-Stand und aendert
gezielt. Es gilt weiterhin ein Eintrag pro Tag (`unique(user_id, date)`); ein
bereits belegtes Datum wird beim Anlegen nicht still ueberschrieben, sondern
im Dialog angezeigt.

Entfernt: `BodyImportCard`, `useImportComposition` und der Import-Zweig in
`composition.ts` (`normalizeCompositionRows`, `parseCompositionText`,
`COMPOSITION_EXAMPLE`). Die Import-Rolle des `inbody-extractor`-Skills entfaellt
damit; die Skill-Doku und die reine Geraete-Bezeichnung InBody/BIA (composition
als InBody-/BIA-Zeitreihe) bleiben unberuehrt.

## Konsequenzen

- Kein ungewollter Datenverlust je Messtag mehr; volle Kontrolle ueber jeden
  einzelnen Wert.
- Der Weg ueber einen Screenshot-Extractor-Skill entfaellt; Werte werden
  direkt eingetippt.
- Zwei Messungen am selben Tag bleiben bewusst ausgeklammert (waere eine
  Schema-Aenderung an `unique(user_id, date)`) und sind ein eigenes Vorhaben,
  falls je gebraucht.
