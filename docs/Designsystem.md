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

Die Grau-Leiter ist bewusst kurz: **vier Textstufen, ein heller Marker-Ton, zwei
Linien-/Flächentöne.** Eine neue Zwischenstufe kommt nur dazu, wenn keine bestehende
reicht – „ein bisschen heller" ist kein Grund.

| Rolle | Token | Wert | Verwendung |
|---|---|---|---|
| Markengrün (Akzent) | `primary` | `#0c9d77` | Primärknopf, Fokus, aktive Zustände |
| Karte / Panel | `card` | `#ffffff` | Flächen, auf denen Inhalt liegt |
| Eingabefeld-Füllung | `input` | `#fafafa` | Hintergrund von Eingabefeldern |
| Gedeckte Fläche | `muted` | `#f0f0f2` | Chips, Hover, Sekundärknöpfe, feine Trennlinien in Listen |
| Canvas | `background` | `#edeef1` | App-Hintergrund hinter den Karten, Grund des Live-Panels |
| Rahmen / Linie | `border` | `#e4e4e8` | alle sichtbaren Trennlinien und Rahmen |
| Heller Marker | `marker-idle` | `#d8d8dc` | nicht erreichte Punkte, Schalter im Aus-Zustand, Griffe, neutrale Chart-Flächen |
| Abgeschwächter Text | `foreground-subtle` | `#a0a0a5` | gesperrte/künftige Einträge, Chevrons, Zier-Symbole |
| Gedeckter Text | `muted-foreground` | `#8a8a8e` | Labels, Nebeninfos |
| Sekundärtext | `foreground-secondary` | `#5c5c61` | Erklärtext, Seitenleisten-Navigation, Markenschriftzug |
| Primärtext | `foreground` | `#1c1c1e` | normale Schrift |

Zwei Sonderfälle mit eigener Rolle, bewusst außerhalb der Leiter, weil die Silhouette sich
gegen die weiße Karte behaupten muss: `body-base` (`#cfd3d8`, Körperform) und `body-idle`
(`#c2c6cb`, nicht beanspruchte Region) in der MuscleMap.

#### Signalfarben

| Rolle | Token | Wert | Verwendung |
|---|---|---|---|
| Erfolg | `good` | `#0c9d77` | Erfolgs-Zustände (heute = Akzent) |
| Warnung / Deload | `warning` | `#d99a2b` | Vorsicht-Hinweise, Deload |
| Abweichung | `deviation` | `#f3b13a` | Satz-Abweichung (distinkt vom Deload) |
| Danger | `danger` | `#ef5b5b` | Löschen, Fehler |
| Intensität (Teal) | `intensity` | `#37a9c4` | Intensität im Journey-Chart |
| Skill | `skill` | `#0c9d77` | Skill-Bereich (heute = Akzent) |
| Yoga | `yoga` | `#0c9d77` | Yoga-Bereich (heute = Akzent) |

#### Timer-Flächen

Zwei Rollen nur für die dunklen Timer-Ansichten des Live-Trainings (große Timer-Ansicht
der Dauer-Übungen; die Pausenleiste trägt denselben Ton noch als eigenen Wert):

| Rolle | Token | Wert | Verwendung |
|---|---|---|---|
| Timer-Fläche | `timer-surface` | `#1c1c1e` | dunkle Karte der großen Timer-Ansicht |
| Schrift darauf | `timer-surface-foreground` | `#ffffff` | Typografie auf der Timer-Fläche |
| Helles Grün | `primary-soft` | `#4fd3a8` | Extra-Runden über der Zielzeit, abgesetzt vom `primary`-Ring |

`good`, `skill` und `yoga` tragen denselben Wert wie `primary`, bleiben aber eigene Token:
Sie sind eigene Rollen, und ein Bereich soll später wieder eine eigene Farbe bekommen
können, ohne dass man dafür durch die ganze App muss.

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

### Bewegung

Alles, was kommt und geht, bewegt sich gleich: **300 ms** mit der Kurve
`cubic-bezier(.22, 1, .36, 1)` – zentral als `--ks-motion-dur` und `--ks-motion-ease` in
`index.css`. Das Muster ist immer dasselbe: von unten herein, beim Schließen wieder nach
unten weg, dazu ein leichtes Auf- und Abblenden; liegt eine Verdunkelung dahinter, blendet
sie in derselben Zeit mit. So laufen Popups (`Overlay`), die Pausen-Leiste und die große
Timer-Ansicht der Dauer-Übungen.

Technisch steckt das Verhalten im Hook `useEnterExit` (`src/hooks/useEnterExit.ts`): er hält
das Element bis zum Ende der Ausfahrt im DOM und erzwingt vor dem Einfahren einen Reflow –
ohne den springen Elemente auf iOS Safari ohne Bewegung an ihr Ziel. Neue ein- und
ausfahrende Elemente nutzen diesen Hook, statt eigene Zeiten zu erfinden.

**Stolperfalle:** Wer den Übergang selbst auf einzelne Eigenschaften begrenzt
(`transition-[…]`), muss `translate` nennen. Tailwind verschiebt Elemente über diese
eigene CSS-Eigenschaft und nicht über `transform` – steht dort nur `transform`, springt
das Element an seinen Platz und lediglich die Deckkraft blendet.

„Bewegung reduzieren" wird respektiert: Elemente mit der Marker-Klasse `ks-motion` und die
Pausen-Leiste erscheinen dann ohne Fahrt, Inhalt und Bedienung bleiben unverändert.

**Nichts Unbenutztes.** Die Liste enthält nur Token, die tatsächlich irgendwo greifen. Was
die shadcn-Grundausstattung sonst noch mitbringt (Popover-, Sidebar- und Accent-Farben),
ist entfernt; die Seitenleiste nutzt `card`, `border` und `muted` mit. Wer ein neues Token
anlegt, prüft vorher, ob eine bestehende Rolle passt.

**Tailwind durchsucht nur `src/`.** Sonst erzeugt es Utilities für Klassennamen, die in der
Doku nur als Beispiel im Text stehen – samt Farben, die es in der App gar nicht mehr gibt.

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
| **List** | Umrahmter Listen-Container mit Trennlinien zwischen den Zeilen. Die Zeile (ListRow) hat vorne einen optionalen `leading`-Platz fuer ein Symbol (dezent grau, einheitlich 20px), dahinter Titel/Untertitel, rechts ein optionales Anhaengsel und Chevron. Optional darunter eine Zusatzzeile ueber die volle Breite (`footer`, z. B. der Phasen-Balken bei Skills). Der Titel nimmt auch zusammengesetzte Inhalte (z. B. `SkillTitle`). |
| **SkillTitle** | Titelzeile eines Skill-Blocks: Skill-Name, direkt daneben klein und grau der Name der aktuellen Phase. Gemeinsam genutzt von der Skill-Liste auf der Trainingsseite (als `title` der Listenzeile) und vom Kopf der Skill-Karte, damit beide gleich aussehen. Darunter steht nur noch der Phasen-Balken – die Skill-Darstellung bleibt so bewusst zweizeilig; „Phase X / Y" und Zusatzhinweise stehen nicht mehr dort. |
| **SettingList** (SettingsGroup / SettingRow) | Gruppierte Listen im iOS-Einstellungen-Stil: Beschriftung links, Steuerelement rechts; Reihe optional tippbar, Label optional mit kleiner Erklärzeile (description) darunter. |
| **Accordion** (AccordionItem) | Aufklappbare Karte mit Chevron; optional ein Element (z. B. Schalter) rechts neben dem Kopf. Der Kopf kann als Funktion uebergeben werden und bekommt dann den Offen-Zustand – so lassen sich Teile ausblenden, die aufgeklappt ohnehin im Inhalt stehen. |
| **BackLink** | Einheitlicher Zurück-Link oben links auf Unterseiten, überall gleich (Grün, Chevron). |
| **Prose** | Ruhiger Erklär-/Lauftext direkt auf dem Hintergrund (ohne Karte/Rahmen): einleitender Absatz auf einer Seite, z. B. „Was ist eine Skill?" oder die Übungs-Beschreibung. |
| **Overlay** | Popup-Fundament für alle modalen Dialoge: Desktop zentriertes Fenster, Mobile Bodenblatt von unten. Darauf setzt u. a. das bereichsübergreifend genutzte „Was ist neu"-Popup `WhatsNewSheet` (Trainingsseite + Einstellungen) auf. |
| **TypeToConfirm** | Bestätigungs-Dialog für Handgriffe, die nicht aus Versehen passieren dürfen (auf `Overlay` aufgesetzt): Titel, Erklärung, ein abzutippendes Wort, Knopftext und Aktion kommen vom Aufrufer. Der Bestätigen-Knopf bleibt gesperrt, bis das Wort zeichengenau getippt ist (Groß-/Kleinschreibung und Umlaute inklusive, ohne Trimmen – Vergleich in `lib/typedConfirm`). Der ganze Dialog ist nicht markierbar, nur das Tippfeld selbst, damit Kopieren-Einfügen die Hürde nicht aushebelt; das Feld schaltet Autokorrektur, Auto-Großschreibung und Rechtschreibprüfung ab. Abbrechen/Schließen setzt es zurück. Ein `blockedReason` hält den Knopf gesperrt und steht als Hinweis im Dialog, ein `error` bleibt im offenen Dialog stehen. **Verbindlich für alle unwiderruflichen Handgriffe** dieser Art; erstmals beim Journey-Wechsel. |

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
| **NoteBlock** | Einzelne Freitext-Notiz in drei Zuständen: ohne Notiz nur ein schlanker Textknopf „+ Notiz", beim Schreiben ein mehrzeiliges Feld mit grünem Rahmen (Speichern / Abbrechen / Papierkorb), gespeichert reiner Text im ruhigen Block mit Stift zum Bearbeiten. Leer speichern = Notiz entfernen. **Verbindlich für alle Freitext-Notizen** (Übung, Einheit, 1RM-Test); der Slot `actions` nimmt eine bestehende Fußzeile auf, damit der Knopf rechts daneben sitzt und das Feld darunter aufklappt. `bare` lässt beide Flächen weg (Feld nur im grünen Rahmen, fertige Notiz als reiner Text) – für Notizen, die direkt auf dem Hintergrund liegen statt in einer Karte, wie die Workout-Notiz im Live-Panel. |
| **SortableList** | Vertikale Liste, deren Einträge sich per Ziehen an einem Griff umordnen lassen (Maus und Touch, ohne Zusatz-Bibliothek). Nur der Griff startet das Ziehen, die übrige Fläche bleibt bedienbar und die Seite scrollt weiter; umgeordnet wird beim Loslassen über `onReorder(from, to)`. Kennt die Inhalte nicht (Aufrufer liefert `renderItem`). Erstmals im Workout-Editor für die Übungsreihenfolge. |

**Regel für alle Tippfelder (`input`, `textarea`):** auf Mobile mindestens 16px Schrift, kleinere Werte erst ab `min-[960px]`. iOS Safari zoomt sonst beim Antippen automatisch in das Feld hinein, und der Nutzer muss von Hand wieder herauszoomen.

### Anzeige & Visualisierung

| Baustein | Wofür / wann nehmen |
|---|---|
| **StatRow** | Statistik-Reihe: mehrere Zellen mit großem Wert und kleinem Label; ein Wert per accent hervorhebbar. |
| **ScoreBadge** | Coach-Score als Mono-Zahl; Variante row (klein, in Listen) und hero (groß, in der Empfehlungskarte). |
| **ScoreDot** | Score 1–5 als Zahl in einem runden, gedeckten Feld; Größe md (Score-Skala in den Einstellungen) und sm (in Listen, z. B. die aufgeklappten Sätze im Übungs-Verlauf). Bedeutung des Werts steckt als Titel/aria-label drin und kommt aus der Engine (SCORE_MAP). |
| **CoachStatusPill** | Kleine Pille mit der groben Coach-Lesart für die nächste Einheit einer Übung: Steigern (Akzentgrün), Halten, Senken (ruhig gedeckt, keine Alarmfarbe), dazu „Frei“ (Begleitübung) und „Start“ (keine Vordaten). In der Übungsliste (statt der Muskelzeile) und im Coach-Block der Detailseite. |
| **CoachStatusDot** | Dieselbe Coach-Lesart wie die Pille, aber als reines rundes Symbol ohne Text (Pfeil hoch / Strich / Pfeil runter), damit es neben eine Überschrift passt. Gleiche Farbzuordnung wie `CoachStatusPill` – Akzentgrün nur beim Steigern, Senken ruhig gedeckt. Am Übungsblock der laufenden Einheit, ab dem ersten abgehakten Arbeitssatz; Antippen klappt darunter den konkreten Vorschlag auf. `provisional` dämpft das Zeichen, solange eine der angezeigten Zeilen noch wandern kann – in der Kraftphase ist das nur der Ausblick auf die nächste Woche, die Wochenvorgabe selbst steht fest (`previewProvisional`). Klartext-Bezeichnung über `coachStateLabel`, gehört als aria-label an das umgebende Bedienelement. |
| **JourneyChip** | Kleiner Journey-Marker als weiche grüne Tönung (`bg-primary/10`) mit dem Karten-Icon der Journey (wie im Hauptmenü), nur Icon ohne Text; Label als aria-label. Auf der Trainingsseite („Weitere Workouts“) und der Workouts-Seite; die Bedeutung („in der Journey“ vs. „journey-fähig“) trägt der Seitenkontext. |
| **WorkoutIcon / YogaIcon** | Zwei eigene Trainingstyp-Symbole im Lucide-Stil (24er-Raster, currentColor): Stoppuhr für Workout/Kraft, sitzende Figur für Yoga. Für Skills dient das Lucide-Symbol „Zap“. Genutzt als `leading` in Listenzeilen (Workouts-Seite, Trainingsseite, Journey-Seite) und im Kopf der Skill-Karten (dezent grau); WorkoutIcon ist zudem das Navigations-Icon für „Workouts“. Im Verlauf (SessionLogCard) ersetzen dieselben Symbole den früheren Farbpunkt, dort in der Typfarbe (Grün bzw. Bernstein bei Satz-Abweichung). |
| **ProgressDots** | Punktreihe für Fortschritt (z. B. Einheiten der Woche): gefüllt in Akzentfarbe, Rest gedeckt. |
| **ProgressRing** | Runder Fortschrittsring als SVG: ruhender Spurkreis, darüber der Fortschritt von oben im Uhrzeigersinn. Kennt nur einen Füllgrad von 0 bis 1, Größe und Strichstärke; Farben kommen als Klassen von außen (`stroke-*`), Inhalt in der Mitte als `children`. Heute in der großen Timer-Ansicht der Dauer-Übungen – dort bekommt der Füllgrad einen eigenen Takt Bild für Bild, damit der Ring durchgehend läuft und nicht in Sekundenschritten springt. |
| **PhaseBar** | Segmentbalken für den Phasen-Stand eines Skills: ein Segment je Phase über die volle Breite, erledigte gefüllt (Skill-Farbe gedeckt), die aktuelle kräftig, künftige blass; gemeistert = alle gefüllt. Zweite und letzte Zeile eines Skill-Blocks (ueber `SkillTitle`): auf der Trainingsseite in der Skill-Liste (als `footer` der Listenzeile) und im Kopf der Skill-Karte, dort nur zugeklappt sichtbar (aufgeklappt unsichtbar geschaltet, damit die Kopfhoehe gleich bleibt). Bewusst andere Optik als ProgressDots, die für Wocheneinheiten stehen. |
| **Chart** | Generisches Verlaufschart-Fundament (D3): misst die Breite, wird am Handy scrollbar, zeichnet einheitlich (glatte Linie, weiche Fläche, Tooltip). |
| **Calendar** | Generisches Monatsgitter; was in einer Tageszelle steht, liefert der Aufrufer (renderCell). |
| **MuscleMap** | Einfärbbare Körper-Silhouette (SVG) zur Darstellung beanspruchter Muskeln. Konzept dazu: `Muskel-Map.md`. |

---

## Feature-Komponenten (Überblick, nicht einzeln gelistet)

Die konkreten App-Bausteine liegen nach Bereich getrennt und setzen auf den Primitives
oben auf:

- `auth` – Anmelde-/Einladungs-Screens; `AuthCard` ist der gemeinsame Karten-Rahmen (Lockup + weiße Karte), den Login- und Einladungs-Screen teilen
- `shell` – Rahmen der App (Navigation, Sidebar, Seitengerüst)
- `training` – Trainingsübersicht und Empfehlung; darunter `TestWeekPanel` (Hinweis auf die laufende Testwoche samt Frist und Liste der Hauptübungen mit direktem 1RM-Test-Start)
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
