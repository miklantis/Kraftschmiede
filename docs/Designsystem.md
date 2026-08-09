# Kraftschmiede V2 – Designsystem

> Doku-Typ: Referenz. Zum Nachschlagen, welche Bausteine existieren und wann man welchen nimmt.

Dieses Dokument ist der Überblick über die wiederverwendbaren Bausteine der App: welche
es gibt, wofür der jeweilige da ist und wann man welchen nimmt. Es ergänzt `Architektur.md` um die menschenlesbare Sicht auf die Oberfläche.

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

**Verbindlich:** Farbwerte stehen ausschließlich in `src/index.css`. In Feature-Komponenten
wird nur der Token-Name genutzt (Tailwind-Klasse wie `text-foreground-subtle`, in Charts
`readToken("--primary")`), nie ein Hex- oder rgba-Wert. Fehlt für einen gewünschten Ton
eine Rolle, wird hier eine neue Zeile ergänzt statt im Code eine Farbe zu setzen.

#### Flächen, Text und Linien

| Rolle | Token | Wert | Verwendung |
|---|---|---|---|
| Markengrün (Akzent) | `primary` | `#0c9d77` | Primärknopf, Fokus, Erfolg, aktive Zustände |
| Canvas | `background` | `#edeef1` | App-Hintergrund hinter den Karten |
| Karte / Panel | `card` | `#ffffff` | Flächen, auf denen Inhalt liegt |
| Primärtext | `foreground` | `#1c1c1e` | normale Schrift |
| Sekundärtext | `foreground-secondary` | `#5c5c61` | Erklärtext, versaler Markenschriftzug |
| Gedeckter Text | `muted-foreground` | `#8a8a8e` | Labels, Nebeninfos |
| Abgeschwächter Text | `foreground-subtle` | `#a0a0a5` | gesperrte/künftige Einträge, Chevrons in Zeilen |
| Schwächster Text | `foreground-faint` | `#b0b0b6` | Datum in Listenköpfen, inaktive Navigations-Symbole |
| Zier-Symbol | `icon-faint` | `#c4c4c9` | rein dekoratives Symbol (Auf-/Zuklapp-Chevron) |
| Inaktiver Marker | `marker-idle` | `#d8d8dc` | graue Füllung eines noch nicht erreichten Punkts |
| Neutrale Chart-Fläche | `chart-neutral` | `#d7dade` | Deload-Band im Periodisierungs-Chart |
| Rahmen / Linie | `border` | `#e4e4e8` | sichtbare Trennlinien, Feldrahmen |
| Feine Innenlinie | `line-soft` | `#ececef` | Rahmen ruhiger Karten, Innenlinien im Live-Panel |
| Sehr feine Trennlinie | `line-faint` | `#f6f6f8` | Zeilen innerhalb einer aufgeklappten Karte |
| Eingabefeld-Füllung | `input` | `#fafafa` | Hintergrund von Eingabefeldern |
| Hover-Fläche | `muted` / `secondary` | `#f0f0f2` | dezenter Hover, Sekundärflächen, Listen-Trennlinien |
| Sidebar-Navigation | `sidebar-muted-foreground` | `#6c685f` | warmes Grau der Einträge in der Seitenleiste |

#### Signalfarben

| Rolle | Token | Wert | Verwendung |
|---|---|---|---|
| Erfolg | `good` | `#0c9d77` | Erfolg = Akzentgrün |
| Warnung / Deload | `warning` | `#d99a2b` | Vorsicht-Hinweise, Deload |
| Abweichung | `deviation` | `#f3b13a` | Satz-Abweichung (distinkt vom Deload) |
| Danger | `danger` | `#ef5b5b` | Löschen, Fehler |
| Intensität (Teal) | `intensity` | `#37a9c4` | Intensität im Journey-Chart |
| Skill | `skill` | `#0c9d77` | Skill-Bereich (nutzt den Akzent) |
| Yoga | `yoga` | `#0c9d77` | Yoga-Bereich (nutzt den Akzent) |

#### Kategorie-Palette (`tone-*`)

Sechs gut unterscheidbare Töne für Dinge, die nur auseinandergehalten werden müssen und
kein eigenes Signal tragen – heute die Zeitraum-Typen und die Kalender-Marker. Jeder Ton
hat einen dunkleren Schrift-Ton (`…-foreground`) für die getönte Variante. Welcher Typ
welchen Ton bekommt, steht im Code (`src/lib/zeitraeume.ts`), nicht hier.

| Ton | Wert | Schrift-Ton |
|---|---|---|
| `tone-green` | `#2f9e78` | `#1f6e53` |
| `tone-blue` | `#3f7fb5` | `#2c587f` |
| `tone-grey` | `#9a9aa0` | `#5f5f66` |
| `tone-rose` | `#c25f77` | `#8a3f52` |
| `tone-amber` | `#c0803f` | `#855626` |
| `tone-purple` | `#6b5fb8` | `#4a3f82` |

#### Bewertungs-Skala (`rating-*`)

Stufenskala für Muskelkater und Readiness: „gut" ist das Markengrün, danach vier zunehmend
dunkle Blaugrau-Stufen. Zu jeder Stufe gehört eine zarte Füll-Variante (`…-tint`) für den
nicht gewählten Zustand der Bewertungsknöpfe.

| Stufe | Wert | Füll-Variante |
|---|---|---|
| `rating-good` | `#0c9d77` | `rgba(12,157,119,.12)` |
| `rating-1` | `#8a8f99` | `rgba(138,143,153,.14)` |
| `rating-2` | `#5a606b` | `rgba(90,96,107,.14)` |
| `rating-3` | `#43474f` | `rgba(67,71,79,.13)` |
| `rating-4` | `#33373f` | `rgba(51,55,63,.12)` |

### Radien

| Stufe | Wert | Verwendung |
|---|---|---|
| Karte | 16px (`rounded-card`) | Karten, Panels, Dialoge |
| Bedienelement | 11px (`rounded-control`) | Knöpfe, Eingabefelder, Chips |
| Pille | 20px (`rounded-pill`) | rein pillenförmige Elemente |

### Schatten

Karten tragen einen sehr weichen Schatten statt eines harten Rahmens. Erhöhte Elemente
(z. B. die Empfehlungskarte) bekommen zusätzlich einen leichten grünen Schimmer. Auch
Schatten sind Tokens und werden nie im Code ausgeschrieben: `shadow-card` (Karte),
`shadow-hi` (grüner Schimmer), `shadow-pop` (Popup), `shadow-auth` (freistehende
Anmelde-Karte), `shadow-nav` (mobile Navigationsleiste).

---

## Komponenten-Inventar (`src/components/ui`)

### Layout & Struktur

| Baustein | Wofür / wann nehmen |
|---|---|
| **PageHeader** | Seitenkopf oben auf jeder Feature-Seite: kleine Datumszeile plus großer Titel (am Handy rechts der Konto-Avatar). |
| **PageReveal** | Wrapper um den Seiteninhalt: fadet die Blöcke beim Seitenwechsel dezent gestaffelt ein (leicht von unten, nacheinander). Bei zwei Spalten (`data-reveal-group`) staffelt jede Spalte für sich von oben nach unten; Masonry-Container über `data-reveal-flatten` auflösen. Respektiert „Bewegung reduzieren"; Werte zentral als CSS-Variablen (`--ks-reveal-*`) in `index.css`. |
| **Section** | Abschnitt mit kleiner, gesperrter Versal-Eyebrow plus Inhalt. Auf fast jeder Seite. |
| **TwoColumn** | Zwei-Spalten-Layout: mobil gestapelt, ab 960px Haupt- und Seitenspalte nebeneinander. Markiert seine Spalten als `data-reveal-group`, damit PageReveal sie eigenständig staffelt. |
| **Card** | Weiße Grundfläche mit weichem Schatten und 16px-Radius. Trägt fast allen Inhalt. |
| **List** | Umrahmter Listen-Container mit Trennlinien zwischen den Zeilen. Die Zeile (ListRow) hat vorne einen optionalen `leading`-Platz fuer ein Symbol (dezent grau, einheitlich 20px), dahinter Titel/Untertitel, rechts ein optionales Anhaengsel und Chevron. Optional darunter eine Zusatzzeile ueber die volle Breite (`footer`, z. B. der Phasen-Balken bei Skills). |
| **SettingList** (SettingsGroup / SettingRow) | Gruppierte Listen im iOS-Einstellungen-Stil: Beschriftung links, Steuerelement rechts; Reihe optional tippbar, Label optional mit kleiner Erklärzeile (description) darunter. |
| **Accordion** (AccordionItem) | Aufklappbare Karte mit Chevron; optional ein Element (z. B. Schalter) rechts neben dem Kopf. Der Kopf kann als Funktion uebergeben werden und bekommt dann den Offen-Zustand – so lassen sich Teile ausblenden, die aufgeklappt ohnehin im Inhalt stehen. |
| **BackLink** | Einheitlicher Zurück-Link oben links auf Unterseiten, überall gleich (Grün, Chevron). |
| **Prose** | Ruhiger Erklär-/Lauftext direkt auf dem Hintergrund (ohne Karte/Rahmen): einleitender Absatz auf einer Seite, z. B. „Was ist eine Skill?" oder die Übungs-Beschreibung. |
| **Overlay** | Popup-Fundament für alle modalen Dialoge: Desktop zentriertes Fenster, Mobile Bodenblatt von unten. Darauf setzt u. a. das bereichsübergreifend genutzte „Was ist neu"-Popup `WhatsNewSheet` (Trainingsseite + Einstellungen) auf. |

### Eingabe & Bedienelemente

| Baustein | Wofür / wann nehmen |
|---|---|
| **Button** | Knopf in vier Varianten: default (grün gefüllt), outline (weiß mit Rahmen), ghost (Akzenttext), destructive (Löschen). |
| **Input** | Textfeld mit sichtbarem Rahmen und grünem Fokusring. |
| **NumberField** | Zahlenfeld mit optionalem Suffix (kg, Sek., ×/Woche); übernimmt beim Verlassen oder mit Enter, nicht bei jedem Tastendruck. |
| **Select** | Auswahlfeld aus wenigen festen Werten (natives Dropdown), passend zum Eingabefeld. |
| **Switch** | An/Aus-Schalter; Ein-Farbe je Bereich über die Tokens `primary`, `skill`, `yoga` (heute alle drei Akzentgrün). |
| **Stepper** | Zwei ±-Knöpfe mit beliebigem Wert in der Mitte; kennt selbst keine Einheit oder Grenzen. |
| **SegmentedControl** | Segment-Umschalter, genau einer aktiv – z. B. Liste/Kalender im Verlauf. |
| **ChipSwitch** | Einfachauswahl als kleine Chips, genau einer aktiv (z. B. Metrik-Umschalter). |
| **ChipEditor** | Mehrfachauswahl als Chips zum Hinzufügen und Entfernen (z. B. Scheiben, Kettlebells). |
| **RatingScale** | Bewertungs-Skala: Reihe gleichwertiger Buttons, einer aktiv; Farbe je Wert frei vorgebbar (Kater, Readiness). |
| **LoadMore** | Nachladen bei gekürzten Listen: kein Rahmen, kein Hintergrund, kein Text – nur ein dezent grauer Chevron nach unten, zentriert über die volle Breite als Tippfläche (Beschriftung nur als `aria-label`). **Verbindlich für alle Listen**, die zunächst einen Teil zeigen und nachladen können; kein eigener Outline-Button mehr. Den Zähler dahinter hält der Hook `useMehrLaden` (sichtbarer Ausschnitt, Rest-Flag, Nachladen; Seitengröße standardmäßig fünf) – zusammen genutzt in der Verlauf-Liste, im Befinden-Verlauf, bei den Messungen und den Zeiträumen. |
| **SortableList** | Vertikale Liste, deren Einträge sich per Ziehen an einem Griff umordnen lassen (Maus und Touch, ohne Zusatz-Bibliothek). Nur der Griff startet das Ziehen, die übrige Fläche bleibt bedienbar und die Seite scrollt weiter; umgeordnet wird beim Loslassen über `onReorder(from, to)`. Kennt die Inhalte nicht (Aufrufer liefert `renderItem`). Erstmals im Workout-Editor für die Übungsreihenfolge. |

### Anzeige & Visualisierung

| Baustein | Wofür / wann nehmen |
|---|---|
| **StatRow** | Statistik-Reihe: mehrere Zellen mit großem Wert und kleinem Label; ein Wert per accent hervorhebbar. |
| **ScoreBadge** | Coach-Score als Mono-Zahl; Variante row (klein, in Listen) und hero (groß, in der Empfehlungskarte). |
| **CoachStatusPill** | Kleine Pille mit der groben Coach-Lesart für die nächste Einheit einer Übung: Steigern (Akzentgrün), Halten, Senken (ruhig gedeckt, keine Alarmfarbe), dazu „Frei“ (Begleitübung) und „Start“ (keine Vordaten). In der Übungsliste (statt der Muskelzeile) und im Coach-Block der Detailseite. |
| **JourneyChip** | Kleiner Journey-Marker als weiche grüne Tönung (`bg-primary/10`) mit dem Karten-Icon der Journey (wie im Hauptmenü), nur Icon ohne Text; Label als aria-label. Auf der Trainingsseite („Weitere Workouts“) und der Workouts-Seite; die Bedeutung („in der Journey“ vs. „journey-fähig“) trägt der Seitenkontext. |
| **WorkoutIcon / YogaIcon** | Zwei eigene Trainingstyp-Symbole im Lucide-Stil (24er-Raster, currentColor): Stoppuhr für Workout/Kraft, sitzende Figur für Yoga. Für Skills dient das Lucide-Symbol „Zap“. Genutzt als `leading` in Listenzeilen (Workouts-Seite, Trainingsseite, Journey-Seite) und im Kopf der Skill-Karten (dezent grau); WorkoutIcon ist zudem das Navigations-Icon für „Workouts“. Im Verlauf (SessionLogCard) ersetzen dieselben Symbole den früheren Farbpunkt, dort in der Typfarbe (Grün bzw. Bernstein bei Satz-Abweichung). |
| **ProgressDots** | Punktreihe für Fortschritt (z. B. Einheiten der Woche): gefüllt in Akzentfarbe, Rest gedeckt. |
| **PhaseBar** | Segmentbalken für den Phasen-Stand eines Skills: ein Segment je Phase über die volle Breite, erledigte gefüllt (Skill-Farbe gedeckt), die aktuelle kräftig, künftige blass; gemeistert = alle gefüllt. Auf der Trainingsseite in der Skill-Liste (als `footer` der Listenzeile) und im Kopf der Skill-Karte, dort nur zugeklappt sichtbar (aufgeklappt unsichtbar geschaltet, damit die Kopfhoehe gleich bleibt). Bewusst andere Optik als ProgressDots, die für Wocheneinheiten stehen. |
| **Chart** | Generisches Verlaufschart-Fundament (D3): misst die Breite, wird am Handy scrollbar, zeichnet einheitlich (glatte Linie, weiche Fläche, Tooltip). |
| **Calendar** | Generisches Monatsgitter; was in einer Tageszelle steht, liefert der Aufrufer (renderCell). |
| **MuscleMap** | Einfärbbare Körper-Silhouette (SVG) zur Darstellung beanspruchter Muskeln. Konzept dazu: `Muskel-Map.md`. |

---

## Feature-Komponenten (Überblick, nicht einzeln gelistet)

Die konkreten App-Bausteine liegen nach Bereich getrennt und setzen auf den Primitives
oben auf:

- `auth` – Anmelde-/Einladungs-Screens; `AuthCard` ist der gemeinsame Karten-Rahmen (Lockup + weiße Karte), den Login- und Einladungs-Screen teilen
- `shell` – Rahmen der App (Navigation, Sidebar, Seitengerüst)
- `training` – Trainingsübersicht und Empfehlung
- `live` – Live-Session (Kraft und Skill) während des Trainings
- `journey` – Journey / Periodisierung
- `skills` – Skill-Fortschritt
- `exercise` – Übungen; darunter `ExercisePicker` (Auswähler über den Katalog, baut auf `Overlay` auf, gruppiert + Suche + Mehrfachauswahl – auch außerhalb der Workouts nutzbar)
- `workout` – Workout-Editor (`WorkoutEditor`: Name, geordnete Übungsliste mit Rolle/Reihenfolge, Live-Journey-Fähigkeit, bewusstes Speichern)
- `body` – Körper (Messwerte, Readiness, InBody)
- `history` – Verlauf
- `settings` – Einstellungen

Wächst ein Muster in diesen Ordnern zu etwas, das mehrere Bereiche brauchen, wird daraus
ein neues Primitive in `src/components/ui` – und hier eine Zeile.
