// Abschnitt 8 (Teil) – Koerperdaten. Spiegelt body_log und composition.

import { z } from "zod";
import { isoDate, uuid } from "./shared";

// body_log – Tages-Befinden / Erholungs-Check (Muskelkater, Bereitschaft, Schmerz).
export const bodyLogRow = z.object({
  id: uuid,
  user_id: uuid,
  date: isoDate,
  legs: z.number().int(),
  upper_body: z.number().int(),
  overall: z.number().int(),
  readiness: z.number().int(),
  pain_flag: z.boolean(),
  pain_note: z.string(),
  notes: z.string(),
});
export type BodyLogRow = z.infer<typeof bodyLogRow>;

export const bodyLogInsert = bodyLogRow
  .omit({ id: true })
  .partial({
    legs: true,
    upper_body: true,
    overall: true,
    readiness: true,
    pain_flag: true,
    pain_note: true,
    notes: true,
  });
export type BodyLogInsert = z.infer<typeof bodyLogInsert>;

// composition – InBody-/BIA-Messungen als Zeitreihe.
export const compositionRow = z.object({
  id: uuid,
  user_id: uuid,
  date: isoDate,
  weight: z.number().nullable(),
  body_fat_kg: z.number().nullable(),
  body_fat_pct: z.number().nullable(),
  skeletal_muscle_kg: z.number().nullable(),
  muscle_mass_kg: z.number().nullable(),
  tbw_kg: z.number().nullable(),
  phase_angle: z.number().nullable(),
  visceral_fat: z.number().nullable(),
  ecw_kg: z.number().nullable(),
  icw_kg: z.number().nullable(),
  bmr_kcal: z.number().nullable(),
});
export type CompositionRow = z.infer<typeof compositionRow>;

export const compositionInsert = compositionRow
  .omit({ id: true })
  .partial({
    weight: true,
    body_fat_kg: true,
    body_fat_pct: true,
    skeletal_muscle_kg: true,
    muscle_mass_kg: true,
    tbw_kg: true,
    phase_angle: true,
    visceral_fat: true,
    ecw_kg: true,
    icw_kg: true,
    bmr_kcal: true,
  });
export type CompositionInsert = z.infer<typeof compositionInsert>;
