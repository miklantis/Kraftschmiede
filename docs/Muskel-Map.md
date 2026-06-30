# Muskel-Map – Umsetzungsdokument

> Doku-Typ: Erklärung/Konzept. Zum Verstehen, wie die Muscle-Map gedacht ist und schrittweise entsteht.

Status: Arbeitsdokument, schrittweise. Lade dieses Dokument zusammen mit der
Master-SVG (`Body_muscles.svg`) hoch, wenn wir mit einer Phase starten.

---

## 1. Ziel

Eine wiederverwendbare Körper-/Muskel-Darstellung in Kraftschmiede, die pro
Region eine Belastung/Intensität farblich anzeigt. Erster Einsatzort: Übungs-
Detailseite (welche Muskeln werden wie stark bearbeitet). Später dieselbe Komponente
für Muskelkater/Erholung auf der Körper-Seite – dann mit anderer Farbskala und
gröberen Gruppen.

Leitgedanke: ein generisches Element bauen, das die Farbgebung nicht fest verdrahtet,
sondern als Parameter bekommt. So lässt es sich überall einsetzen (Übung = Grün-Rampe,
Muskelkater = z. B. Grau-zu-Dunkel), ohne die Komponente jedes Mal anzufassen.

---

## 2. Aktueller Stand der Master-SVG

Eine SVG, `viewBox="0 0 1338.2 1473"`, enthält beide Figuren nebeneinander:
linke Figur = Rücken (`<g id="back">`), rechte Figur = Front (`<g id="front">`).
Jede Figur hat eine graue Silhouette (`silhouette_back` / `silhouette_front`) plus
die einfärbbaren Muskelregionen.

### 2.1 Region-Inventar (15 Regionen: 8 Back, 7 Front)

| id | DE | EN | Ansicht | Grobe Gruppe | aktuelle Farbe |
|---|---|---|---|---|---|
| `schultern_hinten` | Schultern hinten (hintere Deltas) | Rear Delts | back | schultern | `#f800ff` |
| `trapez` | Trapez / oberer Rücken | Trapezius | back | ruecken | `#00bdff` |
| `ruecken_mitte` | Mittlerer Rücken | Mid Back | back | ruecken | `#ffff00` |
| `latissimus` | Latissimus | Lats | back | ruecken | `#7f017f` |
| `trizeps` | Trizeps | Triceps | back | arme | `#ffd645` |
| `gesaess` | Gesäß | Glutes | back | gesaess | `#02c911` |
| `beinbeuger` | Beinbeuger (hintere Oberschenkel) | Hamstrings | back | beine | `#0068ff` |
| `waden` | Waden | Calves | back | beine | `#737f01` |
| `schultern_vorne` | Schultern vorne (vordere Deltas) | Front Delts | front | schultern | `#00bdff` |
| `nacken` | Nacken (Trapez oben) | Upper Traps | front | schultern | `#00bdff` |
| `bizeps` | Bizeps | Biceps | front | arme | `red` |
| `brust` | Brust | Chest | front | brust | `#20ff00` |
| `bauch` | Bauch (gerade Bauchmuskeln) | Abs | front | core | `#0183cb` |
| `bauch_seitlich` | Seitliche Bauchmuskeln | Obliques | front | core | `#8b9e04` |
| `quadrizeps` | Quadrizeps (vordere Oberschenkel) | Quads | front | beine | `#8c02a0` |

Die aktuellen Farben sind nur Legende/Erkennung. Im Betrieb färbt die Komponente
die Regionen selbst ein.

### 2.2 Wichtige Befunde

1. **Illustrator strippt Zusatz-Attribute.** Beim Re-Export gehen `class="muscle"`,
   `data-muscle`, `data-region`, `data-view` verloren – nur die `id`s überleben.
   Konsequenz für die Architektur: Die SVG darf sich auf nichts außer den `id`s verlassen.
   Alle Metadaten (Labels, Gruppenzuordnung, Sprachen, Farb-Mapping) leben in Code/DB,
   nicht in der SVG. Das ist robust: Du kannst die Master-SVG jederzeit neu aus Illustrator
   exportieren, solange die `id`s gleich bleiben – nichts bricht.

2. **Symmetrisch, keine Links/Rechts-Trennung.** Jede Region ist ein Element für beide
   Körperhälften. Für vorerst genau richtig; eine Aufteilung kommt erst bei echtem Bedarf
   (einseitige Belastung), siehe Phase 4.

(Der frühere offene Punkt „vorderer Delta fehlt" ist erledigt – `schultern_vorne` ist
in der aktuellen Version vorhanden und korrekt platziert.)

---

## 3. Architekturentscheidungen (Leitplanken)

- **SVG = nur Form + id.** Keine Logik, keine Farben aus der SVG übernehmen.
  Quelle der Wahrheit für Bedeutung/Labels/Farbe ist die Registry (Code/DB).
- **Neues Modul `js/muscles.js`.** Enthält die Region-Registry, die groben Gruppen,
  reine Aggregations-Helfer und die Render-Komponente (`KS.MuscleMap`). Hängt sich wie
  die anderen Module an `window.KS`. `engine.js` bleibt unberührt.
- **Generische Komponente.** Eingabe ist eine Werte-Map `{ regionId: wert }` plus eine
  Farbfunktion `colorFn(wert) -> Farbe` und eine Basisfarbe. Die Komponente weiß nichts
  von „grün" oder „Muskelkater" – das kommt von außen.
- **Single-Master + viewBox-Crop.** Eine SVG im Repo (`images/body-muscles.svg`). Die
  Komponente blendet je nach Gerät die ganze SVG (Desktop, beide Ansichten nebeneinander)
  oder einen zugeschnittenen Ausschnitt ein (Mobile, eine Ansicht + Umschalter). Responsive
  über `isDeskView()` (min-width 960px). Kein doppeltes SVG-File, keine Sync-Probleme.
- **Farben konkret in JS berechnen.** SVG-`fill`-Attribute lösen `var(--accent)` nicht
  auf. Die Rampe wird in JS aus konkreten Hex-Werten gebildet; den App-Akzent holst du
  per `ksVar('--accent')` (`getComputedStyle`) und mischst ihn programmatisch. Default-
  Grün = `--accent`.
- **CSS-Prefix `.mm-`** (muscle map), kollisionsfrei, neue Sektion in `klar-app.css`
  (`/* === MUSCLE MAP === */`). Desktop-Layout der bestehenden Screens unangetastet.
- **Migration non-destruktiv** über `migrate()` in `data.js`, guard-geflaggt, idempotent.

---

## 4. Datenmodell

### 4.1 Region-Registry (`MUSCLES` in `data.js`)

Eine Konstante analog zu `SKILLS`. Pro Region:

```js
{
  id: "brust",
  view: "front",                       // front | back
  group: "brust",                      // grobe Gruppe (siehe 4.2)
  labels: { de: "Brust", en: "Chest" } // beide Sprachen von Anfang an gepflegt
}
```

Die SVG bleibt sprachneutral; die App zeigt je nach Einstellung `labels.de` oder
`labels.en`. Start: DE als Anzeige, EN wird mitgepflegt. Erweiterbar um weitere Sprachen
ohne SVG-Änderung.

### 4.2 Grobe Gruppen und Sektionen

Für Aggregation und das spätere Muskelkater-Shading („wenn ich Unterkörper sage,
werden bestimmte Regionen dunkel"):

- **Gruppe** (`group`, pro Region eine): `schultern`, `ruecken`, `arme`, `brust`,
  `core`, `gesaess`, `beine`.
- **Sektion** (abgeleitet, optional, gröbste Ebene): z. B.
  `Oberkörper` = schultern + ruecken + arme + brust + core,
  `Unterkörper` = gesaess + beine,
  `Arme` = arme.

Die Komponente nimmt Werte auf jeder Ebene entgegen: ein Wert auf Gruppen- oder
Sektionsebene wird automatisch auf die zugehörigen Regionen verteilt. So kann man
„Unterkörper = stark beansprucht" sagen, ohne jede Region einzeln zu setzen.

### 4.3 Übung → Muskel-Beteiligung (kategorisch)

Erfasst wird **kategorisch** – leichter pflegbar als Zahlen. Drei Stufen:

- `primaer` – Hauptmuskel der Übung
- `sekundaer` – deutlich mitbeteiligt
- `stabilisierend` – stützend/leicht

Intern mappt ein einziger Ort die Kategorien auf Zahlen (`0..1`), an einer Stelle
justierbar:

```js
const MUSCLE_LOAD = { primaer: 1.0, sekundaer: 0.55, stabilisierend: 0.25 };
```

Speicherung an der Übung als Map `regionId -> Kategorie`:

```js
// Beispiel: Bankdrücken
muscles: { brust: "primaer", trizeps: "sekundaer", schultern_vorne: "sekundaer" }
```

Die Detailseite liest dieses Feld, wandelt über `MUSCLE_LOAD` in Werte um und füttert
die Komponente. Wird das Mapping später feiner gebraucht, ändert sich nur `MUSCLE_LOAD`,
nicht die Daten.

### 4.4 Migration

`migrate()` ergänzt fehlende `muscles`-Felder non-destruktiv (Default `{}`), setzt
ein Guard-Flag, ändert keine bestehenden Werte und keine Übungs-`id`s. Alte Stände
laufen unverändert weiter; Übungen ohne Mapping zeigen nur die graue Silhouette.

---

## 5. Die Komponente (`KS.MuscleMap`)

### 5.1 Schnittstelle (Entwurf)

```js
KS.MuscleMap.render(container, {
  values: { brust: 1.0, trizeps: 0.55 },   // region- ODER gruppen-/sektionsbasiert
  base:   "#e6e8ea",                        // Silhouette + nicht beanspruchte Regionen
  colorFn: (v) => greenRamp(v),             // 0..1 -> Farbe (injiziert)
  view:   "auto",                           // auto | front | back | both
  toggle: true                              // Mobile: Umschalter Front/Back
});
```

- `view: "auto"` entscheidet per `isDeskView()`: Desktop → `both` (nebeneinander),
  Mobile → eine Ansicht + Umschalter.
- `colorFn` ist austauschbar: Übung = Grün-Rampe ab `--accent`, Muskelkater später
  = z. B. Hellgrau→Dunkel. Die Komponente bleibt gleich.
- Die SVG wird inline ins DOM gelegt (nicht als `<img>`), damit `fill` pro Region und
  `getBBox` zugänglich sind.

### 5.2 Crop-Werte (Ausgangswerte, in aktueller Version bestätigt)

- Back: `viewBox="181 108 386 1257"`
- Front: `viewBox="771 112 379 1268"`
- Both: `viewBox="0 0 1338.2 1473"`

Empfehlung: zur Laufzeit `getBBox()` auf `#front`/`#back` lesen (pixelgenau, überlebt
SVG-Änderungen). Die obigen Werte als Fallback/Startpunkt (etwas Rand zugeben).

### 5.3 Farbverhalten Übungsseite

- Silhouette und nicht beanspruchte Regionen: hellgrau (zurückhaltend).
- Beanspruchte Regionen: Grün-Rampe – je stärker die Beteiligung, desto kräftiger grün
  (Default-Grün = `--accent`). Rampe in JS aus konkreten Hex-Werten.

---

## 6. Phasenplan

### Phase 0 – SVG ablegen (klein)
- Master-SVG als `images/body-muscles.svg` ins Repo legen.
- id-Liste ist bestätigt (15 Regionen), offene SVG-Punkte sind geklärt.
- Kein Code-Feature, nur Vorbereitung.
- DoD: SVG liegt im Repo, id-Liste passt zur Registry.

### Phase 1 – Registry & Datenmodell (keine UI)
- `MUSCLES`-Registry (DE+EN) + grobe Gruppen + Sektionen in `data.js`.
- `MUSCLE_LOAD`-Mapping und `muscles`-Feld (kategorisch) an Übungen ergänzen.
- `migrate()` erweitern (non-destruktiv, guard, idempotent).
- Reine Helfer in `js/muscles.js`: Kategorie→Wert, Gruppen/Sektionen auf Regionen
  expandieren, Aggregation.
- Betroffen: `js/data.js`, neues `js/muscles.js`, Seed der Übungen.
- Validierung: `node --check`, Engine-Tests grün (unberührt), Migration an Alt-Stand testen.
- DoD: DB kennt alle Regionen/Gruppen; jede Übung hat ein (ggf. leeres) `muscles`-Feld;
  Helfer liefern korrekte aggregierte Werte.

### Phase 2 – Komponente bauen & Übungs-Detailseite
- `KS.MuscleMap` in `js/muscles.js` implementieren (Inline-SVG, Modi, Toggle, Färbung).
- CSS-Sektion `.mm-` in `klar-app.css` (Layout Desktop nebeneinander / Mobile eine
  Ansicht + Umschalter; Breakpoint über `isDeskView()`/960px).
- In Übungs-Detailseite einbinden (Rendering in `js/app.js`), gefüttert aus
  `exercise.muscles` über die Helfer aus Phase 1; Grün-Rampe + hellgraue Basis.
- Betroffen: `js/muscles.js`, `js/app.js`, `klar-app.css`. `engine.js` unberührt.
- Validierung: `node --check`, CSS-Klammerbalance, Test auf GitHub Pages (Mobile/Desktop).
- DoD: Auf der Übungsseite ist die Map sichtbar, zeigt korrekt beanspruchte Muskeln,
  schaltet mobil zwischen Front/Back um, Desktop zeigt beide.

### Phase 3 – Körper-/Muskelkater-Seite
- Dieselbe Komponente, andere `colorFn` (z. B. Hellgrau→Dunkel) und Gruppen-/Sektions-
  Eingabe (z. B. „Unterkörper" dunkel).
- Muskelkater/Erholung berechnen: aus letzten Sessions je Region einen Erschöpfungs-/
  Erholungswert ableiten (kann die vorhandene Erholungsfenster-Logik nutzen).
- Betroffen: `js/muscles.js` (nur neue `colorFn`-Nutzung), Körper-Seite in `js/app.js`,
  ggf. Aggregation der Session-Daten.
- DoD: Körper-Seite zeigt aktuelle Beanspruchung/Erholung über dieselbe Map.

### Phase 4 (optional, später)
- Weitere Einsatzorte (Workout-Vorschau, Wochenübersicht), Links/Rechts-Trennung,
  Tooltips/Tap auf Region für Detailinfos.

---

## 7. Getroffene Entscheidungen

1. **Vorderer Delta:** in der SVG ergänzt (`schultern_vorne`, front) – erledigt.
2. **Gewichtsschema:** kategorisch (`primaer` / `sekundaer` / `stabilisierend`), intern
   über `MUSCLE_LOAD` auf Zahlen gemappt.
3. **SVG-Ablage:** eine Datei `images/body-muscles.svg`, inline ins DOM eingesetzt.
4. **Sprache:** DE als Anzeige, EN von Anfang an mitgepflegt.
5. **Links/Rechts:** vorerst symmetrisch (eine Region beidseitig).
6. **Übungs-Mapping befüllen:** schrittweise und pragmatisch – zuerst die gängigen/aktiven
   Übungen, der Rest folgt nach. Übungen ohne Mapping zeigen nur die graue Silhouette
   (kein Fehler).

Verbleibende Feinjustierung (kein Blocker, in Phase 1 final): die konkreten Zahlenwerte
in `MUSCLE_LOAD` (Start `1.0 / 0.55 / 0.25`).

---

## 8. Bewusst nicht Teil dieser Umsetzung

- Keine Änderung an `engine.js` für die reine Darstellung.
- Kein Umbau des Desktop-Layouts bestehender Screens.
- Keine Links/Rechts-Trennung in Phase 1–3.
- Keine SVG-Animationen.

---

## 9. V2-Umsetzung (so gebaut)

Stand der React/TypeScript-Umsetzung in Kraftschmiede V2. Ersetzt die V1-Mechanik
aus den Abschnitten 3-6 (window.KS, js/muscles.js, klar-app.css, isDeskView);
Ziele und Datenmodell (Abschnitte 1-4, 7) gelten unverändert.

### Dateien

- **Master-SVG** `src/assets/body-muscles.svg` – per `?raw` als String gebuendelt
  (offline-fest, kein Fetch wie in V1). 14 Regionen (8 Rueckseite, 6 Vorderseite);
  `nacken` aus der frueheren Tabelle ist nicht Teil der V2-Registry. Keine internen
  id-Referenzen, darum mehrfach einbettbar.
- **Registry** `src/lib/muscles.ts` – portiert aus V1 (`MUSCLES`, `MUSCLE_SECTIONS`,
  `MUSCLE_LOAD`), reine Logik mit Unit-Tests: `expand`, `muscleValuesFromRows`,
  `kategorieToValue`, `regionsForGroup/Section`.
- **Komponente** `src/components/ui/muscle-map.tsx` – generisches UI-Primitive.
- **Daten-Hook** `src/hooks/useExerciseMuscles.ts` – laedt die Tabelle
  `exercise_muscles` (alle Zeilen des Nutzers), Filter je Übung im View-Hook.

### Komponenten-Vertrag

Reine Darstellung, kennt keine Domäne und keine feste Farbe.

| Prop      | Bedeutung                                                            |
| --------- | -------------------------------------------------------------------- |
| `values`  | Region-, Gruppen- oder Sektions-Keys -> Intensitaet 0..1 (via `expand`). |
| `view`    | `"both"` (Standard), `"front"` oder `"back"`. Kein Umschalter.       |
| `colorFn` | `(v) => Farbe` für beanspruchte Regionen. Standard: Rampe weiß -> `--primary`. |
| `base`    | Silhouetten-Farbe (Standard hellgrau).                               |
| `idle`    | Farbe nicht beanspruchter Regionen (Standard etwas dunkler).         |

Leere Werte-Map -> nur die graue Silhouette (kein Fehler).

### Abweichung von V1

- **Kein Mobile-Umschalter.** V2 zeigt immer beide Figuren nebeneinander (`both`),
  Handy wie Desktop – das entspricht dem tatsaechlichen V1-Verhalten (V1 rief die
  Detailseite ebenfalls mit `view: "both"` auf; der Toggle aus dem Entwurf wurde nie
  genutzt).
- **Einbetten statt Fetch.** Die SVG kommt als gebuendelter String ins DOM
  (`dangerouslySetInnerHTML`), die Färbung läuft in einem Effekt (Inline-`fill` auf
  Element + alle `<path>`, ueberschreibt die Illustrator-Klassenfarben, greift durch
  die Silhouetten-Gruppen auf die Koerper-Teile durch).

### Einfaerb-Mechanik und Zuschnitt

Wie in Abschnitt 5.2/5.3 beschrieben: Silhouette = `base`, beanspruchte Region =
`colorFn(v)`, Rest = `idle`. Crop-viewBoxes (eng um die Figuren, aus V1):
`back 181 108 386 1257`, `front 771 112 379 1268`, `both 165 92 1000 1304`.

### Wiederverwendung Koerper-Seite (Phase 9)

Dieselbe Komponente mit anderer `colorFn` (und ggf. `idle`) für Muskelkater-Shading;
die Werte-Map kommt dann aus dem Erholungs-/Belastungszustand statt aus
`exercise_muscles`. Kein Neubau nötig – das ist der Grund für den injizierbaren
`colorFn`-Vertrag.
