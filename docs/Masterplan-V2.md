# Kraftschmiede V2 – Masterplan (Rewrite mit relationaler Datenbank)

Status: Arbeitsdokument zur Diskussion. Block fuer Block verfeinerbar.

---

## 1. Ziel und Motivation

Kompletter Neubau der App als moderne Web-App – neues Repo, neue Supabase-Datenbank,
neuer Frontend-Stack. Funktional gleichwertig zur jetzigen Kraftschmiede, optisch
moeglichst nah an V1: der globale Look (Farben, Schriften, Radien, Schatten, Spacing)
wird 1:1 vom V1-"Klar"-Theme uebernommen, nicht neu erfunden. Einzelne Bloecke duerfen
in der Funktion neu durchdacht werden, aber das Aussehen bleibt das von V1.

Treiber (vom Nutzer benannt):
- Wiederverwendbare Komponenten statt page-to-page-Duplikation (Pop-ups, Tabellen).
- Bessere Wartbarkeit und Verstaendlichkeit.
- Naeher an aktuellen Web-App-Standards.
- Lernerfahrung: eine Web-App mit KI bauen.
- Kein Zeitdruck – die alte App laeuft produktiv weiter.

Das ist der ideale Modus: V2 entsteht als entspanntes Parallelprojekt ohne
Migrationsdruck. V1 bleibt bis zum bewussten Umschalten in Betrieb.

---

## 2. Die zentrale Aenderung gegenueber V1

**Das Blob-Modell wird aufgegeben.** Statt eines einzigen jsonb-Objekts pro Nutzer
kommt eine normalisierte Datenbank mit echten Tabellen und Beziehungen.

Konsequenzen:
- Dies ist **kein reines Frontend-Refactoring** mehr. Schema, RLS und eine einmalige
  Datenmigration kommen als eigene, gewichtige Bloecke dazu.
- TanStack Query wird jetzt passend: echte Queries/Mutations je Entitaet,
  granulares Caching und Invalidierung.
- Das last-write-wins-Problem des Blob-Sync entfaellt weitgehend – Aenderungen
  betreffen einzelne Zeilen, nicht den ganzen Zustand.
- Pragmatischer Mittelweg: Alle Entitaeten (Definitionen wie Uebungen/Vorlagen/Skills
  und Nutzerdaten wie Sessions/Saetze/Journeys) werden echte Relationen. Kleine,
  attributarme Wertobjekte (InBody-Composition,
  Timer-Einstellungen) duerfen als jsonb-Spalte in ihrer Tabelle bleiben – das ist
  sauber und kein verkapptes Blob-Modell.

---

## 3. Getroffene strategische Entscheidungen

### 3.1 Offline-Faehigkeit – ENTSCHIEDEN: Offline-first mit Sync

Im Gym soll ohne Netz trainiert und aufgezeichnet werden; spaeter synchronisiert die
App in die Datenbank. Das ist Offline-first mit Sync: lokale Persistenz (IndexedDB /
persistenter TanStack-Query-Cache) plus Mutations-Queue, die bei Verbindung hochlaedt.

Pragmatischer Zuschnitt: Die Live-Session muss voll offline laufen (dort wird
aufgezeichnet). Beim Rest der App reicht ein offline-Lesecache. Das ist der groesste
einzelne Aufwandstreiber des Projekts und der Grund, warum die Schaetzung am oberen
Rand der Spanne liegt.

### 3.2 Definitionen – ENTSCHIEDEN: alles in die Datenbank

Uebungen, Vorlagen, Skill- und Journey-Definitionen liegen in der Datenbank, nicht im
Code. Damit ist die App voll datengetrieben: alle Daten kommen ueber dasselbe
Zugriffsmuster (Query-Hooks), keine Mischung aus Code-Imports und DB-Abfragen. Das
dient der Wartbarkeit.

Annahme: Die Definitionen liegen pro Nutzer (`user_id`/RLS) und werden beim ersten Start
aus einem Seed befuellt; damit sind sie spaeter editierbar, falls gewuenscht.

Kosten: mehr Schema, vor allem bei den Skills (verschachtelt: Skill -> Phasen ->
Uebungen + Equipment-Voraussetzungen) – mehrere verbundene Tabellen. Siehe Abschnitt 5.

### 3.3 Skill-Definitionen

In V1 sind die SKILLS-Definitionen Code, nur der Fortschritt liegt in Daten. Das ist
ein gutes Muster und sollte so bleiben: Definitionen im Code, `skill_progress` in der DB.

---

## 4. Tech-Stack

- Frontend: React 19
- Build: Vite
- Sprache: TypeScript (strict, kein `any`, Interfaces fuer alle Strukturen)
- Routing: TanStack Router (file-based, `src/routes`)
- Server-State: TanStack Query (v5+)
- Client-State: minimal halten; URL-State oder TanStack Store nur wo noetig
- Styling: Tailwind CSS
- UI-Komponenten: shadcn/ui (Primitives in `src/components/ui`)
- Icons: Lucide
- Validierung: Zod (Formulare, API-Antworten, Schemas)
- Datenbank: Supabase (Postgres), RLS pro Tabelle

---

## 5. Datenbank-Schema (umgesetzt)

Stand: umgesetzt als `supabase/migrations/0001_initial_schema.sql` und gegen das echte
V1-Datenmodell (Blob in `data.js`/`live.js`/`engine.js`) abgeglichen. 23 Tabellen,
jede mit `user_id` und Row Level Security (vier Policies select/insert/update/delete
strikt auf `auth.uid() = user_id`), Zugriff fuer Rolle `authenticated` freigegeben.
Definitionen werden beim ersten Start pro Nutzer aus einem Seed befuellt. Tabellen mit
stabilem Seed-Identifikator haben ein `key`-Feld (`unique(user_id, key)`) fuer die
Migrations-Umschluesselung; Fremdschluessel nutzen UUIDs. Kleine, attributarme
Wertobjekte bleiben bewusst als `jsonb` (Befinden-Snapshot, Aufwaermen, Coach-Vorschlag,
Recovery-Fenster, Timer).

### 5.1 Inventar

- **inventory_bars** – Stangen: key, name, weight, is_default, position
- **inventory_plates** – Scheiben: je Zeile ein verfuegbares Gewicht (kein Stueck-Zaehler,
  wie V1; der Plate-Loader rechnet ohne Limit)
- **inventory_kettlebells** – Kettlebells: je Zeile ein Gewicht
- **inventory_equipment** – Skill-Equipment-Tor: key, label, active (Klimmzugstange,
  Baender, Ringe ...)

### 5.2 Definitionen (Stammdaten in der DB, per Seed)

- **exercises** – key, name, category (barbell/core/bodyweight), profile, kind, equipment,
  bar_id (FK), description, metric (reps/duration bei Koerpergewicht), muscle_groups
  (grobe Tags als text[]), rep_range_min/max, target_score, work_weight, recovery_hours,
  rm/rm_as_of/rm_stale (zwischengespeichertes 1RM fuer den Coach), active, position
- **exercise_muscles** – feine Regionen-Map: exercise_id (FK), region_id (Code-/SVG-Region),
  kategorie (primaer/sekundaer/stabilisierend)
- **templates** – key, name, image, position
- **template_exercises** – template_id (FK), exercise_id (FK), role (primary/secondary/core),
  position
- **journey_templates** – key, name, tagline, for_whom, summary, position
- **journey_template_phases** – journey_template_id (FK), name, focus, weeks,
  sets_start, sets_end, deload_week (nullable), rep_target_min/max, position
- **skills** – key, name, category, image, position
- **skill_phases** – skill_id (FK), label, description, consecutive_sessions
  (aufeinanderfolgende Erfolge bis Aufstieg), position
- **skill_phase_exercises** – skill_phase_id (FK), name, metric (reps/duration), sets,
  target, tempo, exercise_id (FK, optional zur Katalog-Uebung), position
- **skill_phase_equipment** – skill_phase_id (FK), equipment_key (Voraussetzung)

Hinweis zu Entscheidung 3.2/3.3: Skill-Definitionen liegen als Seed in DB-Tabellen
(einheitlicher Zugriff ueber Query-Hooks, spaeter editierbar); der Fortschritt steht
separat in `skill_progress`.

### 5.3 Nutzerzustand

- **journeys** – name, active, status (active/archived), source_template_id (FK), start_date,
  created_at. Invariante: Partial Unique Index `journeys_one_active_per_user` auf
  `user_id where active` -> genau eine aktive Journey pro Nutzer
- **phases** – journey_id (FK), name, focus, weeks, sets_start, sets_end, deload_week
  (nullable), rep_target_min/max, position
- **sessions** – date, type (strength/yoga/skill), status (live/done), journey_id,
  phase_id, template_id, skill_id (alle FK, nullable), week (eingefrorene Journey-Woche),
  duration_sec, minutes (yoga), notes, started_at, body (jsonb Befinden-Snapshot),
  general_warmup (jsonb), skill_phase, skill_result (completed/missed/skipped)
- **session_exercises** – Uebung-in-Einheit (V1 "entry"): session_id (FK), exercise_id
  (FK, nullable), name, bar_id (FK), metric, tested_1rm, suggestion (jsonb), position
- **sets** – session_exercise_id (FK), kind (warmup/work), position, reps, weight,
  duration_sec, score, failed, done, target_reps, target_weight, target_score, adjusted,
  adjust_note, met (Skill: Ziel erreicht)
- **skill_progress** – skill_id (FK), active, current_phase, counter (Konsekutiv-Zaehler,
  Reset bei Fehlversuch), mastered, log (jsonb), `unique(user_id, skill_id)`
- **body_log** – Tages-Befinden: date, legs, upper_body, overall (Muskelkater 0..3),
  readiness, pain_flag, pain_note, notes, `unique(user_id, date)`
- **composition** – InBody-/BIA-Messung: date, weight, body_fat_kg, body_fat_pct,
  skeletal_muscle_kg, tbw_kg, phase_angle, visceral_fat, `unique(user_id, date)`
- **settings** – user_id (PK), rm_formula, weekly_frequency_target, weight_step, unit,
  recovery_windows (jsonb), timers (jsonb)

Bewusste Abweichungen von V1: das Blob-Backup (`app_state_backups`) entfaellt; an seine
Stelle tritt JSON-Export/Import (Phase 12). Der Scheiben-Bestandszaehler aus dem fruehen
Entwurf wurde verworfen (V1 kennt keinen).

---

## 6. Architektur-Leitplanken

- **Engine bleibt rein.** `engine.js` wird nach TypeScript portiert (1RM, Plate-Loader,
  Aufwaerm-Generator, Doppelprogression, Suitability, Volumen/Deload, Skill-Advice) –
  mitsamt Unit-Tests. Da sie reine Funktionen ist (Daten rein, Ergebnis raus), bleibt
  sie vom Schemawechsel unberuehrt. Nur die datenbeschaffende Glue-/Coach-Schicht aendert
  sich.
- **Coach als eigenes, testbares Modul** (`coach.ts`): nimmt Zustand explizit herein,
  gibt Entscheidungen heraus – gleiche Form wie die Engine. Kein DOM-Bezug.
- **Datenzugriff gekapselt** in Query-/Mutation-Hooks je Entitaet (z. B.
  `useSessions`, `useExercises`). Komponenten kennen kein Supabase direkt.
- **Wiederverwendbare Primitives** in `src/components/ui` (Modal, DataTable, Sheet,
  MuscleMap, Chart). Genau das Ziel: einmal bauen, ueberall nutzen.
- **shadcn/ui als Fundament, nicht als Optik.** shadcn liefert die unsichtbare Mechanik
  (Fokus-Fang, Schliessen-Verhalten, Tastatur, Barrierefreiheit, iOS-Verhalten) als
  eigenen, ins Projekt kopierten Code – kein mitgeschlepptes Paket. Das Aussehen kommt
  ausschliesslich aus den V1-Tokens, die wir drueberziehen. shadcn ist farb- und
  formneutral; behalten und V1-Look fahren ist kein Widerspruch, sondern der vorgesehene
  Weg. Es spart genau die ueber Monate gewachsenen Kanten (Dialog, Sheet, Tabelle), die
  unter Abschnitt 11 als Aufwandstreiber stehen.
- **Zod-Schemas** als Quelle der Wahrheit fuer Datenformen; TypeScript-Typen daraus
  abgeleitet.
- **Domaenensprache deutsch** (Uebung, Journey, Session, Vorlage, Phase), Code-/
  Architekturbegriffe englisch.

---

## 7. Migration des Bestands (kritischer Einmal-Schritt)

Der jetzige Bestand muss verlustfrei in die neuen Tabellen ueberfuehrt werden. Zwei
Quellen: die Definitionen stehen im V1-Code (Seed), die Nutzerdaten im jsonb-Blob.

- Definitionen aus dem V1-Code (Uebungen, Vorlagen, Skills, Journey-Vorlagen) als
  DB-Seed ueberfuehren.
- Einmaliges Skript fuer die Nutzerdaten: Blob auslesen, in normalisierte Zeilen
  zerlegen, in die neue DB schreiben. Referenzen auf Uebungen/Vorlagen/Skills auf die
  neuen DB-IDs umschluesseln (Mapping ueber die stabilen V1-Keys).
- Reihenfolge wegen Foreign Keys: erst Definitionen + inventory, dann journeys/phases,
  dann sessions/sets, dann skill_progress/body_log/settings.
- Validierung: Anzahl Sessions, Saetze, Journeys vorher/nachher abgleichen; Stichproben
  visuell vergleichen.
- Sicher fahren: alte App und Daten bleiben unangetastet; Migration laeuft in die neue
  DB. Erst nach erfolgreichem Abgleich wird umgeschaltet.

---

## 8. Arbeitsweise im Projekt (Theme zuerst, dann Block fuer Block)

Der Bau laeuft in zwei Stufen, Konzept vor Code:

1. **Globaler Look zuerst – aus V1 uebernommen.** Bevor einzelne Bloecke entstehen, steht
   die durchgaengige Gestaltung. Sie wird nicht neu erfunden, sondern moeglichst 1:1 aus
   dem V1-"Klar"-Theme uebernommen: Farben (Tokens `--bg`/`--panel`/`--accent` etc.),
   Schriften (System-UI fuer die Oberflaeche, Spline Sans Mono fuer Zahlen – Sora ist in
   V1 abgewaehlt), Radien (Karten 16px, Bedienelemente 11px, Pillen 20px), weiche Schatten
   statt harter Rahmen, Spacing. Dieser globale Look gilt fuer alle Bloecke. Quelle der
   Wahrheit sind die V1-Dateien `klar-tokens.css` und `klar-app.css` im Referenz-Repo.

2. **Dann Block fuer Block.** Jeder Block (eine Seite oder ein Teilbereich einer Seite)
   wird vor der Implementierung gemeinsam durchgesprochen:
   - **Funktionalitaet:** Was soll der Block koennen? Macht das (noch) Sinn? Was kommt
     evtl. dazu, was faellt weg? Brainstorming ist ausdruecklich Teil des Schritts.
   - **Elemente:** Welche Bausteine enthaelt der Block, was duerfen sie und was nicht.
   - **Layout:** Aufteilung (z. B. ganze Breite oder dreigeteilt), Anordnung, Verhalten
     auf Mobile und Desktop.
   - **Komponentenschnitt:** Welche wiederverwendbaren Komponenten entstehen – gruendlich
     durchdacht, bevor implementiert wird, weil Wiederverwendbarkeit das Kernziel ist.

   Erst wenn Konsens besteht, wird gebaut.

Die Navigation und Seitenstruktur gehen wir global durch; die einzelnen Bloecke
innerhalb einer Seite danach jeweils einzeln in diesem Modus. Der Phasenplan unten gibt
die Reihenfolge vor, der Modus oben das Vorgehen je Block.

---

## 9. Phasenplan

Schaetzung in aktiven Arbeitstagen (Tage mit Bauen und Testen). Kalenderzeit ist
laenger wegen Feedback-Schleifen.

### Phase 0 – Schema und Fundament
- Supabase-Projekt anlegen, Schema/Tabellen/RLS aus Abschnitt 5 umsetzen.
- Vite + TS + TanStack Router + Tailwind + shadcn aufsetzen, Supabase-Client,
  TanStack-Query-Setup.
- Engine nach TS portieren samt Tests. Zod-Schemas fuer die Entitaeten.
- Offline-Entscheidung (3.1) umsetzen bzw. Grundgeruest legen.
- Schaetzung: ~5–8 Tage. Wichtigster Block.

### Phase 1 – Design-System
- V1-"Klar"-Theme uebernehmen: Tokens (`--accent #0c9d77` etc.) 1:1 aus `klar-tokens.css`
  als Tailwind-Theme, shadcn-Primitives auf die V1-Optik trimmen (Karte 16px + weicher
  Schatten, Bedienelemente 11px, Pillen 20px), System-UI als Oberflaechenschrift,
  Spline Sans Mono fuer Zahlen. ~1–2 Tage.

### Phase 2 – Navigation / Shell
- Sidebar + Bottom-Nav, Routing-Geruest. ~1 Tag.

### Phase 3 – Training (Uebersicht & Empfehlung)
- Reine Lese-/Navigationsseite: Journey-Streifen, Hero "Heute empfohlen" (Score), weitere
  Workouts, aktive Skills, Yoga-Einstieg. Eignung/Erholung + Coach-Empfehlung nur als
  Anzeige (Engine/Coach rechnen bereits aus Phase 0). "Session starten" fuehrt vorerst zu
  einem Platzhalter; die gefuehrte Durchfuehrung ist bewusst Phase 11. ~1–2 Tage.

### Phase 4 – Verlauf
- Kalender + Liste + aufklappbare Session-Zusammenfassung + Loeschen. Keine Charts (V1
  hat im Verlauf keine). ~1–2 Tage.

### Phase 5 – Journey
- Phasen, Wochen-Platzierung, Periodisierungschart. ~2 Tage.

### Phase 6 – Skills
- Manager, Phasen, Equipment-Tor, Konsekutiv-Logik. ~1–2 Tage.

### Phase 7 – Yoga
- Karte + Eintrag-Popup. ~0,5–1 Tag.

### Phase 8 – Uebungen (inkl. Muscle-Map)
- Liste, Detailseite, generische MuscleMap-Komponente. ~2–3 Tage.

### Phase 9 – Koerper
- Body-Log, InBody-Composition, Verlaufscharts. ~1–2 Tage.

### Phase 10 – Einstellungen
- Inventar, Plate-Loader, Settings, Sync-/Konto-Panel. ~1–2 Tage.

### Phase 11 – Live-Session (Kraft + Skill)
- Die gefuehrte Durchfuehrung samt aller schwierigen Mechanik, bewusst von Phase 3
  getrennt: Sitzungsaufbau aus Vorlage + Coach (Arbeits-/Aufwaermsaetze, Plate-Loader),
  Satz-Abhaken, Coach beim Durchfuehren (Aufwaermen/Vorschlaege/Progression), Pausen-/
  Rest-Timer, Audio/Vibration, Overlay (Desktop) / Bottom-Sheet (Mobile) mit Ziehgeste +
  Wake-Lock, fokus-erhaltende Inline-Updates, Start-/Ende-Dialoge, volles Offline-
  Aufzeichnen. Dickster Brocken, plus Zusammenspiel mit der Offline-Strategie. ~4–6 Tage.

### Phase 12 – Migration + Import/Export
- Migrationsskript (Abschnitt 7), JSON-Import/Export, Abgleich alt/neu. ~2–4 Tage.

### Phase 13 – Politur
- PWA, iOS-Fixes, Bugfixing, Paritaetsdurchlauf gegen V1. ~3–5 Tage.

---

## 10. Gesamtschaetzung

Summe der aktiven Tage: grob **30–50 Tage**. Ueber Kalenderzeit mit Testen und
Iteration realistisch **8–14 Wochen** bei regelmaessiger Arbeit.

Die Spanne haengt vor allem an zwei Bloecken: der Offline-Strategie (Phase 0/11) und
der Migration (Phase 12). Faellt die Offline-Entscheidung auf „online-first", liegst
du am unteren Rand; mit vollem Offline-Sync am oberen.

---

## 11. Risiken und bewusste Trade-offs

- **Paritaet kostet.** Eine reife App hat ueber Monate gewachsene Kanten (iOS-Fixes,
  Deload-Logik, Migrations-Selbstheilung, Score-Mapping). Die alle neu nachzubauen ist
  der Teil, der Schaetzungen sprengt.
- **Offline ist der Knackpunkt.** Der Wechsel vom lokalen Blob zur Server-DB kostet die
  triviale Offline-Faehigkeit. Bewusst entscheiden, nicht uebersehen.
- **Migration muss verlustfrei sein.** Kein produktives Umschalten ohne erfolgreichen
  Abgleich.
- **Gegenmittel Zeitdruck: keiner.** V1 laeuft weiter. Jede Phase ist ein eigener,
  abbrechbarer Schritt. Schon Phase 0 + ein kleiner Block zeigt, ob der Rhythmus passt.

---

## 12. Bewusst nicht Teil dieser Planung

- Kein Big-Bang-Umschalten – V2 entsteht parallel, V1 bleibt bis zur bewussten Abloesung.
- Keine neuen Features ueber V1 hinaus in der ersten Runde (Paritaet zuerst).
- Keine Aenderung an der laufenden V1-App.
