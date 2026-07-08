# Kraftschmiede – Architektur & Schema

Referenzdokument für den laufenden Betrieb: Datenbank-Schema, Architektur-Leitplanken
und der umgesetzte Stand der App. Beschreibt, wie das System gebaut ist, nicht einen
Bauplan.

Die getroffenen strategischen Entscheidungen und Betriebs-Lernpunkte liegen als einzelne
Architektur-Entscheidungen (ADRs) in [`docs/adr/`](./adr/README.md). Dieses Dokument
beschreibt den Ist-Zustand und verweist für das Warum auf die jeweilige ADR.

---

## 1. Überblick

Kraftschmiede ist eine moderne Web-App: React 19, TypeScript, Vite, TanStack Router/Query,
Tailwind, shadcn/ui, Supabase mit normalisierter relationaler Datenbank. Installierbar als
PWA mit Offline-Hülle und bewusstem Update-Hinweis.

Leitprinzipien:
- Wiederverwendbare Komponenten statt Seiten-Duplikation (Pop-ups, Tabellen, Charts).
- Reine, testbare Engine- und Coach-Logik ohne DOM-Bezug.
- Datenzugriff in Hooks gekapselt; Komponenten kennen Supabase nicht direkt.
- Domänensprache deutsch (Übung, Journey, Session, Vorlage, Phase, Coach),
  Code-/Architekturbegriffe englisch.

Grundlegende Entscheidungen dazu: Offline-first (ADR-0001), Definitionen in der
Datenbank (ADR-0002), Skill-Definitionen (ADR-0003).

---

## 2. Tech-Stack

- Frontend: React 19
- Build: Vite
- Sprache: TypeScript (strict, kein `any`, Interfaces für alle Strukturen)
- Routing: TanStack Router (file-based, `src/routes`)
- Server-State: TanStack Query (v5+)
- Client-State: minimal halten; URL-State oder TanStack Store nur wo nötig
- Styling: Tailwind CSS
- UI-Komponenten: shadcn/ui (Primitives in `src/components/ui`)
- Icons: Lucide
- Validierung: Zod (Formulare, API-Antworten, Schemas)
- Datenbank: Supabase (Postgres), RLS pro Tabelle

---

## 3. Datenbank-Schema (umgesetzt)

Umgesetzt als `supabase/migrations/0001_initial_schema.sql`. 23 Tabellen,
jede mit `user_id` und Row Level Security (vier Policies select/insert/update/delete
strikt auf `auth.uid() = user_id`), Zugriff für Rolle `authenticated` freigegeben.
Definitionen werden beim ersten Start pro Nutzer aus einem Seed befüllt. Tabellen mit
stabilem Seed-Identifikator haben ein `key`-Feld (`unique(user_id, key)`); Fremdschlüssel
nutzen UUIDs. Kleine, attributarme
Wertobjekte bleiben bewusst als `jsonb` (Befinden-Snapshot, Aufwärmen, Coach-Vorschlag,
Recovery-Fenster, Timer).

### 3.1 Inventar

- **inventory_bars** – Stangen: key, name, weight, is_default, position. Fester Satz
  (Standard/Leicht/SZ/SZ-Curl/Kurz), in der Oberflaeche nicht editierbar; per `key`
  markiert, per Migration 0008 gesetzt.
- **inventory_plates** – Scheiben: je Zeile ein verfügbares Gewicht (kein Stück-Zähler;
  der Plate-Loader rechnet ohne Limit)
- **inventory_kettlebells** – Kettlebells: je Zeile ein Gewicht
- **inventory_equipment** – Skill-Equipment-Tor: key, label, active (Klimmzugstange,
  Bänder, Ringe ...)

### 3.2 Definitionen (Stammdaten in der DB, per Seed)

- **exercises** – key, name, profile (strength/core/bodyweight), tier (main/accessory),
  equipment, bar_id (FK), description, metric (reps/duration bei Körpergewicht),
  muscle_groups (grobe Tags als text[]), rep_range_min/max, target_score, work_weight,
  recovery_hours, rm/rm_as_of/rm_stale (zwischengespeichertes 1RM für den Coach), position
- **exercise_muscles** – feine Regionen-Map: exercise_id (FK), region_id (Code-/SVG-Region),
  kategorie (primär/sekundär/stabilisierend)
- **templates** – key, name, image, active (Soft-Archiv), position. Namen pro Nutzer
  eindeutig über alle Workouts inkl. archivierter (`templates_unique_user_name`)
- **template_exercises** – template_id (FK), exercise_id (FK), position
- **journey_templates** – key, name, tagline, for_whom, summary, position
- **journey_template_phases** – journey_template_id (FK), name, focus, weeks,
  sets_start, sets_end, deload_week (nullable), rep_target_min/max, position
- **skills** – key, name, category, image, position
- **skill_phases** – skill_id (FK), label, description, consecutive_sessions
  (aufeinanderfolgende Erfolge bis Aufstieg), position
- **skill_phase_exercises** – skill_phase_id (FK), name, metric (reps/duration), sets,
  target, tempo, exercise_id (FK, optional zur Katalog-Übung), position
- **skill_phase_equipment** – skill_phase_id (FK), equipment_key (Voraussetzung)

Skill-Definitionen liegen als Seed in DB-Tabellen (einheitlicher Zugriff über
Query-Hooks, später editierbar); der Fortschritt steht separat in `skill_progress`.
Begründung in ADR-0003.

### 3.3 Nutzerzustand

- **journeys** – name, active, status (active/archived), source_template_id (FK), start_date,
  created_at. Invariante: Partial Unique Index `journeys_one_active_per_user` auf
  `user_id where active` -> genau eine aktive Journey pro Nutzer (ADR-0004)
- **phases** – journey_id (FK), name, focus, weeks, sets_start, sets_end, deload_week
  (nullable), rep_target_min/max, position
- **journey_workouts** – ordnet Workouts der Journey zu: journey_id (FK), template_id (FK),
  `unique(user_id, journey_id, template_id)`. Reine Ja/Nein-Menge, bewusst ohne position
  (die Empfehlungsreihenfolge bestimmt der Coach); ON DELETE CASCADE über beide FKs
- **sessions** – date, type (strength/yoga/skill), status (live/done), journey_id,
  phase_id, template_id, skill_id (alle FK, nullable), week (eingefrorene Journey-Woche),
  duration_sec, minutes (yoga), notes, started_at, body (jsonb Befinden-Snapshot),
  general_warmup (jsonb), skill_phase, skill_result (completed/missed/skipped)
- **session_exercises** – Übung-in-Einheit: session_id (FK), exercise_id
  (FK, nullable), name, bar_id (FK), metric, tested_1rm, suggestion (jsonb), position
- **sets** – session_exercise_id (FK), kind (warmup/work), position, reps, weight,
  duration_sec, score, failed, done, target_reps, target_weight, target_score, adjusted,
  adjust_note, met (Skill: Ziel erreicht)
- **skill_progress** – skill_id (FK), active, current_phase, counter (Konsekutiv-Zähler,
  Reset bei Fehlversuch), mastered, log (jsonb), `unique(user_id, skill_id)`
- **body_log** – Tages-Befinden: date, legs, upper_body, overall (Muskelkater 0..3),
  readiness, pain_flag, pain_note, notes, `unique(user_id, date)`
- **composition** – InBody-/BIA-Messung: date, weight, body_fat_kg, body_fat_pct,
  skeletal_muscle_kg, tbw_kg, phase_angle, visceral_fat, `unique(user_id, date)`
- **settings** – user_id (PK), rm_formula, weekly_frequency_target, weight_step, unit,
  recovery_windows (jsonb), timers (jsonb)

Sicherung der Nutzerdaten läuft über JSON-Export/Import. Einen Scheiben-Bestandszähler
gibt es bewusst nicht.

---

## 4. Architektur-Leitplanken

- **Engine bleibt rein.** Die reinen Rechenfunktionen (1RM, Plate-Loader,
  Aufwärm-Generator, Doppelprogression, Suitability, Volumen/Deload, Skill-Advice) sind
  in TypeScript umgesetzt – mitsamt Unit-Tests. Da sie reine Funktionen sind (Daten rein,
  Ergebnis raus), bleiben sie vom Schema unberührt. Nur die datenbeschaffende
  Glue-/Coach-Schicht greift darauf zu.
- **Coach als eigenes, testbares Modul** (`coach.ts`): nimmt Zustand explizit herein,
  gibt Entscheidungen heraus – gleiche Form wie die Engine. Kein DOM-Bezug.
- **Datenzugriff gekapselt** in Query-/Mutation-Hooks je Entität (z. B.
  `useSessions`, `useExercises`). Komponenten kennen kein Supabase direkt.
- **Wiederverwendbare Primitives** in `src/components/ui` (Modal, DataTable, Sheet,
  MuscleMap, Chart). Genau das Ziel: einmal bauen, überall nutzen.
- **shadcn/ui als Fundament, nicht als Optik.** shadcn liefert die unsichtbare Mechanik
  (Fokus-Fang, Schließen-Verhalten, Tastatur, Barrierefreiheit, iOS-Verhalten) als
  eigenen, ins Projekt kopierten Code – kein mitgeschlepptes Paket. Das Aussehen kommt
  ausschließlich aus den eigenen Design-Tokens (Klar-Theme). Begründung und
  Beschaffungsweg in ADR-0005 und ADR-0006.
- **Zod-Schemas** als Quelle der Wahrheit für Datenformen; TypeScript-Typen daraus
  abgeleitet.
- **Domänensprache deutsch** (Übung, Journey, Session, Vorlage, Phase), Code-/
  Architekturbegriffe englisch.

---

## 5. Offline und PWA

Die Datenschicht ist offline-fähig (ADR-0001): Daten kommen offline aus der
TanStack-Persistenz (IndexedDB + pausierte Mutationen), nicht aus dem Service Worker.
Die beiden Mechanismen bleiben getrennt; Supabase wird nicht vom Service Worker gecacht.

Die Reihenfolge der Mutations-Registrierung ist eine harte Invariante: pausierbare
Mutationen müssen vor `resumePausedMutations` registriert sein, sonst überleben sie
keinen App-Neustart (ADR-0009).

Updates werden bewusst übernommen, nicht still eingespielt (ADR-0008). Der base-Pfad und
der SPA-Fallback für GitHub Pages sind in ADR-0007 festgehalten.
