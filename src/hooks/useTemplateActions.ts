import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  TEMPLATE_MUTATION_KEY,
  type TemplateActionPayload,
  type WorkoutSaveExercise,
} from "@/lib/templateActions";
import { useUserId } from "./useUserId";

// Aktionen auf Workouts (templates + template_exercises), offline-fest ueber den
// registrierten Mutations-Default (lib/templateActions.ts). Der Aufrufer gibt
// fertige Werte herein; die IDs der Uebungszeilen vergibt dieser Hook clientseitig
// (crypto.randomUUID), damit ein neues Workout auch ohne Netz sicher anlegbar ist.

export interface SaveWorkoutInput {
  /** ID des Workouts (bestehend oder neu vergeben). */
  templateId: string;
  name: string;
  isNew: boolean;
  /** Position des Workout-Kopfes (nur beim Anlegen genutzt). */
  position: number;
  /** Uebungen in Reihenfolge; Position ergibt sich aus dem Index. */
  exercises: Array<{ exerciseId: string; role: WorkoutSaveExercise["role"] }>;
}

export interface UseTemplateActions {
  saveWorkout: (input: SaveWorkoutInput) => Promise<void>;
  archiveWorkout: (templateId: string) => Promise<void>;
  reactivateWorkout: (templateId: string) => Promise<void>;
  isSaving: boolean;
}

export function useTemplateActions(): UseTemplateActions {
  const userId = useUserId();
  const mutation = useMutation<void, Error, TemplateActionPayload>({
    mutationKey: TEMPLATE_MUTATION_KEY,
  });

  const saveWorkout = useCallback(
    (input: SaveWorkoutInput): Promise<void> => {
      if (!userId) return Promise.reject(new Error("Nicht angemeldet."));
      const exercises: WorkoutSaveExercise[] = input.exercises.map((e, i) => ({
        id: crypto.randomUUID(),
        exercise_id: e.exerciseId,
        role: e.role,
        position: i,
      }));
      return mutation.mutateAsync({
        kind: "save",
        userId,
        templateId: input.templateId,
        name: input.name,
        isNew: input.isNew,
        position: input.position,
        exercises,
      });
    },
    [userId, mutation],
  );

  const archiveWorkout = useCallback(
    (templateId: string): Promise<void> =>
      mutation.mutateAsync({ kind: "setActive", templateId, active: false }),
    [mutation],
  );

  const reactivateWorkout = useCallback(
    (templateId: string): Promise<void> =>
      mutation.mutateAsync({ kind: "setActive", templateId, active: true }),
    [mutation],
  );

  return {
    saveWorkout,
    archiveWorkout,
    reactivateWorkout,
    isSaving: mutation.isPending,
  };
}
