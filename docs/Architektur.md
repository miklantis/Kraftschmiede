# Kraftschmiede – Architektur & Schema

Referenzdokument fuer den laufenden Betrieb: Datenbank-Schema, Architektur-Leitplanken
und die getroffenen strategischen Entscheidungen. Beschreibt den umgesetzten Stand der
App, nicht einen Bauplan.

---

## 1. Ueberblick

Kraftschmiede ist eine moderne Web-App: React 19, TypeScript, Vite, TanStack Router/Query,
Tailwind, shadcn/ui, Supabase mit normalisierter relationaler Datenbank. Installierbar als
PWA mit Offline-Huelle und bewusstem Update-Hinweis.

Leitprinzipien:
- Wiederverwendbare Komponenten statt Seiten-Duplikation (Pop-ups, Tabellen, Charts).
- Reine, testbare Engine- und Coach-Logik ohne DOM-Bezug.
- Datenzugriff in Hooks gekapselt; Komponenten kennen Supabase nicht direkt.
- Domaenensprache deutsch (Uebung, Journey, Session, Vorlage, Phase, Coach),
  Code-/Architekturbegriffe englisch.

---

## 2. Getroffene strategische Entscheidungen

### 2.1 Offline-Faehigkeit – ENTSCHIEDEN: Offline-first mit Sync

Im Gym soll ohne Netz trainiert und aufgezeichnet werden; spaeter synchronisiert die
App in die Datenbank. Das ist Offline-first mit Sync: lokale Persistenz (IndexedDB /
persistenter TanStack-Query-Cache) plus Mutations-Queue, die bei Verbindung hochlaedt.

Pragmatischer Zuschnitt: Die Live-Session muss voll offline laufen (dort wird
aufgezeichnet). Beim Rest der App reicht ein offline-Lesecache. Das ist der groesste
einzelne Aufwandstreiber des Projekts und der Grund, warum die Schaetzung am oberen
Rand der Spanne liegt.

### 2.2 Definitionen – ENTSCHIEDEN: alles in die Datenbank

Uebungen, Vorlagen, Skill- und Journey-Definitionen liegen in der Datenbank, nicht im
Code. Damit ist die App voll datengetrieben: alle Daten kommen ueber dasselbe
Zugriffsmuster (Query-Hooks), keine Mischung aus Code-Imports und DB-Abfragen. Das
dient der Wartbarkeit.

Annahme: Die Definitionen liegen pro Nutzer (`user_id`/RLS) und werden beim ersten Start
aus einem Seed befuellt; damit sind sie spaeter editierbar, falls gewuenscht.

Kosten: mehr Schema, vor allem bei den Skills (verschachtelt: Skill -> Phasen ->
Uebungen + Equipment-Voraussetzungen) – mehrere verbundene Tabellen. Siehe Abschnitt 5.

### 2.3 Skill-Definitionen

Skill-Definitionen liegen im Code, der Fortschritt in der DB: Definitionen als Seed-Daten,
`skill_progress` als Tabelle.

---

## 3. Tech-Stack

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

## 4. Datenbank-Schema (umgesetzt)

Umgesetzt als `supabase/migrations/0001_initial_schema.sql`. 23 Tabellen,
jede mit `user_id` und Row Level Security (vier Policies select/insert/update/delete
strikt auf `auth.uid() = user_id`), Zugriff fuer Rolle `authenticated` freigegeben.
Definitionen werden beim ersten Start pro Nutzer aus einem Seed befuellt. Tabellen mit
stabilem Seed-Identifikator haben ein `key`-Feld (`unique(user_id, key)`); Fremdschluessel
nutzen UUIDs. Kleine, attributarme
Wertobjekte bleiben bewusst als `jsonb` (Befinden-Snapshot, Aufwaermen, Coach-Vorschlag,
Recovery-Fenster, Timer).

### 4.1 Inventar

- **inventory_bars** – Stangen: key, name, weight, is_default, position
- **inventory_plates** – Scheiben: je Zeile ein verfuegbares Gewicht (kein Stueck-Zaehler;
  der Plate-Loader rechnet ohne Limit)
- **inventory_kettlebells** – Kettlebells: je Zeile ein Gewicht
- **inventory_equipment** – Skill-Equipment-Tor: key, label, active (Klimmzugstange,
  Baender, Ringe ...)

### 4.2 Definitionen (Stammdaten in der DB, per Seed)

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

### 4.3 Nutzerzustand

- **journeys** – name, active, status (active/archived), source_template_id (FK), start_date,
  created_at. Invariante: Partial Unique Index `journeys_one_active_per_user` auf
  `user_id where active` -> genau eine aktive Journey pro Nutzer
- **phases** – journey_id (FK), name, focus, weeks, sets_start, sets_end, deload_week
  (nullable), rep_target_min/max, position
- **sessions** – date, type (strength/yoga/skill), status (live/done), journey_id,
  phase_id, template_id, skill_id (alle FK, nullable), week (eingefrorene Journey-Woche),
  duration_sec, minutes (yoga), notes, started_at, body (jsonb Befinden-Snapshot),
  general_warmup (jsonb), skill_phase, skill_result (completed/missed/skipped)
- **session_exercises** – Uebung-in-Einheit: session_id (FK), exercise_id
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

Sicherung der Nutzerdaten laeuft ueber JSON-Export/Import. Einen Scheiben-Bestandszaehler
gibt es bewusst nicht.

---

## 5. Architektur-Leitplanken

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
  ausschliesslich aus den eigenen Design-Tokens (Klar-Theme). shadcn ist farb- und
  formneutral; eigene Tokens darueberzuziehen ist der vorgesehene Weg. Es spart genau die ueber Monate gewachsenen Kanten (Dialog, Sheet, Tabelle), die
  unter Abschnitt 11 als Aufwandstreiber stehen.
- **Zod-Schemas** als Quelle der Wahrheit fuer Datenformen; TypeScript-Typen daraus
  abgeleitet.
- **Domaenensprache deutsch** (Uebung, Journey, Session, Vorlage, Phase), Code-/
  Architekturbegriffe englisch.

---

---

## 7. Risiken und bewusste Trade-offs

- **Offline-Datenschicht ist der sensible Punkt.** Daten kommen offline aus der
  TanStack-Persistenz (IndexedDB + pausierte Mutationen), nicht aus dem Service Worker.
  Die beiden Mechanismen muessen sich nicht in die Quere kommen.
- **Mutationsreihenfolge ist hart.** Pausierbare Mutationen muessen vor
  `resumePausedMutations` registriert sein, sonst ueberleben sie keinen App-Neustart.
- **Engine-Reinheit erhalten.** Reine Rechenfunktionen bleiben DOM-frei und getestet;
  Coach-Aenderungen laufen ueber `coach.ts`/`liveBuild.ts`, nicht durch die Engine.
