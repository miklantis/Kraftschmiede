// Abschnitt 7 – Trainingseinheiten. Spiegelt sessions, session_exercises, sets.

import { z } from "zod";
import {
  bodySnapshotSchema,
  generalWarmupSchema,
  isoDate,
  isoTimestamp,
  sessionMetricEnum,
  skillLogResultEnum,
  suggestionSchema,
  uuid,
} from "./shared";

// CHECK-Listen der sessions-Tabelle.
export const sessionTypeEnum = z.enum(["strength", "yoga", "skill"]);
export const sessionStatusEnum = z.enum(["live", "done"]);
// skill_result teilt die Werte mit dem Skill-Log.
export const sessionSkillResultEnum = skillLogResultEnum;

// sessions – eine Trainingseinheit. week = eingefrorene globale Journey-Woche.
export const sessionRow = z.object({
  id: uuid,
  user_id: uuid,
  date: isoDate,
  type: sessionTypeEnum,
  status: sessionStatusEnum,
  journey_id: uuid.nullable(),
  phase_id: uuid.nullable(),
  template_id: uuid.nullable(),
  skill_id: uuid.nullable(),
  week: z.number().int().nullable(),
  duration_sec: z.number().int().nullable(),
  minutes: z.number().int().nullable(),
  notes: z.string(),
  started_at: isoTimestamp.nullable(),
  body: bodySnapshotSchema,
  general_warmup: generalWarmupSchema,
  skill_phase: z.number().int().nullable(),
  skill_result: sessionSkillResultEnum.nullable(),
  created_at: isoTimestamp,
});
export type SessionRow = z.infer<typeof sessionRow>;

export const sessionInsert = sessionRow
  .omit({ id: true, created_at: true })
  .partial({
    status: true,
    journey_id: true,
    phase_id: true,
    template_id: true,
    skill_id: true,
    week: true,
    duration_sec: true,
    minutes: true,
    notes: true,
    started_at: true,
    body: true,
    general_warmup: true,
    skill_phase: true,
    skill_result: true,
  });
export type SessionInsert = z.infer<typeof sessionInsert>;

// session_exercises – Uebung-in-Einheit (V1 "entry"). Bei Skill-Einheiten ohne
// Katalogbezug ist exercise_id null und der Name kommt aus der Skill-Phase.
export const sessionExerciseRow = z.object({
  id: uuid,
  user_id: uuid,
  session_id: uuid,
  exercise_id: uuid.nullable(),
  name: z.string().nullable(),
  bar_id: uuid.nullable(),
  metric: sessionMetricEnum.nullable(),
  tested_1rm: z.number().nullable(),
  suggestion: suggestionSchema,
  position: z.number().int(),
  // Freitext-Notiz zur Uebung ("hier abgebrochen", "fiel schwer"). Leerstring
  // = keine Notiz, nie null (Migration 0025).
  note: z.string(),
});
export type SessionExerciseRow = z.infer<typeof sessionExerciseRow>;

export const sessionExerciseInsert = sessionExerciseRow
  .omit({ id: true })
  .partial({
    exercise_id: true,
    name: true,
    bar_id: true,
    metric: true,
    tested_1rm: true,
    suggestion: true,
    position: true,
    note: true,
  });
export type SessionExerciseInsert = z.infer<typeof sessionExerciseInsert>;

// sets – einzelner Satz. Bei Haltezeit zaehlt duration_sec statt reps/weight.
// Geplant (target_*) vs. tatsaechlich; met = Ziel erreicht (Skill).
export const setKindEnum = z.enum(["warmup", "work"]);

export const setRow = z.object({
  id: uuid,
  user_id: uuid,
  session_exercise_id: uuid,
  kind: setKindEnum,
  position: z.number().int(),
  reps: z.number().int().nullable(),
  weight: z.number().nullable(),
  duration_sec: z.number().int().nullable(),
  score: z.number().nullable(),
  failed: z.boolean(),
  done: z.boolean(),
  target_reps: z.number().int().nullable(),
  target_weight: z.number().nullable(),
  target_score: z.number().nullable(),
  adjusted: z.boolean(),
  adjust_note: z.string(),
  met: z.boolean().nullable(),
});
export type SetRow = z.infer<typeof setRow>;

export const setInsert = setRow
  .omit({ id: true })
  .partial({
    kind: true,
    position: true,
    reps: true,
    weight: true,
    duration_sec: true,
    score: true,
    failed: true,
    done: true,
    target_reps: true,
    target_weight: true,
    target_score: true,
    adjusted: true,
    adjust_note: true,
    met: true,
  });
export type SetInsert = z.infer<typeof setInsert>;
