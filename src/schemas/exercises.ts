// Abschnitt 2 – Uebungen. Spiegelt exercises und exercise_muscles.

import { z } from "zod";
import { metricEnum, muscleKategorieEnum, isoDate, uuid } from "./shared";

// CHECK-Listen, die nur die exercises-Tabelle nutzt.
export const exerciseProfileEnum = z.enum(["strength", "core", "bodyweight"]);
// Neu (Lieferung 1): ersetzt kind. Bewusst erweiterbar (spaeter z. B. isolation/prehab).
export const exerciseTierEnum = z.enum(["main", "accessory"]);
export const exerciseEquipmentEnum = z.enum([
  "barbell",
  "plate",
  "bar",
  "band",
  "bodyweight",
]);

// exercises – Uebungskatalog mit Coach-Feldern (rm, rm_as_of, rm_stale).
export const exerciseRow = z.object({
  id: uuid,
  user_id: uuid,
  key: z.string().nullable(),
  name: z.string(),
  profile: exerciseProfileEnum,
  tier: exerciseTierEnum,
  equipment: exerciseEquipmentEnum,
  bar_id: uuid.nullable(),
  description: z.string(),
  metric: metricEnum.nullable(),
  muscle_groups: z.array(z.string()),
  rep_range_min: z.number().int().nullable(),
  rep_range_max: z.number().int().nullable(),
  target_score: z.number(),
  work_weight: z.number(),
  recovery_hours: z.number().int(),
  rm: z.number().nullable(),
  rm_as_of: isoDate.nullable(),
  rm_stale: z.boolean(),
  position: z.number().int(),
});
export type ExerciseRow = z.infer<typeof exerciseRow>;

export const exerciseInsert = exerciseRow.omit({ id: true }).partial({
  key: true,
  profile: true,
  tier: true,
  equipment: true,
  bar_id: true,
  description: true,
  metric: true,
  muscle_groups: true,
  rep_range_min: true,
  rep_range_max: true,
  target_score: true,
  work_weight: true,
  recovery_hours: true,
  rm: true,
  rm_as_of: true,
  rm_stale: true,
  position: true,
});
export type ExerciseInsert = z.infer<typeof exerciseInsert>;

// exercise_muscles – feine Muskel-Beteiligung je Uebung (region_id = SVG-Region).
export const exerciseMuscleRow = z.object({
  id: uuid,
  user_id: uuid,
  exercise_id: uuid,
  region_id: z.string(),
  kategorie: muscleKategorieEnum,
});
export type ExerciseMuscleRow = z.infer<typeof exerciseMuscleRow>;

export const exerciseMuscleInsert = exerciseMuscleRow.omit({ id: true });
export type ExerciseMuscleInsert = z.infer<typeof exerciseMuscleInsert>;
