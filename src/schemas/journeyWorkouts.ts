// Abschnitt 3 – Zuordnung Workout <-> aktive Journey. Spiegelt journey_workouts.
// Reine Ja/Nein-Menge (ein Eintrag = dieses Workout ist der Journey zugewiesen);
// bewusst ohne position, die Empfehlungsreihenfolge bestimmt der Coach.

import { z } from "zod";
import { uuid } from "./shared";

// journey_workouts – verknuepft ein Workout (template) mit einer Journey.
export const journeyWorkoutRow = z.object({
  id: uuid,
  user_id: uuid,
  journey_id: uuid,
  template_id: uuid,
});
export type JourneyWorkoutRow = z.infer<typeof journeyWorkoutRow>;

export const journeyWorkoutInsert = journeyWorkoutRow.omit({ id: true });
export type JourneyWorkoutInsert = z.infer<typeof journeyWorkoutInsert>;
