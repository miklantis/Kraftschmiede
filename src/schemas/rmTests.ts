// Abschnitt – 1RM-Tests. Spiegelt rm_tests 1:1 (Migration 0013).

import { z } from "zod";
import { uuid, isoDate, isoTimestamp } from "./shared";

// rm_tests – je Zeile ein bewusst gemachter 1RM-Test einer Uebung: der beste
// Satz (weight x reps), das daraus geschaetzte 1RM (est_rm) und der Rekord vor
// dem Test (previous_rm, null wenn es noch keinen gab). Ein Test ist KEINE
// Trainingseinheit und haengt bewusst nicht an sessions.
export const rmTestRow = z.object({
  id: uuid,
  user_id: uuid,
  exercise_id: uuid,
  date: isoDate,
  weight: z.number(),
  reps: z.number().int(),
  est_rm: z.number(),
  previous_rm: z.number().nullable(),
  // Freitext-Notiz zum Test. Leerstring = keine Notiz, nie null (Migration 0025).
  notiz: z.string(),
  created_at: isoTimestamp,
});
export type RmTestRow = z.infer<typeof rmTestRow>;

export const rmTestInsert = rmTestRow
  .omit({ id: true, created_at: true })
  .partial({ previous_rm: true, notiz: true });
export type RmTestInsert = z.infer<typeof rmTestInsert>;
