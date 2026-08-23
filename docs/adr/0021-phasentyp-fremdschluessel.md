# ADR-0021 – Der Phasentyp hängt per Fremdschlüssel an den Bausteinen

**Status:** akzeptiert
**Datum:** 2026-08-23

## Kontext

Der Typ einer Phase steht als Schlüsselwort in `phases.focus` und
`journey_template_phases.focus` – „Maximalkraft", „Hypertrophie", „Wiederaufbau" und so
weiter. Seit Migration 0043 gibt es zu jedem dieser Schlüssel eine Zeile in `phase_types`,
den Baustein: er hält Vorgabewerte und Grenzen der Phase.

Welche Schlüssel gültig sind, stand danach an drei voneinander unabhängigen Stellen: einer
`CHECK`-Liste an jeder der beiden Phasentabellen, dem Enum `focusEnum` im Code und den
geseedeten Zeilen in `phase_types`. Liefen sie auseinander, fiel das nur dem Abgleichstest
auf – und dem erst beim nächsten Testlauf. Eine Phase mit einem Typ, den es als Baustein
gar nicht gibt, war jederzeit schreibbar.

Das Konzept `docs/Konzept-Bausteine-Datenstruktur.md` (Abschnitt 9) hatte den
Fremdschlüssel seinerzeit ausdrücklich verworfen: Die Bausteine liegen pro Nutzer
(ADR-0002), er müsste also über `(user_id, key)` laufen, und das koppelt den Seed-Ablauf an
die Journey-Tabellen. Zwei der damaligen Hindernisse sind seither weggefallen –
`phase_types` trägt den nötigen eindeutigen Schlüssel über Nutzer plus Typ, und das
Bestandsregister ordnet die Bausteine beim Wiederherstellen bereits vor die Phasen ein.

## Entscheidung

**`phases.focus` und `journey_template_phases.focus` hängen per Fremdschlüssel über
`(user_id, focus)` an `phase_types (user_id, key)`** (Migration 0048). Die `CHECK`-Listen
an beiden Phasentabellen entfallen dafür: Der Fremdschlüssel trifft dieselbe Aussage
strenger, weil er nicht gegen eine getippte Liste prüft, sondern gegen die Bausteine des
Nutzers.

Bewusst **NO ACTION** statt `RESTRICT`: Beim Löschen eines Kontos räumt `auth.users` beide
Seiten per `CASCADE` ab. `NO ACTION` prüft erst am Ende der Anweisung, wenn auch die Phasen
weg sind; `RESTRICT` würde sofort prüfen und das Löschen abbrechen.

Bewusst **kein neues Feld**: `focus` bleibt, wie es heißt, und bekommt keine zweite Spalte
`phase_type_id` daneben. Der Wert steckt im Fremdschlüssel, nicht im Namen.

## Konsequenzen

- Eine Phase kann keinen Typ mehr tragen, den es als Baustein nicht gibt. Aus „wir merken
  es" wird „es kann nicht passieren".
- Ein Baustein, auf den Phasen zeigen, lässt sich nicht mehr löschen. Das ist der zweite
  Gewinn und wird wichtig, sobald Bausteine editierbar werden.
- **Der Seed legt die Bausteine jetzt vor den Journey-Vorlagen an** (`src/lib/seed.ts`).
  Genau diese Kopplung hatte das Konzept gescheut; sie kostet eine umgestellte Zeile.
- **Eine Wiederherstellung wird strenger.** Enthält eine Sicherung keine Bausteine,
  scheitert das Einspielen der Phasen, statt wie bisher durchzulaufen und Phasen ohne Typ
  zu hinterlassen. Deshalb war #330 (Wiederherstellung gegen Schema-Änderungen abhärten)
  Voraussetzung.
- **Die Liste im Code bleibt.** `focusEnum` kann der Fremdschlüssel nicht ersetzen, weil
  TypeScript ihn nicht sieht. Von drei Stellen fallen zwei weg, nicht alle drei – der
  Abgleichstest bewacht weiterhin, dass Enum und geseedete Bausteine sich decken, und
  zusätzlich, dass die `CHECK`-Liste nicht wieder aufersteht.
- Beide Phasentabellen bekommen einen Index auf `(user_id, focus)`. Ohne ihn müsste
  Postgres beim Löschen eines Bausteins beide Tabellen komplett durchsehen.

Damit revidiert dieses ADR den Abschnitt „Der Fremdschlüssel: bewusst keiner" des
Bausteine-Konzepts. Der Rest von Abschnitt 9 – kein `phase_type_id`, keine Kopie von
`control`, keine Kopien der Grenzen – gilt unverändert weiter.
