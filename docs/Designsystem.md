# Kraftschmiede V2 – Designsystem

Dieses Dokument ist der Überblick über die wiederverwendbaren Bausteine der App: welche
es gibt, wofür der jeweilige da ist und wann man welchen nimmt. Es ergänzt den
`Masterplan-V2.md` (Architektur) um die menschenlesbare Sicht auf die Oberfläche.

Es ersetzt keinen Code – es ist die Inhaltsangabe dazu. Wer ein neues Feature baut (Mensch
oder KI), sieht hier auf einen Blick, was schon existiert, statt es ein zweites Mal zu
erfinden. Das ist das Kernziel: einmal bauen, überall nutzen.

**Pflegeregel:** Dieses Dokument muss zur Wirklichkeit passen, sonst führt es in die Irre.
Darum gilt – kommt eine neue wiederverwendbare Komponente in `src/components/ui` dazu oder
ändert sich ihre Aufgabe grundlegend, wird hier im selben Schritt eine Zeile ergänzt oder
angepasst. Schlank halten: ein Satz pro Baustein genügt.

---

## Begriffe

- **Primitive** – ein kleiner, domänenfreier Baustein in `src/components/ui`. Er kennt das
  Training nicht (ein Schalter weiß nicht, dass er einen Skill an- und ausschaltet). Er
  wird überall in der App wiederverwendet. Das ist das Designsystem im engeren Sinn.
- **Feature-Komponente** – ein Baustein, der eine konkrete Aufgabe der App erfüllt (z. B.
  die Empfehlungskarte des Coaches) und dabei aus Primitives zusammengesetzt ist. Liegt in
  einem eigenen Ordner je Bereich (`live`, `journey`, `settings`, …), nicht hier gelistet.

---

## Design-Tokens

Die festen Gestaltungswerte – einmal definiert in `src/index.css`, überall genutzt. So
sieht alles aus einem Guss aus, und eine Farbänderung greift an einer Stelle.

### Farben

| Rolle | Wert | Verwendung |
|---|---|---|
| Markengrün (Akzent) | `#0c9d77` | Primärknopf, Fokus, Erfolg, aktive Zustände |
| Canvas | `#edeef1` | App-Hintergrund hinter den Karten |
| Karte / Panel | `#ffffff` | Flächen, auf denen Inhalt liegt |
| Primärtext | `#1c1c1e` | normale Schrift |
| Gedeckter Text | `#8a8a8e` | Labels, Nebeninfos |
| Rahmen / Linie | `#e4e4e8` | Trennlinien, Feldrahmen |
| Eingabefeld-Füllung | `#fafafa` | Hintergrund von Eingabefeldern |
| Hover-Fläche | `#f0f0f2` | dezenter Hover, Sekundärflächen |
| Warnung / Deload | `#d99a2b` | Vorsicht-Hinweise, Deload |
| Abweichung | `#f3b13a` | Satz-Abweichung (distinkt vom Deload) |
| Danger | `#ef5b5b` | Löschen, Fehler |
| Intensität (Teal) | `#37a9c4` | Intensität im Journey-Chart |
| Skill (Blau) | `#5b9bd6` | Skill-Bereich |
| Yoga (Lila) | `#8478c9` | Yoga-Bereich |

### Radien

| Stufe | Wert | Verwendung |
|---|---|---|
| Karte | 16px (`rounded-card`) | Karten, Panels, Dialoge |
| Bedienelement | 11px (`rounded-control`) | Knöpfe, Eingabefelder, Chips |
| Pille | 20px (`rounded-pill`) | rein pillenförmige Elemente |

### Schatten

Karten tragen einen sehr weichen Schatten statt eines harten Rahmens. Erhöhte Elemente
(z. B. die Empfehlungskarte) bekommen zusätzlich einen leichten grünen Schimmer.

---

## Komponenten-Inventar (`src/components/ui`)

### Layout & Struktur

| Baustein | Wofür / wann nehmen |
|---|---|
| **PageHeader** | Seitenkopf oben auf jeder Feature-Seite: kleine Datumszeile plus großer Titel (am Handy rechts der Konto-Avatar). |
| **Section** | Abschnitt mit kleiner, gesperrter Versal-Eyebrow plus Inhalt. Auf fast jeder Seite. |
| **TwoColumn** | Zwei-Spalten-Layout: mobil gestapelt, ab 960px Haupt- und Seitenspalte nebeneinander. |
| **Card** | Weiße Grundfläche mit weichem Schatten und 16px-Radius. Trägt fast allen Inhalt. |
| **List** | Umrahmter Listen-Container mit Trennlinien zwischen den Zeilen. |
| **SettingList** (SettingsGroup / SettingRow) | Gruppierte Listen im iOS-Einstellungen-Stil: Beschriftung links, Steuerelement rechts; Reihe optional tippbar. |
| **Accordion** (AccordionItem) | Aufklappbare Karte mit Chevron; optional ein Element (z. B. Schalter) rechts neben dem Kopf. |
| **BackLink** | Einheitlicher Zurück-Link oben links auf Unterseiten, überall gleich (Grün, Chevron). |
| **Overlay** | Popup-Fundament für alle modalen Dialoge: Desktop zentriertes Fenster, Mobile Bodenblatt von unten. Darauf setzt u. a. das bereichsübergreifend genutzte „Was ist neu"-Popup `WhatsNewSheet` (Trainingsseite + Einstellungen) auf. |

### Eingabe & Bedienelemente

| Baustein | Wofür / wann nehmen |
|---|---|
| **Button** | Knopf in vier Varianten: default (grün gefüllt), outline (weiß mit Rahmen), ghost (Akzenttext), destructive (Löschen). |
| **Input** | Textfeld mit sichtbarem Rahmen und grünem Fokusring. |
| **NumberField** | Zahlenfeld mit optionalem Suffix (kg, Sek., ×/Woche); übernimmt beim Verlassen oder mit Enter, nicht bei jedem Tastendruck. |
| **Select** | Auswahlfeld aus wenigen festen Werten (natives Dropdown), passend zum Eingabefeld. |
| **Switch** | An/Aus-Schalter; Ein-Farbe je Bereich (Skill blau, Journey grün, Yoga lila). |
| **Stepper** | Zwei ±-Knöpfe mit beliebigem Wert in der Mitte; kennt selbst keine Einheit oder Grenzen. |
| **SegmentedControl** | Segment-Umschalter, genau einer aktiv – z. B. Liste/Kalender im Verlauf. |
| **ChipSwitch** | Einfachauswahl als kleine Chips, genau einer aktiv (z. B. Metrik-Umschalter). |
| **ChipEditor** | Mehrfachauswahl als Chips zum Hinzufügen und Entfernen (z. B. Scheiben, Kettlebells). |
| **RatingScale** | Bewertungs-Skala: Reihe gleichwertiger Buttons, einer aktiv; Farbe je Wert frei vorgebbar (Kater, Readiness). |

### Anzeige & Visualisierung

| Baustein | Wofür / wann nehmen |
|---|---|
| **StatRow** | Statistik-Reihe: mehrere Zellen mit großem Wert und kleinem Label; ein Wert per accent hervorhebbar. |
| **ScoreBadge** | Coach-Score als Mono-Zahl; Variante row (klein, in Listen) und hero (groß, in der Empfehlungskarte). |
| **ProgressDots** | Punktreihe für Fortschritt (z. B. Einheiten der Woche): gefüllt in Akzentfarbe, Rest gedeckt. |
| **Chart** | Generisches Verlaufschart-Fundament (D3): misst die Breite, wird am Handy scrollbar, zeichnet einheitlich (glatte Linie, weiche Fläche, Tooltip). |
| **Calendar** | Generisches Monatsgitter; was in einer Tageszelle steht, liefert der Aufrufer (renderCell). |
| **MuscleMap** | Einfärbbare Körper-Silhouette (SVG) zur Darstellung beanspruchter Muskeln. Konzept dazu: `Muskel-Map.md`. |

---

## Feature-Komponenten (Überblick, nicht einzeln gelistet)

Die konkreten App-Bausteine liegen nach Bereich getrennt und setzen auf den Primitives
oben auf:

- `shell` – Rahmen der App (Navigation, Sidebar, Seitengerüst)
- `training` – Trainingsübersicht und Empfehlung
- `live` – Live-Session (Kraft und Skill) während des Trainings
- `journey` – Journey / Periodisierung
- `skills` – Skill-Fortschritt
- `exercise` – Übungen
- `body` – Körper (Messwerte, Readiness, InBody)
- `history` – Verlauf
- `settings` – Einstellungen

Wächst ein Muster in diesen Ordnern zu etwas, das mehrere Bereiche brauchen, wird daraus
ein neues Primitive in `src/components/ui` – und hier eine Zeile.
