// Gemeinsame Datenformen der Engine. Reine Werttypen, kein DB- oder DOM-Bezug.
// Die Engine arbeitet mit ihren eigenen Feldnamen (z. B. `type: "warmup"`); die
// datenbeschaffende Glue-Schicht mappt DB-Zeilen auf diese Formen.

export type SetType = "warmup" | "work";

// 1RM-Formeln. Alles ausserhalb dieser Werte wird als Mittelwert behandelt.
export type RmFormula = "brzycki" | "epley" | "wathan" | "mean";

// Ein einzelner Satz (Aufwaerm- oder Arbeitssatz) im Krafttraining.
export interface EngineSet {
  type?: SetType;
  done?: boolean;
  failed?: boolean;
  weight: number;
  reps: number;
  score?: number; // 1..5
  targetReps?: number | null;
  targetWeight?: number | null;
  adjusted?: boolean;
  painFlag?: boolean;
}

// Ein Eintrag einer Uebung mit ihren Saetzen (Vordaten fuer den Vorschlag).
export interface SetEntry {
  sets?: EngineSet[];
}

export interface Bar {
  weight: number;
}

// Uebungsdefinition fuer die Suitability-Bewertung.
export interface Exercise {
  id: string;
  name?: string;
  tier?: string; // "main" | "accessory"
  profile?: string; // "strength" | "core" | "bodyweight"
  muscleGroups?: string[];
  recoveryHours?: number;
}

export interface TemplateItem {
  exerciseId: string;
}

export interface SuitabilityTemplate {
  id: string;
  items?: Array<TemplateItem | string>;
  lift1?: string;
  lift2?: string;
  core?: string;
}

export interface Soreness {
  legs?: number;
  upper_body?: number;
  overall?: number;
}

export interface SuitabilityCtx {
  now?: number;
  lastByExercise?: Record<string, number>;
  soreness?: Soreness;
  weekCounts?: Record<string, number>;
  phase?: { focus?: string };
  freqTarget?: number;
}

// Volumen/Deload: Phasen-Eckdaten.
export interface VolumePhase {
  setsStart?: number;
  setsEnd?: number;
  weeks?: number;
  deloadWeek?: number | null;
}

export interface DeloadMarkers {
  perfDropTwoSessions?: boolean;
  soreness?: number; // 0..3
  readiness?: number; // 1..5
}

// Erholungs-Check: Koerperzustand.
export interface BodyState {
  pain?: Record<string, boolean>;
  legs?: number;
  upper_body?: number;
  overall?: number;
  readiness?: number;
}

// ---- Skills ----
export type SkillMetric = "reps" | "duration" | string;

export interface SkillSet {
  value?: number | null;
  done?: boolean;
}

export interface SkillPhaseExercise {
  metric?: SkillMetric;
  target?: number;
  sets?: number;
}

export interface SkillPhase {
  index?: number;
  label?: string;
  description?: string;
  equipment?: string[];
  consecutiveSessions?: number;
  exercises?: SkillPhaseExercise[];
}

export interface SkillDef {
  phases?: SkillPhase[];
}

export interface SkillProgress {
  currentPhase?: number;
  consecutiveCount?: number;
  mastered?: boolean;
}

export interface SkillWorkExercise {
  sets?: SkillSet[];
}

export type SkillSessionResult = "skipped" | "completed" | "missed";
