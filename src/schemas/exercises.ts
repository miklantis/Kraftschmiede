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
  "dumbbell",
]);

// Aus den Enums abgeleitete Typen (einzige Pflegequelle bleibt das Enum).
export type ExerciseProfile = z.infer<typeof exerciseProfileEnum>;
export type ExerciseTier = z.infer<typeof exerciseTierEnum>;
export type ExerciseEquipment = z.infer<typeof exerciseEquipmentEnum>;

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
  work_weight: z.number(),
  // Eingefrorenes Arbeitsgewicht vom Start einer Lastfaktor-Journey; null,
  // solange keine solche Journey laeuft.
  reference_weight: z.number().nullable(),
  // Zu welcher Phase das eingefrorene reference_weight gehoert. Ohne diesen
  // Bezug liesse sich "Anker dieser Phase" nicht von "noch kein Anker"
  // unterscheiden, und die Last wuerde pro Einheit statt pro Woche steigen.
  reference_phase_id: uuid.nullable(),
  // Startgewicht X der Phase, an die der Anker gebunden ist: der Stand beim
  // Eintritt, bevor die Rampe ihn fortgeschrieben hat. Bezug der Entlastung in
  // der Entlastungswoche (60 % von X). null = kein Startgewicht festgehalten.
  plan_start_weight: z.number().nullable(),
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
  work_weight: true,
  reference_weight: true,
  reference_phase_id: true,
  plan_start_weight: true,
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
