import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  JOURNEY_WORKOUT_MUTATION_KEY,
  type JourneyWorkoutActionPayload,
} from "@/lib/journeyWorkoutActions";
import { useUserId } from "./useUserId";

// Schalter je Workout: der aktiven Journey zuweisen oder herausnehmen.
// Offline-fest ueber den registrierten Mutations-Default
// (lib/journeyWorkoutActions.ts). Die Insert-Id vergibt dieser Hook clientseitig
// (crypto.randomUUID). Der Schalterzustand wird sofort optimistisch in den Cache
// geschrieben, damit er auch offline sofort umspringt; die spaetere
// Invalidierung gleicht bei Netz wieder ab.
export interface UseJourneyWorkoutActions {
  toggle: (
    journeyId: string,
    templateId: string,
    next: boolean,
  ) => Promise<void>;
  isPending: boolean;
}

export function useJourneyWorkoutActions(): UseJourneyWorkoutActions {
  const userId = useUserId();
  const qc = useQueryClient();
  const mutation = useMutation<void, Error, JourneyWorkoutActionPayload>({
    mutationKey: JOURNEY_WORKOUT_MUTATION_KEY,
  });

  const toggle = useCallback(
    (journeyId: string, templateId: string, next: boolean): Promise<void> => {
      if (!userId) return Promise.reject(new Error("Nicht angemeldet."));

      // Optimistisch: den Schalter sofort spiegeln (auch offline).
      qc.setQueryData<Set<string>>(
        ["journeyWorkouts", userId, journeyId],
        (old) => {
          const set = new Set(old ?? []);
          if (next) set.add(templateId);
          else set.delete(templateId);
          return set;
        },
      );

      return next
        ? mutation.mutateAsync({
            kind: "assign",
            id: crypto.randomUUID(),
            userId,
            journeyId,
            templateId,
          })
        : mutation.mutateAsync({ kind: "unassign", journeyId, templateId });
    },
    [userId, qc, mutation],
  );

  return { toggle, isPending: mutation.isPending };
}
