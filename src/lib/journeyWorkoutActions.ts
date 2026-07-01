// Journey-Zuordnung (journey_workouts) als registrierter Mutations-Default –
// analog zu templateActions.ts, damit ein ohne Netz gesetzter Schalter den
// App-Neustart uebersteht und automatisch nachgeschickt wird
// (resumePausedMutations in main.tsx). Kennung (JOURNEY_WORKOUT_MUTATION_KEY)
// und Registrier-Reihenfolge bleiben dafuer stabil; die Registrierung liegt
// NACH der der Workout-Aktionen (ADR-0009), damit ein offline neu angelegtes
// Workout vor seiner Zuordnung landet.
//
// Ein Schalter je zuweisbarem Workout weist es der aktiven Journey zu (Insert
// mit vorab vergebener ID) oder nimmt es heraus (Delete ueber journey_id +
// template_id, idempotent).

import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const JOURNEY_WORKOUT_MUTATION_KEY = ["journeyWorkoutAction"] as const;

// Zuweisen: Insert mit clientseitiger ID (offline sicher).
export interface JourneyWorkoutAssignPayload {
  kind: "assign";
  id: string;
  userId: string;
  journeyId: string;
  templateId: string;
}

// Herausnehmen: Delete ueber (journey_id, template_id) – idempotent, auch wenn
// die Zeile zwischenzeitlich fehlt.
export interface JourneyWorkoutUnassignPayload {
  kind: "unassign";
  journeyId: string;
  templateId: string;
}

export type JourneyWorkoutActionPayload =
  | JourneyWorkoutAssignPayload
  | JourneyWorkoutUnassignPayload;

async function writeAction(p: JourneyWorkoutActionPayload): Promise<void> {
  if (p.kind === "assign") {
    const { error } = await supabase.from("journey_workouts").insert({
      id: p.id,
      user_id: p.userId,
      journey_id: p.journeyId,
      template_id: p.templateId,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("journey_workouts")
      .delete()
      .eq("journey_id", p.journeyId)
      .eq("template_id", p.templateId);
    if (error) throw new Error(error.message);
  }
}

/** Default-mutationFn + Auffrischung registrieren. Greift auch fuer nach einem
 *  Neustart fortgesetzte (pausierte) Mutationen, da onSuccess hier haengt. */
export function registerJourneyWorkoutMutation(qc: QueryClient): void {
  qc.setMutationDefaults(JOURNEY_WORKOUT_MUTATION_KEY, {
    mutationFn: (vars: unknown) =>
      writeAction(vars as JourneyWorkoutActionPayload),
    onSuccess: () => {
      // Prefix-Match trifft ["journeyWorkouts", userId, journeyId].
      void qc.invalidateQueries({ queryKey: ["journeyWorkouts"] });
    },
  });
}
