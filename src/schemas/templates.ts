// Abschnitt 3 – Trainings-Vorlagen. Spiegelt templates und template_exercises.

import { z } from "zod";
import { uuid } from "./shared";

// Rolle einer Uebung in der Vorlage (template_exercises.role).
export const templateRoleEnum = z.enum(["primary", "secondary", "core"]);
export type TemplateRole = z.infer<typeof templateRoleEnum>;

// templates – benannte Trainings-Vorlage.
// active: Soft-Archiv (false = archiviert). Default true in der DB, daher im
// Insert vorbelegbar. Vom Nutzer angelegte Workouts haben key = null.
export const templateRow = z.object({
  id: uuid,
  user_id: uuid,
  key: z.string().nullable(),
  name: z.string(),
  image: z.string().nullable(),
  active: z.boolean(),
  position: z.number().int(),
});
export type TemplateRow = z.infer<typeof templateRow>;

export const templateInsert = templateRow
  .omit({ id: true })
  .partial({ key: true, image: true, active: true, position: true });
export type TemplateInsert = z.infer<typeof templateInsert>;

// template_exercises – Uebung in einer Vorlage mit Rolle und Reihenfolge.
export const templateExerciseRow = z.object({
  id: uuid,
  user_id: uuid,
  template_id: uuid,
  exercise_id: uuid,
  role: templateRoleEnum,
  position: z.number().int(),
});
export type TemplateExerciseRow = z.infer<typeof templateExerciseRow>;

export const templateExerciseInsert = templateExerciseRow
  .omit({ id: true })
  .partial({ role: true, position: true });
export type TemplateExerciseInsert = z.infer<typeof templateExerciseInsert>;
