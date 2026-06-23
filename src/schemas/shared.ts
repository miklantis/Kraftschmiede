// Gemeinsame Bausteine fuer die Entitaets-Schemas.
//
// Quelle der Wahrheit fuer die Datenformen ist die normalisierte Datenbank
// (supabase/migrations/0001_initial_schema.sql). Die Zod-Schemas spiegeln die
// Tabellen 1:1: gleiche Spaltennamen (snake_case), gleiche Nullbarkeit, die
// CHECK-Listen als Enums. Aus den Schemas werden die TypeScript-Typen abgeleitet
// (z.infer), damit es keine doppelte Pflege gibt.
//
// Konvention je Tabelle `foo_bar`:
//   fooBarRow    – Lese-Form: was ein `select *` liefert (alle Spalten).
//   FooBarRow    – abgeleiteter Typ dazu.
//   fooBarInsert – Schreib-Form: ohne von der DB erzeugte Felder (id, created_at);
//                  Spalten mit DB-Default und nullbare Spalten sind optional.
//   FooBarInsert – abgeleiteter Typ dazu.
//
// numeric -> z.number(), integer -> z.number().int(), date -> z.iso.date(),
// timestamptz -> z.iso.datetime({ offset: true }).

import { z } from "zod";

// ---- Primitiven -------------------------------------------------------------

export const uuid = z.uuid();
export const isoDate = z.iso.date(); // 'YYYY-MM-DD' (Postgres date)
export const isoTimestamp = z.iso.datetime({ offset: true }); // timestamptz

// ---- Mehrfach genutzte Enums (CHECK-Listen aus dem Schema) ------------------

// Periodisierungs-Fokus einer Phase (journey_template_phases.focus, phases.focus).
export const focusEnum = z.enum([
  "reentry",
  "hypertrophy",
  "strength",
  "power",
  "endurance",
  "test",
  "maintenance",
]);

// Mess-Art ohne Gewicht (exercises.metric, skill_phase_exercises.metric).
export const metricEnum = z.enum(["reps", "duration"]);

// Aus den Enums abgeleitete Typen (einzige Pflegequelle bleibt das Enum).
export type Focus = z.infer<typeof focusEnum>;
export type Metric = z.infer<typeof metricEnum>;

// Mess-Art einer Uebung-in-Einheit (session_exercises.metric) – inkl. Gewicht+Wdh.
export const sessionMetricEnum = z.enum(["reps", "duration", "weight_reps"]);

// Feinheit der Muskel-Beteiligung (exercise_muscles.kategorie).
export const muscleKategorieEnum = z.enum([
  "primaer",
  "sekundaer",
  "stabilisierend",
]);
export type MuscleKategorie = z.infer<typeof muscleKategorieEnum>;

// ---- jsonb-Wertobjekte ------------------------------------------------------
// Kleine, attributarme Wertobjekte, die als jsonb in ihrer Tabelle liegen.

// settings.timers – Pausen-/Rest-Timer-Einstellungen plus Live-Verhalten.
// Vollstaendig festgelegt durch den DB-Default; daher als geschlossenes Objekt.
// `wakeLock` (Bildschirm waehrend der Session wachhalten) ist bewusst optional:
// es kam erst spaeter dazu, der DB-Default kennt es nicht, und Fehlen bedeutet
// „aus" - so braucht es keine Schema-Migration in der Datenbank.
export const timersSchema = z.object({
  setRestSec: z.number().int().nonnegative(),
  exerciseRestSec: z.number().int().nonnegative(),
  autoStart: z.boolean(),
  sound: z.boolean(),
  vibrate: z.boolean(),
  wakeLock: z.boolean().optional(),
});
export type Timers = z.infer<typeof timersSchema>;

// settings.recovery_windows – Erholungsfenster in Stunden. `default` immer
// vorhanden, beliebige weitere Eintraege je Hebung (z. B. squat, deadlift).
export const recoveryWindowsSchema = z
  .object({ default: z.number().int().nonnegative() })
  .catchall(z.number().int().nonnegative());
export type RecoveryWindows = z.infer<typeof recoveryWindowsSchema>;

// sessions.body – eingefrorener Befinden-Snapshot zum Zeitpunkt der Einheit.
// Felder spiegeln body_log, sind aber alle optional. Vorlaeufige Form: lockeres
// Objekt, damit unbekannte Felder beim Lesen erhalten bleiben (wird mit der
// Datenschicht/dem Coach praezisiert).
export const bodySnapshotSchema = z.looseObject({
  legs: z.number().int().optional(),
  upper_body: z.number().int().optional(),
  overall: z.number().int().optional(),
  readiness: z.number().int().optional(),
  pain_flag: z.boolean().optional(),
  pain_note: z.string().optional(),
  notes: z.string().optional(),
});
export type BodySnapshot = z.infer<typeof bodySnapshotSchema>;

// sessions.general_warmup – allgemeines Aufwaermen (Mobility/Cardio-Prep).
// Vorlaeufige Form, lockeres Objekt.
export const generalWarmupSchema = z.looseObject({
  done: z.boolean().optional(),
  minutes: z.number().optional(),
  notes: z.string().optional(),
});
export type GeneralWarmup = z.infer<typeof generalWarmupSchema>;

// session_exercises.suggestion – gespeicherter Coach-Vorschlag. Felder spiegeln
// das Engine-Ergebnis (suggestWeight). Vorlaeufige Form, lockeres Objekt.
export const suggestionDecisionEnum = z.enum([
  "increase",
  "hold",
  "decrease",
  "increase-reps",
]);
export const suggestionSchema = z.looseObject({
  weight: z.number().optional(),
  targetReps: z.number().int().optional(),
  decision: suggestionDecisionEnum.optional(),
  note: z.string().optional(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

// skill_progress.log – kurze Versuchshistorie. Vorlaeufige Eintragsform,
// lockeres Objekt je Eintrag.
export const skillLogResultEnum = z.enum(["completed", "missed", "skipped"]);
export const skillLogEntrySchema = z.looseObject({
  date: isoDate.optional(),
  phase: z.number().int().optional(),
  result: skillLogResultEnum.optional(),
});
export const skillLogSchema = z.array(skillLogEntrySchema);
export type SkillLogEntry = z.infer<typeof skillLogEntrySchema>;
export type SkillLog = z.infer<typeof skillLogSchema>;
