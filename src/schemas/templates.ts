// Abschnitt 3 – Trainings-Vorlagen. Spiegelt templates und template_exercises.

import { z } from "zod";
import { uuid } from "./shared";

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

// template_exercises – Uebung in einer Vorlage mit Reihenfolge. Die frueher
// gefuehrte Rolle (Haupt/Assistenz/Core) ist entfallen; die DB-Spalte `role`
// bleibt mit ihrem Default liegen und wird nicht mehr ausgewertet.
export const templateExerciseRow = z.object({
  id: uuid,
  user_id: uuid,
  template_id: uuid,
  exercise_id: uuid,
  position: z.number().int(),
});
export type TemplateExerciseRow = z.infer<typeof templateExerciseRow>;

export const templateExerciseInsert = templateExerciseRow
  .omit({ id: true })
  .partial({ position: true });
export type TemplateExerciseInsert = z.infer<typeof templateExerciseInsert>;
