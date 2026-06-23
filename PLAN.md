# Kraftschmiede V2 – Plan & Fortschritt

Diese Datei ist die verbindliche Schritt-Liste fuer den Neubau von Kraftschmiede als
React/TypeScript-Web-App. Sie ist die Quelle der Wahrheit fuer den Projektstand.

**Zu Sitzungsbeginn immer zuerst diese Datei lesen**, den Abschnitt „Aktueller Stand"
pruefen und erst dann weiterarbeiten. Nach jedem umgesetzten Schritt die passenden
Kaestchen abhaken und „Aktueller Stand" aktualisieren – im selben Commit wie die
Aenderung oder als eigener kleiner Commit.

Konvention: `- [ ]` offen, `- [x]` erledigt. Modus pro Feature-Block: **erst Konzept
gemeinsam besprechen, dann bauen, dann auf der Live-Seite testen.**

Referenz-App (nur lesen, niemals aendern): https://github.com/miklantis/Kraftschmiede

---

## Aktueller Stand

- **Naechste Sitzung (Einstieg):** **Phase 9 (Koerper) als Ganzes live abnehmen.** Beide
  Haelften stehen jetzt (Befinden + Messung); Messung bereits live getestet/freigegeben. Nach
  Gegencheck der MuscleMap-Korrektur (siehe unten) Haken "Live getestet" setzen und zu Phase 10
  (Einstellungen) uebergehen – dort beginnt es wieder mit Konzeptabstimmung.
- **Live-Korrektur Muskelkater-Figur (2026-06-23):** Ohne heutigen Kater-Eintrag blitzte kurz
  die rohe, bunte Illustrator-SVG auf und blieb sichtbar, solange kein Werte-Update einen
  zweiten Einfaerbe-Lauf ausloeste (der Effekt faerbt erst nach dem ersten Zeichnen). Fix im
  gemeinsamen MuscleMap-Primitive: die bunten Klassenfarben (.st0..st14) werden beim Einbetten
  EINMALIG auf den Silhouetten-Grauton neutralisiert, sodass nie etwas Buntes aufblitzt; die
  echten Farben setzt weiterhin der Effekt. Betrifft auch die Uebungs-Detailseite (dort
  derselbe, nur kuerzere Flash) – reine Verbesserung, kein Funktionswechsel. tsc/build/231
  Tests gruen.
- **Phase 9 Lieferung 2 (Koerpermessung) gebaut (2026-06-23), live testbar.** Rechte
  Spalte der Koerper-Seite: Mess-Karte mit Metrik-Umschalter (Gewicht/Fett/Muskel/Wasser/
  Phasenwinkel) und Verlaufslinie je Metrik (D3-Fundament aus Phase 5/8, gruene Kurve mit
  Flaeche + Mono-Wertlabel am letzten Punkt, V1-Look); darunter die Read-only-Mess-Liste
  (Datum + Chips) und die aufklappbare JSON-Import-Karte (ueber das Accordion-Primitive;
  InBody-Skill-Format oder Array, Upsert je Datum, Beispiel-Knopf). Reine Logik in
  lib/composition.ts (Mess-Serien, Chips, JSON-Normalisierung camelCase/snake -> DB-Spalten,
  Zusatzfelder wie id/heightCm verworfen; getestet). Hooks useComposition (lesen),
  useImportComposition (parsen + Upsert). Neue Komponenten body/BodyMetricChart,
  BodyMeasureCard, BodyMeasureList, BodyImportCard. Die Seite ist jetzt zweispaltig (links
  Befinden, rechts Messung; mobil ein Stapel). tsc/build/231 Tests gruen (10 neue composition).
- **Phase 9 Lieferung 1 (Befinden) gebaut (2026-06-23), live testbar.** Koerper-Seite zeigt
  jetzt das taegliche Befinden statt des Platzhalters: oben das Empfehlungs-Banner (Ampel
  gruen/amber/neutral aus dem heutigen Zustand), die Muskelkater-Figur (generische MuscleMap
  aus Phase 8, nur mit Kater-Farbskala + Verfall -1/Tag), die Eingabe-Karte (Beine/Oberkoerper/
  Gesamt-Kater 0-3, Readiness 1-5, Schmerz-Schalter, Notiz, Eintragen/Aktualisieren = genau ein
  Eintrag pro Tag) und der Verlauf der letzten Eintraege. Neu und wiederverwendbar: das
  generische RatingScale-Primitive (components/ui/rating-scale.tsx, farbige Auswahl-Buttonreihe,
  domaenenfrei - Farbe je Wert kommt ueber colorFor herein; aktuell 4 Bewertungen, spaeter mehr).
  Reine Logik: restAdvice in engine/recovery.ts (V1-Ampel, getestet) und lib/body.ts (Kater-
  Skala, Verfall, Region-Aggregation, Verlauf-Chips, getestet). Hooks useBodyLog (lesen),
  useUpsertBodyToday (Tages-Upsert), View-Hook useBodyView. Vorerst einspaltig (breiten-
  begrenzt); das Zwei-Spalten-Raster kommt mit der Messung. tsc/build/221 Tests gruen
  (15 neue: 9 body + 6 recovery).
- **Phase 8 abgeschlossen und live freigegeben (2026-06-23).** Gesamte Uebungs-Phase
  abgenommen: Liste, Detailseite (Statistik/Verlauf/Diagramm mit Metrik-Umschalter),
  MuscleMap, "Uebung anpassen", Anheften und Skill-Verlauf-Anbindung. Alle Haken gesetzt.
- **Skill-Uebungsverlauf-Anbindung gebaut (2026-06-23), live testbar.** Skill-Saetze (z. B.
  Dead Hang, Negative/Strict Pull-Up) wurden ohne Katalogbezug abgelegt (exercise_id null)
  und fehlten daher im Uebungsverlauf. Sie werden jetzt – 1:1 wie V1 (app.js exerciseHistory)
  – ueber die Skill-Definition der Katalog-Uebung zugeordnet: skill_id (DB-UUID) -> Definitions-
  Schluessel (useSkills) -> Skill-Definition (Code-Seed) -> Phase + Position der Uebung ->
  exerciseKey/target/metric; stimmt exerciseKey mit dem key der geoeffneten Katalog-Uebung
  ueberein, gehoeren die Saetze dazu. Sichtbar auf der Detailseite: im Trainingsverlauf eigene
  Zeilen je Skill-Einheit (Werte als Chips "x Wdh"/"x s", rechts "Ziel X"); in Statistik
  (Sessions-Zahl) und Diagramm zaehlen die Werte passend zum Typ mit (Wdh/Volumen bzw.
  Haltezeit); kein Gewicht/1RM/Score fuer Skill-Eintraege; roter Abweichungspunkt, wenn mind.
  ein Satz das Ziel verfehlt hat (met=false); nur abgehakte Saetze zaehlen. Umgesetzt:
  buildExerciseHistory um exerciseKey + reinen Resolver (SkillExResolve) erweitert, ExHistoryEntry
  um skill/metric/target; useSessionsDetailed holt zusaetzlich skill_phase + set.met; HistorySet/
  HistorySessionInput additiv um met/skillPhase ergaenzt; useExerciseDetail baut den Resolver aus
  useSkills + skillSeeds und macht die Verlaufszeile skill-faehig. Kraft-/1RM-Logik, Diagramm-
  Fundament und Anheften unberuehrt. tsc/build/206 Tests gruen (5 neue Skill-Tests).
- **Schritt 6 (Anheften/Dashboard) live getestet und freigegeben (2026-06-23).** Detailseite:
  im Kopf der Verlaufs-Chartkarte der Umschalter
  "Anheften"/"Angeheftet" (kleine Pille rechts neben dem Metrik-Titel), bezogen auf die
  gerade gewaehlte Metrik - dieselbe Uebung kann mit mehreren Metriken angeheftet sein
  (z. B. 1RM und Volumen). /uebungen: ganz oben die Sektion "Angeheftet" mit den
  angehefteten Charts als flache Kacheln (Titel "Übung · Metrik", Diagramm 150 Desktop / 120
  Handy), Desktop zweispaltiges Raster, Handy Liste; leer -> Hinweistext. Kein Sortieren/
  Entfernen in der Sektion (V1-Paritaet) - verwaltet wird ueber den Umschalter. Speicherung
  geraete-lokal (localStorage ks_pins_v1), NICHT in DB/Export/Sync. Neu: lib/pinnedCharts.ts
  (reine Helfer hasPin/togglePin/parsePins + Typen, 6 Tests), Store-Hook usePinnedCharts
  (useSyncExternalStore ueber localStorage, teilt den Stand zwischen Detailseite und Liste,
  Cross-Tab ueber storage-Event), View-Hook usePinnedView (Pins -> fertige Kacheln),
  Komponente exercise/PinnedCharts, Breakpoint-Hook useIsDesktop (960px), EX_METRIC_SHORT in
  exerciseHistory, height-Prop an ExerciseChart. tsc/build/201 Tests gruen.
- **Schritt 5 ("Uebung anpassen") live getestet und freigegeben (2026-06-23).** Auf der
  Uebungs-Detailseite gibt es unten den Knopf "Uebung anpassen" (Stift) -
  Desktop unten in der rechten Spalte, mobil ganz am Ende (order-5, nach dem Verlauf), wie
  V1. Er oeffnet ein Popup ueber das Overlay-Primitive aus Phase 7 (Desktop zentriert, mobil
  Bodenblatt) mit drei Steppern: Arbeitsgewicht (nur Gewichtsuebungen, Schrittweite aus den
  Einstellungen), Repband und Ziel-Score (1-5 mit Label). Kommt das Repband aus der aktiven
  Journey-Phase, ist es gesperrt (blaue Zeile mit Schloss + Band, nicht editierbar - genau
  wie V1; Gewicht und Score bleiben anpassbar). Mobil zusaetzlich der amber Coach-Warnhinweis.
  "Uebernehmen" schreibt erst dann zurueck, zeigt kurz "Uebernommen" (Haekchen) und schliesst.
  Strikt V1-Paritaet, keine Erweiterung. Neu: generisches Stepper-Primitive
  (components/ui/stepper.tsx, domaenenfreie +/- -Reihe, spaeter auch Koerper-Seite und
  Live-Session), ExerciseEditModal (components/exercise), Schreib-Hook useUpdateExercise
  (genau die drei Felder, laedt den Katalog neu), Hook useActivePhaseRepBand (Repband der
  laufenden Phase ueber journeyPlacement) und in der Engine die reinen Helfer
  repTargetForFocus + phaseRepBand (aus V1 portiert, mit Tests). tsc/build/195 Tests gruen.
- **Naechster Schritt:** Phase 9 (Koerper) – Konzept gegen V1 abstimmen (Body-Log,
  InBody-Composition, Verlaufscharts), dann erst bauen.
- **Phase 8 Schritt 4 (Generische MuscleMap) gebaut, live getestet (mit Korrekturen unten).**
  Auf der Uebungs-Detailseite steht zwischen Diagramm und Verlauf eine
  Karte "Beanspruchte Muskeln" mit beiden Figuren (vorne+hinten). Neu: das generische
  Primitive components/ui/muscle-map.tsx - faerbt die Master-SVG anhand einer Werte-Map;
  kennt keine Domaene/Farbe, die Farbgebung kommt ueber colorFn herein (Standard: Rampe
  weiss -> --accent). Genau dieses Stueck nutzt spaeter die Koerper-Seite (Phase 9) fuer
  Muskelkater-Shading - nur andere colorFn, kein Neubau. SVG per ?raw gebuendelt
  (offline-fest), einmal eingebettet, in einem Effekt eingefaerbt (Inline-fill ueberschreibt
  die Illustrator-Klassenfarben, greift durch die Silhouetten-Gruppen). Beteiligung kommt
  aus exercise_muscles ueber neuen Hook useExerciseMuscles + muscleValuesFromRows;
  useExerciseDetail liefert die fertige Werte-Map. Leere Beteiligung -> nur graue
  Silhouette. Doku docs/Muskel-Map.md um eine V2-Umsetzungssektion ergaenzt.
  tsc/build/190 Tests gruen.
- **Live-Korrekturen MuscleMap (nach erstem Test):** (a) Einfaerbung war grau statt
  Markengruen - die Default-Rampe las --accent (im V2-Token-Set ein helles Grau, shadcn-
  Hover), jetzt --primary (#0c9d77, wie die Charts). (b) Muskelblock ohne Karten-
  Hintergrund/Schatten - nur Eyebrow "Beanspruchte Muskeln" + Figuren direkt auf der Seite
  (Section statt Karte). (c) Detailseite ab 960px zweispaltig wie V1: links (1.6) Diagramm
  + Verlauf, rechts (1) Statistik + Muskeln - als zwei unabhaengig fliessende Flex-Spalten
  (KEIN gemeinsames Zeilenraster, sonst Luecke rechts unter der Statistik); mobil weiter
  ein Stapel (Statistik, Diagramm, Muskeln, Verlauf) ueber display:contents + order. Die
  Figur nimmt ~78% Breite (V1-Wert), damit Abstand zwischen Rand und Illustration bleibt.
  tsc/build/190 Tests gruen.
- **Einheitlicher Zurueck-Link (Primitive):** Der Zurueck-Link oben links auf Unterseiten
  ist jetzt ein gemeinsames Primitive components/ui/back-link.tsx (Markengruen/halbfett/
  Chevron/mb-4, wie zuvor auf der Journey-Vorlagenseite). Vorher war er auf der Uebungs-
  Detailseite grau und wich ab. Eingesetzt auf journey_.waehlen und uebungen_.$exerciseId;
  Props to (typsicher ueber LinkProps) + label. tsc/build/190 Tests gruen.
- **GEKLAERT (1RM-Historie, Variante B umgesetzt):** Das je Einheit geschaetzte 1RM wird
  jetzt – wie in V1 zur Anzeigezeit – aus den sauberen Arbeitssaetzen berechnet
  (engine.best1RMFromSets + settings.rm_formula), nicht mehr aus dem beim Import leer
  gebliebenen Feld `tested_1rm`. Kein Neuimport noetig, exakt V1-aequivalent (V1 speicherte
  est1RM ebenfalls nur als berechneten Wert). Damit fuellen sich die Detail-Statistik
  ("6 Wochen") und die 1RM-Spalte der Verlaufsliste, und der geplante 1RM-Chart hat Daten.
  Umgesetzt: useSessionsDetailed holt zusaetzlich done/failed je Satz; HistorySet traegt
  beide; buildExerciseHistory bekommt einen rmFormula-Parameter und rechnet est1RM ueber
  die Engine; useExerciseDetail reicht settings.rm_formula durch. tsc/build/183 Tests gruen.
- **Phase 8 Schritt 3 (Detailseite) komplett:** Statistik + Verlaufsliste + Verlaufsdiagramm
  stehen und sind live testbar. Das Diagramm ist eine Chartkarte zwischen Statistik und
  Verlaufsliste mit Metrik-Umschalter (Chip-Reihe), die je Uebungstyp die richtigen Metriken
  anbietet; gebaut auf dem ChartCanvas/D3-Fundament aus Phase 5. Reine Aufbereitung
  (exMetricOptions/exDefaultMetric/exLineSeries/exVolumeSeries) in lib/exerciseHistory.ts mit
  Tests; neue Primitives ChipSwitch (components/ui) und der Balken-Helfer topRoundedBarPath
  im Chart-Fundament.
- **Phase 8 Schritt 3 Teil 1 (Detailseite: Statistik + Verlauf) erledigt, live testbar:**
  Die Uebungs-Detailseite (uebungen_.$exerciseId) zeigt jetzt echten Inhalt statt des
  Hinweises: Kopf (Zurueck, Name, Art-Badge, Beschreibung), eine Statistik-Reihe und den
  Trainingsverlauf als Liste (neueste zuerst: Datum, bester Satz der Einheit, rechts 1RM bzw.
  Ø-Score). Statistik je Uebungstyp wie V1: Hauptuebungen = geschaetztes 1RM / bestes Set /
  6-Wochen-Veraenderung (akzentuiert); Koerpergewicht = Ziel / Metrik / Anzahl Sessions.
  Reine Logik in lib/exerciseHistory.ts (buildExerciseHistory, exBestSet, exSixWeekPct) mit
  8 Tests; neues generisches StatRow-Primitive (components/ui/stat-row.tsx, spaeter auch
  Koerper-Seite); View-Hook useExerciseDetail. useSessionsDetailed um Score + getestetes 1RM
  erweitert (additiv, Verlauf-Feature unberuehrt). tsc/build/183 Tests gruen.
- **Phase 8 Schritt 2 (Uebungsliste) erledigt, live getestet:** /uebungen zeigt den Katalog
  gruppiert (Haupt/Assistenz/Core/Koerpergewicht/Inaktiv), Tippen oeffnet das Detail. Nach
  dem ersten Live-Test auf fliessende Multi-Column umgestellt (V1 ub-grid: column-count 2,
  break-inside avoid), Desktop zweispaltig ohne Luecke, Mobile einspaltig. Reine Aufbereitung
  in lib/exercises.ts (9 Tests), Helfer fmtWeight/kindLabel, View-Hook useExercisesView.
- **Phase 8 Schritt 1 (Vorbereitung) erledigt:** Master-SVG (src/assets/body-muscles.svg, 14
  Regionen, gebuendelt per ?raw) + Region-Registry/Helfer (src/lib/muscles.ts, 12 Tests) - 1:1
  aus V1. Typ MuscleKategorie ergaenzt.
- **Phase:** Phase 7 (Yoga) **abgeschlossen.** Yoga ist bewusst KEIN eigener Tab, sondern
  eine schnell abgehakte Einheit ueber die Zeile im Training-Tab. Neu und wichtig: das
  **generische Overlay-Primitive** (components/ui/overlay.tsx) als Popup-Fundament fuer alle
  kuenftigen Dialoge - Desktop zentriertes Fenster, Mobile von unten hereingleitendes
  Bodenblatt, Schliessen per Hintergrund/X/Escape, Portal an <body>, Scroll-Lock,
  verzoegertes Aushaengen nach der Ausblende-Animation; animierte Eigenschaften
  transform,translate,scale,opacity (Tailwind-v4-korrekt). Darauf das Yoga-Eintrag-Popup
  (training/YogaEntryModal): drei Schnellwahl-Tage, Dauer-Stepper (80/5/5-180), Lila-Akzent.
  Schreib-Hook useAddYoga legt die Einheit an und laedt Uebersicht + Verlauf neu. Schema/
  Token/Verlaufs-Darstellung/yogaSubtitle waren schon da (Phasen 0-4). Naechste Phase: 8
  (Uebungen).
- **Erledigt:** Phase 0 abgeschlossen (Fundament, Schema/RLS, Engine, Zod-Schemas, UI-Fundament,
  Offline-Grundgeruest, Live-Deploy). Schlichter Login als Voraussetzung fuer alle
  Schreibzugriffe (E-Mail/Passwort ueber Supabase Auth, AuthProvider + useAuth, AuthGate vor
  dem Router, Input-Primitive; Startseite zeigt angemeldete E-Mail und Abmelden). Definitionen-
  Seed: 7 Journey-Vorlagen (+ Phasen) und 2 Skill-Progressionen als Code, idempotenter Runner
  legt sie beim ersten Start mit user_id an. Datenstand-Anzeige auf der Startseite. V1-Import:
  uebersetzt den kompletten V1-Blob (camelCase) in die 23 normalisierten Tabellen (snake_case)
  und schluesselt jede Text-ID auf eine neue, client-seitig vergebene UUID um, in Fremd-
  schluessel-sicherer Reihenfolge; der Skill-Fortschritt haengt sich ueber den Skill-Schluessel
  an die geseedeten Skills. Knopf auf der Startseite: Datei waehlen, Vorschau (Zeilenzahl je
  Block) pruefen, bestaetigen; gesperrt, sobald schon Uebungen/Einheiten vorhanden sind.
  Phase 1 - Design-System: Token-Set (warmes Stone-Grau, weisser Hintergrund, Radius 10px,
  Charts, hell+dunkel) als Basis; Akzent = Markengruen #0c9d77; Nebenakzente Intensitaet/Teal,
  Skill/Blau, Yoga/Lila plus Ampel (gut/Warnung/Abweichung/Gefahr) als eigene Tokens; Schrift
  Inter (UI) + Spline Sans Mono (Zahlen) selbst gehostet (offline-fest); Dunkelmodus
  umschaltbar (hell/dunkel/system, gemerkt) ueber ThemeProvider + ThemeToggle.
  Phase 2 - Navigation/Shell: durchgaengige AppShell um alle Seiten (im __root). Eine
  gemeinsame Nav-Definition (src/lib/nav.ts) speist Sidebar (Desktop ab 960px, fix links,
  264px) und Bottom-Nav (Mobile darunter, sechs Punkte, nur Icons - Label als aria-label);
  Aktiv-Zustand ueber die Link-activeProps des Routers. Einstellungen separat ueber das Konto-
  Symbol (Sidebar-Fuss bzw. Mobile-Kopf), nicht in der Leiste - wie V1. Theme-Umschalter sitzt
  vorerst nur in den Einstellungen (aus Sidebar-Fuss und Mobile-Kopf wieder entfernt). Sieben
  Routen als deutsche Slugs: / = Training, /journey, /verlauf, /uebungen, /koerper, /skills,
  /einstellungen; die sechs Seiten vorerst schlanke Platzhalter (PagePlaceholder), echter
  Inhalt ab Phase 3. Der provisorische Startseiten-Inhalt (Konto/Abmelden, Verbindungs-
  Diagnose, Datenstand, V1-Import) ist nach /einstellungen umgezogen.
- **Entscheidung (Design, 2026-06-22 revidiert):** Globaler Look wird moeglichst 1:1 aus
  dem V1-"Klar"-Theme uebernommen statt eigener Luma-Interpretation. Heisst konkret:
  V1-Tokens (warmweisser Canvas `--bg #edeef1`, weisse Karten `--panel`, Akzent #0c9d77),
  V1-Radien (Karten 16px, Bedienelemente 11px, Pillen 20px), V1-Schatten (weich, kein
  harter Rahmen), Schrift System-UI fuer die Oberflaeche (Inter raus) und Spline Sans Mono
  fuer Zahlen. Die in der ersten Runde gebaute Luma-Geometrie (32px-Karten, Inter,
  Luma-Elevation) wird zurueckgedreht. shadcn/ui bleibt als Komponenten-Fundament
  (Mechanik/Barrierefreiheit), nur die Optik wird auf V1 gelegt. Dunkelmodus bleibt
  umschaltbar. Quelle der Wahrheit: V1-Dateien klar-tokens.css und klar-app.css (nur lesen).
- **Entscheidung (Phase 2):** Navigation 1:1 wie V1 - sechs Hauptpunkte (Training, Journey,
  Verlauf, Uebungen, Koerper, Skills), Einstellungen separat ueber das Konto-Symbol; Yoga
  bleibt kein eigener Punkt (spaeter Karte im Training). Umschaltpunkt 960px. / zeigt direkt
  Training (kein eigener Startbildschirm). Sidebar und Bottom-Nav teilen sich eine Nav-Liste,
  damit sie nicht auseinanderlaufen.
- **Als Naechstes:** Phase 6 live testen und freigeben, dann Phase 7 (Yoga) - zuerst
  Konzept gegen V1 abstimmen: Karte im Training-Tab plus Eintrag-Popup. Die eigentliche
  Skill-Live-Session bleibt fuer Phase 11 vorgemerkt.
- **Bewusst noch nicht dabei:** JSON-Export-Haelfte und Import/Export-Politur (Phase 12),
  Abgleich alt/neu (Stichproben), vollstaendiges Konto-Panel (Phase 10), App-Huelle offline
  laden (PWA, Phase 13), sichtbare Offline-Anzeige (Phase 1/2).
- **Offene Grundsatzfragen:** Deploy/Test geklaert. In-App-Versionsanzeige (dreistellig,
  schlank) als spaeterer Komfort-Block vorgemerkt. Login ist eine Minimalversion; das
  vollstaendige Konto-/Sync-Panel bleibt Phase 10.

---

## Globaler Look zuerst

Vor den Feature-Bloecken steht die durchgaengige Gestaltung (Phase 1). Sie gilt fuer
alle Bloecke und wird einmal bewusst entschieden, bevor einzelne Seiten entstehen.

### Look-Kanon (verbindlich fuer ALLE Seiten)

Beim Schliff der Training-Seite (Phase 3) wurden die globalen Layout-Regeln festgezurrt.
Sie stecken in wiederverwendbaren Bausteinen - **neue Seiten nutzen diese Bausteine und
erfinden Abstaende/Groessen nicht neu.** Alle Werte sind aus dem V1-"Klar"-Theme.

- **Inhaltsflaeche (`AppShell`):** Container max. 1180px, zentriert. Desktop-Raender
  52px seitlich / 40px oben / 72px unten; Handy 22px seitlich / 22px oben, unten Platz
  fuer die Bottom-Nav. Umschaltpunkt Desktop/Mobile: 960px.
- **Schrift:** System-UI (V1-Stack: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
  fuer die Oberflaeche; Spline Sans Mono nur fuer Zahlen. Kein Sora/Inter.
- **Zeilenhoehe:** global `normal` (rund 1.2), nicht Tailwind-Default 1.5. Groessen ueber
  feste px (`text-[15px]`), nicht ueber `text-base/-sm/-xs` - die brachten eine eigene
  Zeilenhoehe mit. Wo bewusst mehr Zeilenabstand noetig ist (laengerer Fliesstext), lokal
  `leading-[1.5]` setzen.
- **Seitenkopf (`PageHeader`):** auf JEDER Seite. Datum (13px Handy / 14px Desktop, muted)
  ueber Titel (28px Handy / 34px Desktop, fett); Titel-Abstand zum Datum 1px. Der untere
  Abstand gehoert zum Kopf: 16px Handy / 26px Desktop. Am Handy sitzt rechts der Konto-
  Avatar (40px, Sync-Punkt, zum Kopf zentriert); am Desktop kein Avatar (Konto in der
  Sidebar). Datum per `date`-Prop -> erscheint nur, wenn gesetzt.
- **Block mit Ueberschrift (`Section`):** kleine Versal-Eyebrow (13px Handy / 12px Desktop,
  600, uppercase, getrennt, muted) mit Abstand darunter (10px Handy / 12px Desktop). Fuer
  alle Block-Titel wie "Heute empfohlen", "Weitere Workouts", "Aktive Skills", "Yoga".
- **Listen (`List` + `ListRow`):** weisse Karte, Radius 18px, weicher Schatten, Zeilen mit
  Trennlinien. Zeile: Titel (17px Handy / 15px Desktop, 600) + Unterzeile (13px, muted),
  optional Anhaengsel rechts (Score) + Pfeil. Zeilen-Padding 14px Handy / 16px Desktop.
  `bordered` gibt auch der ersten Zeile eine obere Linie (wenn eine Eyebrow darueber steht).
- **Zwei Spalten (`TwoColumn`):** Desktop 1,6fr / 1fr, horizontaler Abstand 26px; Abstand
  zwischen Bloecken innerhalb einer Spalte 28px (Desktop) / 24px (Handy); am Handy gestapelt.
- **Karten/Radien/Schatten:** Listen-/Block-Karten 16-18px, Hero 22px, Bedienelemente 11px,
  Pillen 20px; weiche V1-Schatten, kein harter Rahmen.
- **Bottom-Nav (Handy):** deckend weiss, weicher oberer Schatten, Icons 27px, oben 10px /
  unten 22px (+ Safe-Area), inaktiv #b0b0b6, aktiv Markengruen.
- **Konto-Avatar (`AccountButton`):** "compact" = runder 40px-Avatar mit Sync-Punkt
  (gruen angemeldet / grau getrennt) fuer den Handy-Kopf; "full" = Avatar + Name + Status
  fuer den Sidebar-Fuss (Desktop).
- **Kalender (`Calendar`):** generisches Monatsgitter mit Navigation (Zurueck/Vor/Heute),
  heutiger Tag hervorgehoben; was unter der Tagesnummer steht, liefert der Aufrufer ueber
  `renderCell(iso)`. Optik aus V1 (Zelle min 54px Handy / 72px Desktop, weiche Karte).
  Spaeter auch fuer Journey/Koerper nutzbar (Phase 4 gebaut).
- **Segment-Umschalter (`SegmentedControl`):** zwei oder mehr gleichwertige Ansichten,
  genau eine aktiv (z. B. Liste/Kalender). Generisch, ohne Domaenenbezug; Optik aus V1
  (graue Wanne, aktive Pille weiss mit weichem Schatten). (Phase 4 gebaut.)
- **Chart-Fundament (`ChartCanvas` + Helfer in `components/ui/chart.tsx`):** domaenenfreies,
  D3-getriebenes Verlaufschart-Geruest. Misst die verfuegbare Breite, wird bei vielen Punkten
  horizontal scrollbar, und bringt den geteilten Stil mit (glatte Catmull-Rom-Linie, weiche
  Flaechenfuellung, heller Endpunkt-Ring, dunkler Nub-Tooltip; CHART_FONT/CHART_MONO,
  readToken). Die Domaene liefert nur den draw-Rueckruf und die Daten. (Phase 5 gebaut; Phase 8
  Uebungs-Verlaufscharts nutzen es mit.)
- **Aufklappbare Karte (`AccordionItem`):** weisse Karte mit klickbarem Kopf (beliebiger
  Inhalt) und Chevron, darunter der einklappbare Bereich. Optionales `trailing`-Element
  rechts neben dem Kopf (ausserhalb des Klappen-Knopfs, z. B. ein Schalter). Eigener
  Offen-Zustand je Eintrag. Generisch; spaeter auch fuer Uebungen/Verlauf. (Phase 6 gebaut.)
- **Schalter (`Switch`):** barrierefreier An/Aus-Schalter (role=switch), gruene Wanne an,
  graue aus. Generisch; nutzbar fuer Skill aktivieren/deaktivieren und spaeter die
  Einstellungen (Equipment, Theme). (Phase 6 gebaut.)
- **Chip-Umschalter (`ChipSwitch`):** generischer Einfach-Auswahl-Chips (genau einer aktiv);
  Optik aus V1 (.ub-metric): kleine Buttons, inaktiv dezent grau, aktiv markengruen gefuellt.
  Anders als `SegmentedControl` (graue Wanne) eine lockere Chip-Reihe. Genutzt fuer den
  Uebungs-Metrik-Umschalter, spaeter Koerper-Metriken. (Phase 8 gebaut.)
- **Popup (`Overlay`):** generisches Popup-Fundament fuer ALLE modalen Dialoge (1:1 aus
  dem V1-Verhalten: Yoga-Eintrag, Workout-Start, Sitzungsende, Login teilen alle dieselbe
  Mechanik). Desktop (>=960px) zentriertes Fenster (440px, Radius 22px, weicher Schatten);
  Mobile Bodenblatt (volle Breite, oben 26px, Greif-Leiste, faehrt von unten rein/raus).
  Schliessen per Hintergrundklick, X im Kopf oder Escape; Hintergrund-Scroll gesperrt;
  rendert per Portal an <body>; Aushaengen aus dem DOM bis zum Ende der Ausblende-Animation
  verzoegert. Domaenenfrei: Titel + Inhalt liefert der Aufrufer, der primaere Aktionsknopf
  und ein mobiles "Abbrechen" gehoeren in den Inhalt. (Phase 7 gebaut; ersetzt spaeter auch
  Loesch-Bestaetigung und Einstellungs-Dialoge.)

Wenn eine neue Seite ein Muster braucht, das es noch nicht gibt (z. B. Kalender, Chart,
Muscle-Map), wird es als neues wiederverwendbares Primitive in `src/components/ui` angelegt
und hier ergaenzt - nicht seitenlokal zusammengebaut.

---

## Phase 0 – Schema und Fundament

- [x] Setup-Grundsatzentscheidungen bestaetigt (Stack, Offline-Zuschnitt, Deploy/Test-Weg)
- [x] Supabase-Projekt fuer V2 angelegt (eigene DB, getrennt von V1)
- [x] Schema/Tabellen/RLS umgesetzt (Skript in Supabase ausgefuehrt; 23 Tabellen mit RLS)
- [x] Invarianten als DB-Constraints (genau eine aktive Journey pro Nutzer, aktiv)
- [x] Vite + TypeScript (strict) aufgesetzt (minimales Skelett)
- [x] TanStack Router (file-based) eingerichtet (src/routes mit __root + index,
      generierter Routenbaum, Devtools nur im Dev)
- [x] Tailwind + shadcn/ui aufgesetzt (Tailwind v4 via Vite-Plugin; shadcn neutrale Basis,
      components.json, cn-Helfer, Button-Primitive, @-Pfadalias)
- [x] Supabase-Client + TanStack-Query-Setup (Verbindung steht, Health-Check sichtbar)
- [x] Engine nach TypeScript portiert (1RM, Plate-Loader, Aufwaerm-Generator,
      Doppelprogression, Phasenwechsel, Suitability, Volumen/Deload, Erholungs-Check,
      Skill-Advice) – modulare Bausteine unter src/engine/, Logik 1:1 aus V1
- [x] Engine-Unit-Tests laufen (Vitest), gruen – 88 Tests in 7 Dateien, Paritaet zu V1 belegt
- [x] Zod-Schemas fuer die Entitaeten (alle 23 Tabellen 1:1 gespiegelt: Row + Insert,
      jsonb-Wertobjekte; Typen abgeleitet; 13 Tests gruen)
- [x] Offline-Grundgeruest gelegt (persistenter Query-Cache in IndexedDB + Fortsetzen
      pausierter Mutationen, Skelett; Cache-Buster + Max-Alter 7 Tage)
- [x] **Live-Test-Deploy eingerichtet** (Workflow gepusht; baut bei jedem Push auf main
      und veroeffentlicht auf Pages. Letzter Handgriff beim Nutzer: Pages-Quelle auf
      „GitHub Actions" stellen)

## Phase 1 – Design-System (globaler Look)

Kursaenderung 2026-06-22: nicht mehr eigene Luma-Interpretation, sondern V1-"Klar"-Theme
moeglichst 1:1 uebernehmen. shadcn bleibt als Fundament (nur die Optik wird auf V1
zurueckgedreht). Quelle: V1-Dateien klar-tokens.css und klar-app.css (nur lesen).

- [x] Konzept abgestimmt (Entscheidung: V1-Look 1:1 statt eigener Luma-Stil)
- [x] V1-Tokens 1:1 als Tailwind-Theme (Farben `--bg`/`--panel`/`--accent`, Radien
      16/11/20px, weiche Schatten `--shadow-card`/`-hi`/`-pop`, reines Hell-Theme)
- [x] shadcn-Primitives (Button/Input/Card) von Luma-Geometrie auf V1-Optik zurueckgedreht
      (Karte 16px statt 32px, V1-Schatten statt Luma-Elevation, V1-Button/-Feld)
- [x] Schrift auf System-UI (Oberflaeche, 1:1 wie V1) + Spline Sans Mono (Zahlen); Inter
      und Sora raus. (Sora war eine Zwischenstufe, wirkte aber zu wuchtig - in der dritten
      Live-Runde auf die V1-System-Schrift zurueckgedreht.) Dunkelmodus entfernt (V1 hat keinen)

## Phase 2 – Navigation / Shell

- [x] Konzept abgestimmt (Seitenstruktur, Sidebar/Bottom-Nav, Verhalten Mobile/Desktop)
- [x] Routing-Geruest steht (7 Routen, deutsche Slugs, AppShell im __root, Platzhalter)
- [x] Sidebar (Desktop) + Bottom-Nav (Mobile) aus gemeinsamer Nav-Definition; Einstellungen
      ueber Konto-Symbol, Theme-Umschalter in Sidebar-Fuss/Mobile-Kopf
- [x] Shell-Optik auf V1 angeglichen (versaler Markenname, Nav 12px-Radius + warmes Grau,
      Bottom-Nav deckend weiss mit weichem Schatten, keine Luma-Transparenz)
- [x] Globale Inhaltsflaeche auf V1-Mass gebracht (AppShell-Container 1180px statt 768px,
      Desktop-Raender 52/40/72px, Handy 22px seitlich; PageHeader-Titel wie V1 Handy 34px /
      Desktop 28px, einheitlicher Kopf-Abstand). Gilt fuer alle Seiten.

## Phase 3 – Training (Uebersicht & Empfehlung)

Reine Lese-/Navigationsseite: zeigt an und fuehrt hin, fuehrt aber nicht durch. Die
eigentliche Durchfuehrung (Timer, Satz-Abhaken, Coach beim Trainieren, Sheet/Overlay)
ist bewusst Phase 11 (Live-Session). Eignung/Erholung und Coach-Empfehlung erscheinen
hier nur als Anzeige - Engine und Coach rechnen bereits (Phase 0). "Session starten"
fuehrt vorerst zu einem Platzhalter, bis Live steht.

- [x] Konzept abgestimmt (Funktionsschnitt Training/Live geklaert; Paritaet zu V1, Zwei-Spalten)
- [x] Journey-Streifen (Fortschritt) + Hero "Heute empfohlen" (Workout, Score, Lifts)
- [x] Liste weiterer Workouts (mit Score), aktive Skills, Yoga-Einstieg
- [x] Eignung/Erholung + Coach-Empfehlung als reine Anzeige (kein Eingriff in die Logik)
- [x] "Session starten" verdrahtet (vorerst Platzhalter bis Phase 11)
- [x] Live getestet und freigegeben (auf der Deploy-Seite). Mehrere Schliff-Runden gegen V1
      (Desktop + Handy): Inhaltsbreite, Raender, Seitenkopf, Hero-Hoehe, Skill-Klick-Paritaet,
      System-Schrift, Zeilenhoehe, Mobile-Avatar im Kopf, Bottom-Nav, Listen-Titel. Die dabei
      festgezurrten globalen Regeln stehen im Look-Kanon (oben) und gelten fuer alle Folgeseiten.

## Phase 4 – Verlauf

- [x] Konzept abgestimmt (Paritaet zu V1: Kalender + Liste + aufklappbare Session-
      Zusammenfassung + Loeschen. Keine Statistik-Reihe und keine Charts - V1 hatte im
      Verlauf nie Charts, daher bewusst nicht dabei und aus dem Plan entfernt.)
- [x] Kalender + Listenansicht
- [x] Session-Zusammenfassung
- [x] Live getestet und freigegeben. Schliff nach dem Bau: die Typ-Pillen (Kraft/Skill/
      Yoga/Abweichung) in den Listeneintraegen wieder entfernt - der farbige Punkt kodiert
      den Typ, die Chips wirkten ueberfluessig.

## Phase 5 – Journey

- [x] Konzept abgestimmt (strikt Paritaet zu V1; Seite einspaltig; Schritt 1 = Seite +
      Phasen + Waehler, Periodisierungskurve als Schritt 2 danach)
- [x] Phasen + Wochen-Platzierung (automatisch) – aktive-Journey-Karte, Phasen-Ablauf mit
      Status (vergangen/aktuell/kuenftig) aus der Engine-Platzierung, Vorlagen-Waehler mit
      Anlegen und Umbenennen. Platzierung/Volumen rechnen aus Phase 0.
      **(Schritt 1 live getestet und freigegeben 2026-06-22.)**
- [x] Periodisierungschart (Schritt 2 – wiederverwendbares Chart-Fundament, das spaeter
      die Uebungs-Verlaufscharts in Phase 8 mitnutzen).
- [x] Live getestet und freigegeben (Journey-Seite mit allem: aktive Karte, Bearbeiten/Waehler,
      Periodisierungskurve). Schliff nach dem Bau: Bearbeiten-Knopf repariert (Waehler-Route
      entschachtelt) und Periodisierungs-Block auf V1 angeglichen (kein Karten-Hintergrund/
      -Schatten/-Padding, Graph buendig) + auf dem Handy lockerer (64 px statt 50 px je Woche).

## Phase 6 – Skills

- [x] Konzept abgestimmt
- [x] Manager-Ansicht (aktivieren, Phase anpassen, Fortschritt)
- [x] Equipment-Tor
- [x] Konsekutiv-Logik (Zaehler-Reset bei Fehlschlag)
- [x] Live getestet und freigegeben (Skills-Tab: eine Liste mit Schalter pro Skill,
  aufklappbar mit Phasen/Zaehler/Equipment-Tor, Aktionen Phase zurueck/Zuruecksetzen;
  Skill-Blau als Akzent). Hinweis: das Trainieren selbst (Skill-Live-Session) ist Phase 11.

## Phase 7 – Yoga

- [x] Konzept abgestimmt (Karte/Zeile im Training-Tab + Eintrag-Popup, strikt V1:
      drei Schnellwahl-Tage Heute/Gestern/Vorgestern, Dauer-Stepper Start 80, Schritt 5,
      Grenzen 5-180, keine freie Datumswahl, kein Notizfeld. Yoga bleibt kein eigener Tab.)
- [x] Karte im Training-Tab + Eintrag-Popup (Yoga-Zeile oeffnet das Popup; Eintragen legt
      eine erledigte Yoga-Einheit an -> erscheint sofort im Verlauf und als "Zuletzt" oben.
      Neu: generisches Overlay-Primitive (Desktop zentriert, Mobile Bodenblatt) als Fundament
      fuer alle kuenftigen Popups; Schreib-Hook useAddYoga.)
- [x] Live getestet und freigegeben (Popup + Yoga-Eintrag funktionieren; Mobile-Gleiten
      des Bodenblatts korrigiert).

## Phase 8 – Uebungen (inkl. Muscle-Map)

Bau in kleinen Schritten: (1) Vorbereitung SVG + Registry, (2) Uebungsliste,
(3) Detailseite, (4) MuscleMap-Komponente, (5) "Uebung anpassen" (Popup ueber Overlay),
(6) Anheften/Dashboard. Muscle-Map immer beide Figuren (Handy + Desktop). Beteiligung aus
DB-Tabelle exercise_muscles. Charts ueber ChartCanvas/D3 (Phase 5).

- [x] Konzept abgestimmt (Funktionsschnitt gegen V1; Scope-Entscheidungen Anheften/
      Uebung-anpassen/Mobile-Map geklaert; Schritt-Reihenfolge oben)
- [x] Vorbereitung: Master-SVG (src/assets/body-muscles.svg) + Region-Registry/Helfer
      (src/lib/muscles.ts) mit 12 Unit-Tests
- [x] Uebungsliste (gruppiert Haupt/Assistenz/Core/Koerpergewicht/Inaktiv ueber
      Section+List/ListRow; Tippen oeffnet die Detailseite; Detail-Route als eigenstaendige
      Vollseite uebungen_.$exerciseId angelegt, vorerst nur Kopf)
- [x] Detailseite – Statistik-Reihe + Trainingsverlauf (Liste). Skill-Uebungen ohne
      Katalogbezug zeigen noch leer (Anbindung ueber Skill-Definition als eigener Schritt)
- [x] Detailseite – Verlaufsdiagramm mit Metrik-Umschalter (ChartCanvas/D3 aus Phase 5):
      Chartkarte zwischen Statistik und Verlaufsliste; Chip-Umschalter je Uebungstyp
      (Haupt: 1RM/Top-Gewicht/Wdh/Volumen, Standard 1RM; Koerper-Wdh: Wdh/Volumen;
      Koerper-Haltezeit: nur Haltezeit). Linie je Einheit (Tooltip, roter Punkt bei
      Abweichung), Volumen als Wochenbalken. "Anheften" folgt mit Schritt 6.
- [x] Skill-Uebungsverlauf anbinden (Skill-Saetze ueber die Skill-Definition der
      Katalog-Uebung zuordnen)
- [x] Generische MuscleMap-Komponente (Doku: docs/Muskel-Map.md)
- [x] "Uebung anpassen" als Popup ueber das Overlay-Primitive
- [x] Anheften/Dashboard – "Angeheftet"-Sektion oben auf /uebungen + Anheften-Umschalter
      im Kopf der Detail-Chartkarte. Speicherung geraete-lokal (localStorage), getrennt vom
      Datenbestand, nicht synchronisiert/exportiert (V1-Verhalten). Kein Sortieren/Entfernen
      in der Sektion (Verwaltung ueber den Umschalter), V1-Paritaet.
- [x] Live getestet und freigegeben (2026-06-23). Gesamte Uebungs-Phase abgenommen:
      Liste, Detailseite (Statistik/Verlauf/Diagramm mit Metrik-Umschalter), MuscleMap,
      "Uebung anpassen", Anheften und Skill-Verlauf-Anbindung. Phase 8 abgeschlossen.

## Phase 9 – Koerper

- [x] Konzept abgestimmt (voller V1-Funktionsschnitt: Befinden mit Empfehlungs-Banner,
      Muskelkater-Figur, Eingabe, Verlauf + Messung mit Metrik-Chart/Liste/JSON-Import;
      Bewertungs-Buttons als generisches Primitive; Bau in zwei Lieferungen Befinden -> Messung)
- [x] Body-Log (Befinden): Empfehlungs-Banner, Muskelkater-Figur (generische MuscleMap +
      Kater-Farbskala), Eingabe-Karte (Kater/Readiness ueber das neue RatingScale-Primitive,
      Schmerz-Schalter, Notiz, Eintragen/Aktualisieren als Tages-Upsert), Verlaufsliste
- [x] InBody-Composition: Mess-Karte mit Metrik-Umschalter (Gewicht/Fett/Muskel/Wasser/
      Phasenwinkel), Read-only-Mess-Liste (Chips) und aufklappbare JSON-Import-Karte
      (InBody-Skill-Format, Upsert je Datum). Normalisierung camelCase -> DB-Spalten.
- [x] Verlaufscharts: Mess-Verlaufslinie je Metrik auf dem D3-Fundament (Phase 5/8),
      gruene Kurve mit Flaeche und Mono-Wertlabel am letzten Punkt (V1-Look).
- [ ] Live getestet

## Phase 10 – Einstellungen

- [ ] Konzept abgestimmt
- [ ] Inventar (Stangen, Scheiben, Equipment)
- [ ] Plate-Loader / Ladbarkeitspruefung
- [ ] Settings (Frequenzziel, Gewichtsschritt, 1RM-Formel, Timer)
- [ ] Sync-/Konto-Panel
- [ ] Live getestet

## Phase 11 – Live-Session (Kraft + Skill) — der dicke, heikle Brocken

Die gefuehrte Durchfuehrung samt aller schwierigen Mechanik. Bewusst von Phase 3
getrennt: was hier liegt, gehoert nicht auf den Trainings-Screen.

- [ ] Konzept abgestimmt
- [ ] Sitzungsaufbau aus Vorlage + Coach (Arbeitssaetze, Aufwaermsaetze, Plate-Loader)
- [ ] Gefuehrter Ablauf: Saetze abhaken (Aufwaermen, Arbeitssaetze, allg. Aufwaermen)
- [ ] Coach beim Durchfuehren (Aufwaerm-Generator, Satz-Vorschlaege, Progression)
- [ ] Pausen-/Rest-Timer (Satz/Uebung getrennt, Auto-Start) + Rest-Bar
- [ ] Audio/Vibration
- [ ] Overlay (Desktop) / Bottom-Sheet (Mobile) mit Ein-/Ausklappen per Ziehgeste, Wake-Lock
- [ ] Fokus-erhaltende Inline-Updates (kein Voll-Neurender beim Tippen)
- [ ] Start-/Ende-Dialoge
- [ ] Volles Offline-Zusammenspiel (Aufzeichnen ohne Netz, spaeter Sync)
- [ ] Live getestet

## Phase 12 – Migration + Import/Export

- [ ] Konzept abgestimmt
- [x] Definitionen aus V1-Code als DB-Seed (Journey-Vorlagen, Skills; idempotent, beim
      ersten Start mit user_id; temporaere Datenstand-Anzeige zum Pruefen)
- [x] Migrationsskript: V1-Blob -> normalisierte Zeilen, IDs umschluesseln (Import-
      Knopf auf der Startseite: Datei waehlen, Vorschau, bestaetigen; gesperrt, sobald
      Daten da sind)
- [ ] JSON-Import/Export (Export-Haelfte + Politur, wandert nach Einstellungen)
- [ ] Abgleich alt/neu (Anzahl Sessions/Saetze/Journeys + Stichproben)

## Phase 13 – Politur

- [ ] PWA
- [ ] iOS-Safari-Fixes
- [ ] Bugfixing
- [ ] Paritaetsdurchlauf gegen V1

---

## Erledigt (Log)

Hier kommen abgeschlossene Bloecke mit Datum dazu, sobald sie fertig sind.

- 2026-06-23 - Phase 8 Skill-Uebungsverlauf-Anbindung abgeschlossen, wartet auf Live-Test.
  Skill-Saetze (exercise_id null) werden ueber die Skill-Definition der Katalog-Uebung
  zugeordnet - 1:1 wie V1 (app.js exerciseHistory, skill-Zweig): skill_id (DB-UUID) ->
  Definitions-Schluessel (useSkills) -> Skill-Seed -> Phase + Position -> exerciseKey/target/
  metric; Treffer, wenn exerciseKey == key der geoeffneten Uebung. Verlaufszeilen je Skill-
  Einheit (Werte-Chips + "Ziel X"), Werte zaehlen in Statistik/Diagramm typgerecht mit (Wdh/
  Volumen bzw. Haltezeit), kein Gewicht/1RM/Score, Abweichung bei verfehltem Ziel (met=false),
  nur abgehakte Saetze. Umgesetzt: buildExerciseHistory + exerciseKey/SkillExResolve, ExHistory-
  Entry um skill/metric/target, useSessionsDetailed holt skill_phase + set.met, HistorySet/
  HistorySessionInput additiv (met/skillPhase), useExerciseDetail baut Resolver aus useSkills +
  skillSeeds. Kraft-/1RM-Pfad, Diagramm-Fundament und Anheften unberuehrt. tsc/build/206 Tests
  gruen (5 neue).

- 2026-06-23 - Phase 8 Schritt 6 live getestet und freigegeben (Anheften/Dashboard).
- 2026-06-23 - Phase 8 Schritt 6 abgeschlossen (Anheften/Dashboard), wartet auf Live-Test.
  Anheften-Umschalter im Kopf der Detail-Chartkarte (je Uebung+Metrik) + "Angeheftet"-
  Sektion oben auf /uebungen mit flachen Chart-Kacheln (Desktop-Raster/Handy-Liste, leer ->
  Hinweis). Speicherung geraete-lokal (localStorage ks_pins_v1), getrennt vom Datenbestand,
  nicht synchronisiert/exportiert - V1-Verhalten (app.js DASH). Kein Sortieren/Entfernen in
  der Sektion (Verwaltung ueber den Umschalter); der V1-Drag&Drop gehoerte zum ungenutzten
  alten dashboardHTML. Neu: lib/pinnedCharts.ts (reine Helfer + Typen, 6 Tests), Store-Hook
  usePinnedCharts (useSyncExternalStore, Cross-Tab via storage-Event), View-Hook
  usePinnedView, Komponente exercise/PinnedCharts, Hook useIsDesktop (960px), EX_METRIC_SHORT,
  height-Prop an ExerciseChart. tsc, build und 201 Tests gruen (6 neue).
- 2026-06-23 - Phase 8 Schritt 5 live getestet und freigegeben ("Uebung anpassen").
- 2026-06-23 - Phase 8 Schritt 5 abgeschlossen ("Uebung anpassen"), wartet auf Live-Test.
  Die Uebungs-Detailseite bekommt unten den Knopf "Uebung anpassen" (Stift), der ein Popup
  ueber das Overlay-Primitive aus Phase 7 oeffnet - 1:1 wie V1 (app.js buildExEditInner/
  openExEditModal). Drei Stepper: Arbeitsgewicht (nur Gewichtsuebungen, Schrittweite =
  settings.weight_step, Untergrenze 0), Repband und Ziel-Score (1-5 mit Label sehr leicht …
  im Ziel · 2 RIR … Versagen). Repband-Sperre wie V1: kommt das Band aus der aktiven Journey-
  Phase (nur Kraftuebungen, profile=strength), wird es als blaue Zeile mit Schloss
  ("aus aktiver Phase" + Band) angezeigt und ist nicht editierbar; sonst zwei Stepper min/max,
  die sich gegenseitig nachziehen. Mobil zusaetzlich der amber Coach-Warnhinweis (Desktop
  ohne, wie V1). "Uebernehmen" schreibt erst dann zurueck, zeigt ~850ms "Uebernommen"
  (Haekchen) und schliesst. Knopf-Platzierung wie V1: Desktop unten in der rechten Spalte,
  mobil ganz am Ende (order-5, nach dem Verlauf). Strikt V1-Paritaet, keine Erweiterung.
  Neu: generisches Stepper-Primitive (components/ui/stepper.tsx) - domaenenfreie +/- -Reihe,
  Container-Look kommt vom Aufrufer, spaeter auch Koerper-Seite und Live-Session;
  ExerciseEditModal (components/exercise); Schreib-Hook useUpdateExercise (genau die drei
  Felder, invalidiert den Katalog); Hook useActivePhaseRepBand (Repband der laufenden Phase
  ueber engine.journeyPlacement). In der Engine die reinen Helfer repTargetForFocus (Fokus ->
  Band, aus V1) und phaseRepBand (explizite Grenzen, sonst Fokus) mit 5 neuen Tests.
  tsc, build und 195 Tests gruen (5 neue).

- 2026-06-23 - Phase 8 Schritt 4 abgeschlossen (Generische MuscleMap), wartet auf Live-Test.
  Auf der Uebungs-Detailseite steht zwischen Diagramm und Verlauf eine Karte "Beanspruchte
  Muskeln" mit beiden Figuren (vorne+hinten, kein Umschalter - wie V1). Neu: das generische
  Primitive components/ui/muscle-map.tsx. Reine Darstellung, kennt keine Domaene und keine
  feste Farbe: Werte-Map herein (Region/Gruppe/Sektion -> 0..1, ueber expand aufgeloest), die
  Farbgebung kommt ueber colorFn (Standard Rampe weiss -> --accent), dazu base/idle. Genau
  dieses Stueck nutzt spaeter die Koerper-Seite (Phase 9) fuer Muskelkater-Shading - nur
  andere colorFn, kein Neubau (Kernziel Wiederverwendung). SVG (src/assets/body-muscles.svg)
  per ?raw gebuendelt (offline-fest, kein Fetch wie in V1), einmal eingebettet und in einem
  Effekt eingefaerbt: Inline-fill auf Element + alle <path> ueberschreibt die Illustrator-
  Klassenfarben und greift durch die Silhouetten-Gruppen auf die Koerper-Teile durch.
  Mehrfach-Einbetten ist sicher (keine internen id-Referenzen). Beteiligung aus der Tabelle
  exercise_muscles ueber neuen Hook useExerciseMuscles + muscleValuesFromRows (lib/muscles);
  useExerciseDetail filtert je Uebung und liefert die fertige Werte-Map. Leere Beteiligung ->
  nur graue Silhouette (kein Fehler). Doku docs/Muskel-Map.md um Abschnitt 9 (V2-Umsetzung)
  ergaenzt. Reine Logik (Registry expand/muscleValuesFromRows) war aus Schritt 1 mit Tests
  da; keine neuen Tests noetig. tsc/build/190 Tests gruen.

- 2026-06-23 - Phase 8 Schritt 3 abgeschlossen (Verlaufsdiagramm), wartet auf Live-Test.
  Die Uebungs-Detailseite bekommt eine Chartkarte zwischen Statistik und Verlaufsliste, 1:1
  aus V1 (charts.js drawExLine/drawExBars, app.js exMetricOptions/exerciseChartData). Oben ein
  Metrik-Umschalter als Chip-Reihe, der je Uebungstyp die richtigen Metriken anbietet (Haupt/
  Assistenz/Core: 1RM/Top-Gewicht/Wdh/Volumen, Standard 1RM; Koerpergewicht mit Wdh: Wdh/
  Volumen; Koerpergewicht mit Haltezeit: nur Haltezeit, kein Umschalter). 1RM/Top-Gewicht/Wdh/
  Haltezeit zeichnen eine glatte Kurve je Einheit (weiche Flaeche, heller Endpunkt-Ring,
  Tooltip bei Hover/Tipp), Abweichungs-Einheiten mit rotem Punkt; Volumen als Wochenbalken
  (oben gerundet, gruener Verlauf). Leere Metrik zeigt "noch keine Daten". Gebaut auf dem
  D3-Chart-Fundament aus Phase 5. Neu/erweitert: reine Aufbereitung in lib/exerciseHistory.ts
  (exMetricOptions, exDefaultMetric, exLineSeries, exVolumeSeries, EX_METRIC_TITLE; Volumen je
  ISO-Woche ueber engine.isoWeekKey) mit 7 neuen Tests; generisches Primitive ChipSwitch
  (components/ui/chip-switch.tsx, Einfach-Auswahl, V1 ub-metric-Optik) fuer spaeter auch die
  Koerper-Metriken; im Chart-Fundament der wiederverwendbare topRoundedBarPath plus optionale
  Bodenopazitaet an appendAreaGradient (fuer die Balkenfuellung). Komponenten
  components/exercise/ExerciseChart (Linie + Balken) und ExerciseChartCard (Titel + Umschalter
  + Chart, lokaler Metrik-Zustand). useExerciseDetail liefert chartHistory/metricOptions/
  defaultMetric/unit mit; Detail-Route bindet die Karte ein. Der "Anheften"-Knopf der Karte
  ist bewusst Schritt 6. tsc, build und 190 Tests gruen (7 neue).

- 2026-06-23 - Phase 8: 1RM-Historie repariert (Variante B), Voraussetzung fuer das
  Verlaufsdiagramm. Das je Einheit geschaetzte 1RM wird jetzt zur Anzeigezeit aus den sauberen
  Arbeitssaetzen berechnet (engine.best1RMFromSets mit settings.rm_formula), statt aus dem beim
  V1-Import leer gebliebenen Feld tested_1rm gelesen. Hintergrund: V1 speicherte est1RM nie als
  importierbares Rohfeld, sondern berechnete es am Sitzungsende aus denselben Saetzen - die
  Anzeige-Berechnung ist daher exakt V1-aequivalent, nur ohne Neuimport. Aenderungen additiv:
  useSessionsDetailed holt zusaetzlich done/failed je Satz; HistorySet traegt beide (optional);
  buildExerciseHistory bekommt einen rmFormula-Parameter (Default "mean") und mappt die Saetze
  auf die Engine-Form (best1RMFromSets ueberspringt Aufwaermen/nicht abgehakt/gescheitert);
  useExerciseDetail reicht settings.rm_formula durch. Damit fuellen sich Detail-Statistik
  ("6 Wochen") und die 1RM-Spalte der Verlaufsliste. tested_1rm bleibt als DB-Spalte erhalten
  (kein Datenverlust, spaeter fuer echte Tests nutzbar). Zwei Tests an die berechneten Werte
  angepasst (80x5 ~ 92.2, 6 Wochen +12 %). tsc, build und 183 Tests gruen.

- 2026-06-23 - Phase 7 (Yoga) abgeschlossen: live getestet und freigegeben. Yoga ist kein
  eigener Tab, sondern eine schnell abgehakte Einheit ueber die Zeile im Training-Tab; das
  Eintrag-Popup (drei Schnellwahl-Tage, Dauer-Stepper 80/5/5-180, Lila) schreibt eine
  erledigte Einheit, die sofort im Verlauf und als "Zuletzt" oben erscheint. Strikt V1 (keine
  freie Datumswahl, kein Notizfeld). Kernstueck: das neue generische Overlay-Primitive
  (components/ui/overlay.tsx) als Fundament fuer alle kuenftigen Dialoge - Desktop zentriert,
  Mobile von unten hereingleitendes Bodenblatt. Vor der Freigabe ein Bugfix: das Bodenblatt
  glitt am Handy nicht herein, sondern blendete nur ein. Ursache war eine falsche
  transition-property - in Tailwind v4 laeuft die Verschiebung ueber die eigene
  translate-Eigenschaft (Desktop ueber scale), nicht ueber transform; die Animationsliste
  nannte aber nur transform,opacity, sodass nur die Deckkraft animierte und die Position
  sprang. Korrigiert auf transform,translate,scale,opacity. tsc, build und 154 Tests gruen.

- 2026-06-22 - Phase 5 (Journey) abgeschlossen: live getestet und freigegeben (Seite mit
  aktiver-Journey-Karte, Periodisierungskurve, Phasen-Ablauf und dem Vorlagen-Waehler/
  Bearbeiten). Dritte echte Inhaltsseite, strikt Paritaet zu V1. Vor der Freigabe zwei
  Korrekturen: Bearbeiten-Knopf repariert (Waehler-Route entschachtelt, eigenstaendige
  Vollseite) und Periodisierungs-Block auf V1 angeglichen (kein Karten-Hintergrund/-Schatten/
  -Padding, Graph buendig) plus auf dem Handy lockerer (64 px statt 50 px je Woche). Das
  D3-Chart-Fundament (components/ui/chart.tsx) steht fuer Phase 8 bereit.

- 2026-06-22 - Bugfix Journey: der Bearbeiten-Knopf der aktiven-Journey-Karte tat sichtbar
  nichts. Ursache: die Vorlagen-Waehler-Route war im File-based-Routing als KIND von /journey
  verschachtelt (journey.waehlen.tsx -> parent journey), und journey.tsx rendert kein
  <Outlet/>; beim Navigieren blieb daher die Journey-Seite stehen. Fix: Datei zu
  src/routes/journey_.waehlen.tsx umbenannt (angehaengtes _ loest die Verschachtelung), der
  Waehler ist jetzt eine eigenstaendige Vollseite unter root - URL-Pfad bleibt /journey/waehlen,
  Route-ID /journey_/waehlen. Entspricht V1 (Picker ersetzt die ganze Ansicht). routeTree.gen.ts
  neu generiert. tsc, build und 154 Tests gruen.

- 2026-06-22 - Phase 5 (Journey) Schritt 2 gebaut (wartet auf Live-Test): die
  Periodisierungskurve, 1:1 aus V1 (charts.js drawJourneyChart). Neues, domaenenfreies
  Chart-Fundament src/components/ui/chart.tsx (D3-getrieben, damit spaetere Aufbau-Animationen
  per D3-Uebergaengen daraufsetzen koennen): useElementWidth (ResizeObserver) + ChartCanvas
  (scrollbarer Rahmen, misst die Breite, bestimmt die Zeichenbreite mit Mindest-Plotbreite,
  leert das SVG und ruft den draw-Rueckruf mit den Massen) sowie die geteilten Zeichen-Helfer
  smoothLine/smoothArea (Catmull-Rom), appendAreaGradient, appendEndpointRing, appendTooltip
  (dunkler Nub-Tooltip) und readToken; CHART_FONT/CHART_MONO. Phase 8 (Uebungs-Verlaufscharts)
  nutzt dieses Fundament mit. Reine, getestete Datenaufbereitung src/lib/periodization.ts
  (buildPeriodization: Volumen je Woche aus engine.volumeForWeek mit Satz-Rampe + Deload,
  Intensitaet aus der Wiederholungsspanne, Phasen-Baender, geklemmter jetzt-Index, Min/Max)
  mit 9 Tests. Journey-Komponente src/components/journey/PeriodizationChart.tsx zeichnet auf
  dem Fundament: zwei Kurven, Phasen-Baender + Labels, Deload-Orange (Stroke-Gradient +
  Wochennummern), jetzt-Ring + Tooltip. V1-Token-Mapping beachtet (accent->primary,
  accent-2->intensity, warn->warning). useJourneyView liefert das fertige Kurven-Modell mit;
  journey.tsx zeigt es als Block "Periodisierung" in einer Karte zwischen aktiver-Journey-Karte
  und Phasen-Ablauf (nur bei vorhandenen Wochen). Neue Abhaengigkeiten: d3-shape, d3-scale,
  d3-selection (+ Typen); landen per Route-Code-Splitting nur im Journey-Chunk. Validiert:
  tsc gruen, vite build gruen, 154 Tests gruen (9 neue). Offen: Live-Test.

- 2026-06-22 - Phase 5 (Journey) Schritt 1 live getestet und freigegeben. Journey-Seite
  (aktive-Journey-Karte, Phasen-Ablauf, Vorlagen-Waehler mit Anlegen/Umbenennen) auf der
  Deploy-Seite gegen V1 geprueft und fuer gut befunden, keine Schliff-Punkte. Das phasen-
  weite "Live getestet" bleibt offen, bis Schritt 2 (Periodisierungskurve) mitgetestet ist.
  Nur Doku, kein Code.

- 2026-06-22 - Phase 5 (Journey) Schritt 1 gebaut (wartet auf Live-Test): dritte echte
  Inhaltsseite, strikt Paritaet zu V1, einspaltig. Reine, getestete Aufbereitung
  src/lib/journey.ts (buildPhaseViews: Status vergangen/aktuell/kuenftig, Meta-Zeile,
  Detailzeilen Band/Satz-Rampe/Deload; totalWeeks) mit src/lib/__tests__/journey.test.ts.
  Anzeige-Modell ueber src/hooks/useJourneyView.ts (verdrahtet aktive Journey, Einheiten,
  Einstellungen, Vorlagen und die Engine-Platzierung aus Phase 0). Schreibaktionen in
  src/hooks/useJourneyActions.ts (Anlegen aus Vorlage: alte Journey deaktivieren, neue
  aktive + Phasen einfuegen; Umbenennen) und Vorlagen-Lesehook src/hooks/useJourneyTemplates.ts.
  Komponenten src/components/journey/ (ActiveJourneyCard, PhaseDot, PhaseList Raster+Liste,
  JourneyEmpty, TemplateCard, JourneyNameEdit). Seite src/routes/journey.tsx neu gebaut,
  Vorlagen-Waehler als Unterseite src/routes/journey.waehlen.tsx; Datumhelfer longDateYearDE
  in src/lib/format.ts. Validiert: tsc gruen, vite build gruen, 145 Tests gruen (7 neue).
  Periodisierungskurve und Live-Test stehen noch aus.
- 2026-06-22 - Phase 4 (Verlauf) gebaut, live getestet und freigegeben. Zweite echte
  Inhaltsseite.
  Reine, getestete Aufbereitungslogik src/lib/history.ts (kindOf/tagLabel/calLabel/
  sessionTitle, Detail-Aufbereitung strengthInfo/skillInfo, buildHistoryModel - 1:1 aus
  V1 history.js, auf das normalisierte Schema umgestellt: Abweichung = Satz mit
  adjusted=true statt entry.hadDeviation). Daten-Hook useSessionsDetailed (sessions +
  verschachtelte session_exercises + sets in einem Zug, nur status=done) und View-Model-
  Hook useHistory (komponiert mit useExercises/useTemplates/useSkills zu Liste + Kalender-
  Karte; Komponenten Supabase-frei). Erster Schreibzugriff einer Inhaltsseite:
  useDeleteSession (Mutations-Hook; loescht die sessions-Zeile, DB kaskadiert auf
  session_exercises/sets; invalidiert sessions + sessions-detailed). Zwei neue generische
  Primitives (src/components/ui): Calendar (Monatsgitter, Navigation, renderCell-Prop) und
  SegmentedControl (Liste/Kalender-Umschalter) - beide im Look-Kanon ergaenzt.
  Verlauf-spezifisch SessionLogCard (aufklappbar: Dauer + Zeile je Uebung, Loeschen mit
  Rueckfrage). Seite src/routes/verlauf.tsx: Desktop Kalender+Liste nebeneinander (1.35/1
  wie V1), Handy Umschalter. Format-Helfer longDateShort/fmtKg ergaenzt. Bewusst weggelassen:
  Statistik-Reihe und Charts (Paritaet zu V1; "erste Charts" aus Plan+Masterplan entfernt).
  10 neue Tests; Typecheck, Build und 138 Tests gruen. Nach der Freigabe ein kleiner
  Schliff: die Typ-Pillen (Kraft/Skill/Yoga/Abweichung) in den Listeneintraegen entfernt
  (der Farbpunkt kodiert den Typ; tagLabel-Feld aus dem Anzeigemodell raus, Funktion bleibt).

- 2026-06-22 - Phase 3 (Training - Uebersicht & Empfehlung) gebaut. Erste echte Inhaltsseite
  und erstes echtes Datenfundament. Reine Logik (getestet): Journey-Platzierung
  src/engine/journey.ts (isoWeekKey, phasePlacement, journeyPlacement, weekProgress - leitet
  Phase/Woche-in-Phase/Wochenfortschritt aus dem Verlauf ab, 1:1 aus V1) und Coach-Modul
  src/lib/coach.ts (lastByExercise, weekCounts, recoveryGreen, buildSuitabilityCtx,
  rankWorkouts - komponiert die Engine-Suitability, nimmt Zustand explizit herein, kein
  DB-/DOM-Bezug). Label-/Formathelfer src/lib/labels.ts (focusLabel) und src/lib/format.ts
  (todayISO, longDateDE, fmtScore mit deutschem Komma). Daten-Hooks (TanStack Query, je
  Entitaet, Supabase gekapselt, Komponenten Supabase-frei): useExercises, useTemplates,
  useSessions, useActiveJourney, useSkills/useSkillProgress, useSettings,
  useOwnedEquipmentKeys, useLatestBody, plus useUserId. View-Model-Hook useTrainingOverview
  buendelt alles zur anzeigefertigen Uebersicht (Datum, Journey-Streifen, Hero, weitere
  Workouts, aktive Skills, Yoga). Generische Primitives (src/components/ui, einmal bauen -
  ueberall nutzen): PageHeader, Section (Eyebrow), List + ListRow (das Arbeitspferd:
  Titel/Unterzeile/Anhaengsel/Pfeil, klickbar + disabled/excl), ScoreBadge (row/hero),
  ProgressDots, TwoColumn (1.6fr/1fr ab 960px). Trainingsspezifisch (src/components/training):
  JourneyStrip (Link zur Journey), RecommendedWorkout (Hero mit Akzent-Elevation). Seite
  src/routes/index.tsx setzt alles zusammen, mit Lade-/Fehler-/Leerzustaenden. "Session
  starten" und Yoga sind bis Phase 11/7 Platzhalter; Eignung/Erholung erscheinen als Anzeige
  (Score = Eignung, Ausschluss = Kater=3). Optik 1:1 aus V1 (jstrip/rec-hero/ks-list/ks-row).
  19 neue Tests (Journey 13, Coach 6); Typecheck, Build und 128 Tests gruen. Offen: Live-Test.

- 2026-06-22 - Plan praezisiert: Training und Live-Session sauber getrennt (nur Doku, kein
  Code). Vergleich gegen V1 (viewTraining in app.js vs. live.js): der Trainings-Screen ist
  in V1 eine reine Lese-/Navigationsseite (Journey-Streifen, Hero "Heute empfohlen" mit
  Score, weitere Workouts, aktive Skills, Yoga), die Live-Session (live.js, ~1200 Zeilen)
  ist der eigenstaendige, heikle Brocken (Sitzungsaufbau, Satz-Abhaken, Coach beim
  Durchfuehren, Timer/Audio/Vibration, Overlay/Bottom-Sheet mit Ziehgeste, Wake-Lock,
  fokus-erhaltende Inline-Updates, Start-/Ende-Dialoge, Offline-Aufzeichnen). Phase 3 in
  PLAN.md und Masterplan auf "Uebersicht & Empfehlung" geschaerft (Coach/Eignung nur als
  Anzeige, "Session starten" vorerst Platzhalter, Schaetzung auf ~1-2 Tage gesenkt),
  Phase 11 mit allem Heiklen explizit ausformuliert. Reihenfolge unveraendert (Live bleibt
  Phase 11).

- 2026-06-22 - Navigation/Shell auf V1-Look feinjustiert (Stil, keine Struktur-/Funktions-
  aenderung): Sidebar.tsx - Markenname versal mit Sperrung in V1-Grau (#5c5c61), Logo auf
  size-9 + rounded-control (11px), Nav-Eintraege rounded-xl (12px) statt rounded-2xl, Text
  15px, inaktiver Ink warmes Grau #6c685f (V1-Wert), Hover bg-primary/6 + Text dunkel, Aktiv
  bg-primary/10 + Akzenttext (V1-Toenungen), Zahnrad im Fuss rounded-control statt rund.
  BottomNav.tsx - deckend weiss (bg-card) statt halbtransparentem Weichzeichner, weicher
  oberer Schatten (0 -6px 20px -14px rgba(20,24,40,.25), V1-Wert), inaktive Icons hellgrau
  #b0b0b6 (V1-Wert), V1-naehere Polsterung. Struktur (sechs Punkte, Konto-Symbol, 960px)
  unveraendert. Typecheck, Build und 109 Tests gruen.

- 2026-06-22 - Phase 1 auf V1-Look umgesetzt: src/index.css komplett auf das V1-"Klar"-
  Theme umgestellt (feste Hex-Werte aus klar-tokens.css: Canvas #edeef1, Karte #fff,
  Akzent #0c9d77, Linie #e4e4e8, Feld-Fuellung #fafafa, plus die Marken-Nebenfarben
  good/warning/deviation/danger/intensity/skill/yoga 1:1). Radien als Tailwind-Utilities
  rounded-card 16px / rounded-control 11px / rounded-pill 20px; weiche Schatten als
  shadow-card/-hi/-pop (V1-Werte). Reines Hell-Theme: .dark-Block, @custom-variant dark
  und alle dark:-Klassen entfernt, ThemeProvider/ThemeToggle/useTheme samt src/lib/theme.tsx
  und src/components/ThemeToggle.tsx geloescht, ThemeProvider aus main.tsx und der
  Darstellungs-Umschalter aus /einstellungen entfernt (V1 hat keinen Dunkelmodus).
  Primitives auf V1-Optik zurueckgedreht: button.tsx (11px-Radius, 600er Schrift, kein
  Pillenrund/Druck-Versatz; default=gruen gefuellt, outline=weisse Karte mit Rahmen,
  ghost=Akzenttext, destructive=Rahmen+Danger), input.tsx (bg #fafafa, sichtbarer Rahmen,
  11px, Fokus faerbt Rahmen gruen), card.tsx (16px, shadow-card statt Luma-Elevation/Ring,
  Padding 16px). AccountButton von rounded-3xl auf rounded-control. Schrift: Sora (UI) statt
  Inter, Spline Sans Mono (Zahlen) bleibt; beide selbst gehostet (offline-fest). Neue
  Abhaengigkeit @fontsource-variable/sora, @fontsource-variable/inter entfernt.
  Typecheck, Build und 109 Tests gruen.

- 2026-06-22 - Kursaenderung Design (nur Doku, kein Code): Entscheidung revidiert - der
  globale Look folgt nicht mehr einer eigenen Luma-Interpretation, sondern wird moeglichst
  1:1 aus dem V1-"Klar"-Theme uebernommen (Tokens, Radien 16/11/20px, weiche Schatten,
  Schrift System-UI + Spline Sans Mono, Inter raus). shadcn/ui bleibt als Komponenten-
  Fundament, nur die Optik wird auf V1 zurueckgedreht. Phase 1 im Plan wieder geoeffnet,
  Masterplan (Abschnitte 1, 6, 8, Phase 1) entsprechend angepasst. Reihenfolge neu: erst
  Look auf V1, dann Navigation gegenpruefen, dann Phase 3. Der gebaute Luma-Stand bleibt
  vorerst live, bis Phase 1 neu umgesetzt ist.

- 2026-06-22 – Phase 2 (Navigation/Shell): AppShell um alle Seiten; gemeinsame Nav-Definition
  fuer Sidebar (Desktop ab 960px) und Bottom-Nav (Mobile, nur Icons); sechs Hauptpunkte,
  Einstellungen ueber Konto-Symbol; sieben Routen mit deutschen Slugs (/ = Training) als
  Platzhalter; Theme-Umschalter vorerst nur in den Einstellungen; provisorischer Startseiten-
  Inhalt nach /einstellungen umgezogen. Typecheck/Build/Tests gruen.

- 2026-06-22 - Phase 1 Feinschliff Geometrie (shadcn-Stil "Luma"): die echten Luma-Werte aus
  dem shadcn-Quellcode (radix-luma) uebernommen statt geschaetzt. Primitives umgestellt:
  src/components/ui/button.tsx (rounded-4xl/Pille, Zustaende, dezenter Druck-Effekt,
  Groessen xs/sm/default/lg/icon; Akzent bleibt bg-primary = #0c9d77), src/components/ui/
  input.tsx (rounded-3xl, gefuellt bg-input/50, transparenter Rahmen, Fokusring), neu
  src/components/ui/card.tsx (Card + Header/Title/Description/Action/Content/Footer;
  rounded-4xl/32px, shadow-md + ring-1 ring-foreground/5 als weiche Elevation, Padding ueber
  --card-spacing: 24px, size=sm 16px). Slot-Import auf das vorhandene @radix-ui/react-slot
  angepasst (kein zusaetzliches radix-ui-Metapaket); cn-font-heading entfernt (Inter als
  einzige UI-Schrift). Radius-Stufen rounded-3xl/4xl und --card-spacing kommen aus den
  Tailwind-v4-Defaults und sind im Build verifiziert (32px/24px/24px). Startseite: Status,
  Umschalter und Markenfarben-Streifen vorlaeufig in eine echte Luma-Karte gefasst, damit der
  Look live testbar ist. Typecheck, Build und 109 Tests gruen.

- 2026-06-22 - Phase 1 Design-System (globaler Look): src/index.css auf das abgestimmte
  Token-Set umgestellt (warmes Stone-Grau, weisser Hintergrund, Radius 0.625rem/10px, Chart-
  Ramp, vollstaendig hell und dunkel). Akzent bewusst auf Markengruen #0c9d77 gesetzt (ersetzt
  das Gruen aus dem Token-Paste), Gefahr auf #ef5b5b. Markenfarben als eigene Tokens mit fester
  Bedeutung ergaenzt und in @theme inline als Tailwind-Utilities verfuegbar gemacht: good,
  warning, deviation, danger, intensity (Teal), skill (Blau), yoga (Lila), je mit Foreground-
  Ton (im Dunkelmodus heller). Schrift Inter (UI) und Spline Sans Mono (Zahlen) selbst gehostet
  ueber @fontsource-variable (offline-fest), in @theme inline als --font-sans/--font-mono
  gesetzt, body auf font-sans. Umschaltbarer Dunkelmodus: src/lib/theme.tsx (ThemeProvider +
  useTheme, hell/dunkel/system, in localStorage gemerkt, reagiert auf Systemwechsel, setzt die
  dark-Klasse am html-Element); ThemeProvider aussen in main.tsx. src/components/ThemeToggle.tsx
  schaltet hell -> dunkel -> system durch (Lucide-Icons). Vorlaeufig auf der Startseite, dazu ein
  Markenfarben-Streifen zum Sichtpruefen; beides wandert mit Navigation/Einstellungen weiter.
  Neue Abhaengigkeiten: @fontsource-variable/inter, @fontsource-variable/spline-sans-mono.
  Typecheck, Build und Tests gruen.

- 2026-06-22 - V1-Import gebaut (Migrationsskript): src/lib/v1import.ts uebersetzt den kompletten
  V1-Blob (verschachtelt, camelCase) in die 23 normalisierten Tabellen (snake_case). analysiereV1
  parst und zaehlt je Themenblock fuer eine Vorschau (schreibt nichts); importiereV1 vergibt alle
  id-Werte client-seitig (crypto.randomUUID) und schluesselt jede V1-Text-ID auf die neue UUID um,
  in Fremdschluessel-sicherer Reihenfolge (Inventar -> Uebungen + feine Muskel-Map -> Vorlagen ->
  Journeys + Phasen -> Einheiten + Einheit-Uebungen + Saetze -> Skill-Fortschritt -> Body-Log ->
  Messungen). Drei Einheit-Typen behandelt: Kraft (entries -> session_exercises, warmup + work ->
  sets), Yoga (minutes, keine Saetze) und Skill (skillWork -> session_exercises ohne Katalogbezug,
  value/met -> sets). Skill-Fortschritt wird ueber den Skill-Schluessel an die in Schritt 2
  geseedeten Skills gehaengt; ohne Treffer wird der Eintrag uebersprungen und gemeldet. Defensive
  Lese-Helfer tolerieren fehlende/fremde Felder und beide Schreibweisen (camelCase/snake_case);
  Invariante \"genau eine aktive Journey\" wird beim Mappen durchgesetzt. UI src/components/V1Import.tsx
  auf der Startseite: JSON-Datei waehlen, Vorschau (Zeilenzahl je Block) pruefen, bestaetigen;
  bereitsImportiert() sperrt den Knopf, sobald schon Uebungen/Einheiten vorhanden sind, gegen
  versehentlichen Doppel-Import. 8 Unit-Tests fuer die Vorschau-Zaehlung (src/lib/__tests__/
  v1import.test.ts). Typecheck, Build und 109 Tests gruen.

- 2026-06-22 – Definitionen-Seed + Datenstand: die kuratierten Journey-Vorlagen (7, mit
  Phasen) und Skill-Progressionen (2: Strict Pull-Up 10 Phasen, Pushup 6 Phasen, jeweils
  mit Phasen-Uebungen und Equipment-Toren) als getypte Code-Daten unter src/seed/definitions.ts
  (1:1 aus V1). Idempotenter Runner src/lib/seed.ts (ensureDefinitionsSeeded) legt sie beim
  ersten Start mit der user_id an; laeuft nur, wenn noch keine Skills existieren. Inserts
  ueber die Zod-Insert-Typen, IDs werden per key/Position verknuepft. Skill-Phasen-Uebungen
  bekommen exercise_id vorerst null (Link zum Katalog folgt nach dem Import in den Feature-
  Phasen). Schemas um die abgeleiteten Typen Focus/Metric ergaenzt. Temporaere Datenstand-
  Anzeige src/components/Datenstand.tsx auf der Startseite: seedet beim ersten Aufruf und
  zeigt die Zeilenzahl je der 23 Tabellen, damit der Stand ohne Code-Lesen pruefbar ist.
  Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – Schlichter Login gebaut (Voraussetzung fuer alle RLS-geschuetzten
  Schreibzugriffe): Auth-Schicht src/lib/auth.tsx (AuthProvider + useAuth) ueber Supabase
  Auth mit Sitzungsverfolgung (getSession + onAuthStateChange), Anmelden
  (signInWithPassword), Konto anlegen (signUp, erkennt ausstehende E-Mail-Bestaetigung)
  und Abmelden; bekannte Fehlertexte ins Deutsche uebersetzt. Login-Bildschirm
  src/components/LoginScreen.tsx (E-Mail/Passwort, Umschalten Anmelden/Registrieren,
  Fehler-/Hinweiszeile). AuthGate src/components/AuthGate.tsx sitzt in main.tsx vor dem
  RouterProvider und laesst die App erst nach Anmeldung durch. Wiederverwendbares
  Input-Primitive src/components/ui/input.tsx. Startseite zeigt angemeldete E-Mail und
  Abmelden-Knopf. Bewusst eine Minimalversion; das volle Konto-/Sync-Panel bleibt Phase 10.
  Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – Offline-Grundgeruest gelegt (Phase 0 abgeschlossen): zentraler Query-Client
  unter src/lib/queryClient.ts (gcTime 7 Tage, staleTime 30 s, retry 1). Persistenter Cache
  in IndexedDB ueber src/lib/offline.ts (Async-Storage-Persister auf idb-keyval, Cache-Buster
  und Max-Alter 7 Tage). main.tsx auf PersistQueryClientProvider umgestellt; nach dem
  Wiederherstellen werden pausierte Mutationen fortgesetzt (resumePausedMutations). Damit
  ueberlebt der Lese-Cache einen App-Neustart, und ohne Netz angefallene Schreibvorgaenge
  werden bei Reconnect bzw. Neustart nachgeschickt – als Geruest; die echten Entitaets-Hooks
  folgen in den Feature-Phasen. Bewusst nicht dabei: App-Huelle offline laden (PWA, Phase 13)
  und sichtbare Offline-Anzeige (Phase 1/2). Neue Abhaengigkeiten:
  @tanstack/react-query-persist-client, @tanstack/query-async-storage-persister (beide 5.101.0),
  idb-keyval 6.2.5. Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – UI-Fundament aufgesetzt: TanStack Router file-based (src/routes mit
  __root + index, automatisch generierter Routenbaum, Router-Devtools nur im Dev,
  basepath an Vite-base gekoppelt fuer Pages). Tailwind v4 ueber @tailwindcss/vite,
  shadcn/ui mit neutraler Standardbasis (components.json, cn-Helfer, Button-Primitive,
  @-Pfadalias) – der eigentliche Look folgt bewusst erst in Phase 1. Startseite ist erste
  Route; Health-Check aus App.tsx dorthin ueberfuehrt und auf Tailwind/Button umgestellt,
  App.tsx entfernt. Typecheck, Build und 101 Tests gruen.

- 2026-06-22 – Engine nach TypeScript portiert: reine Rechenlogik aus V1 als modulare
  Bausteine (1RM, Plate-Loader, Aufwaerm-Generator, Doppelprogression, Phasenwechsel,
  Suitability, Volumen/Deload, Erholungs-Check, Skills) unter src/engine/. 88 Vitest-Tests
  gruen; aus V1 portierte Tests belegen Paritaet. Typecheck und Build gruen.
- 2026-06-22 – Zod-Schemas der Entitaeten gebaut: alle 23 Tabellen 1:1 zur Datenbank
  gespiegelt (snake_case-Spaltennamen, Nullbarkeit, CHECK-Listen als Enums), je eine
  Lese-Form (Row) und eine Schreib-Form (Insert ohne id/created_at, Defaults optional).
  jsonb-Wertobjekte praezisiert (settings.timers/recovery_windows fest; body, general_warmup,
  suggestion, skill_progress.log vorlaeufig als lockere Objekte). Typen via z.infer
  abgeleitet. Abgelegt unter src/schemas/, gruppiert wie die DB-Abschnitte, mit Barrel.
  13 Schema-Tests gruen; Typecheck und Build gruen.
