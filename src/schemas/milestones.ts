// Abschnitt – Uebungs-Meilensteine. Spiegelt exercise_milestones 1:1.

import { z } from "zod";
import { uuid, isoDate, isoTimestamp } from "./shared";

// exercise_milestones – pro Uebung angelegte Meilensteine (Name + Ziel-1RM in
// kg). achieved_at wird gesetzt, sobald das geschaetzte 1RM der Uebung
// (exercises.rm) das Ziel erreicht; null = noch offen.
export const exerciseMilestoneRow = z.object({
  id: uuid,
  user_id: uuid,
  exercise_id: uuid,
  name: z.string(),
  target_rm: z.number(),
  achieved_at: isoDate.nullable(),
  created_at: isoTimestamp,
  position: z.number().int(),
});
export type ExerciseMilestoneRow = z.infer<typeof exerciseMilestoneRow>;

export const exerciseMilestoneInsert = exerciseMilestoneRow
  .omit({ id: true, created_at: true })
  .partial({ position: true, achieved_at: true });
export type ExerciseMilestoneInsert = z.infer<typeof exerciseMilestoneInsert>;
