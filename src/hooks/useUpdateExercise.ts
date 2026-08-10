import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseExerciseStore } from "@/lib/exerciseStore";
import { writeExerciseEdit } from "@/lib/exerciseWrite";
import type { ExerciseEditValues } from "@/lib/exerciseWrite";
import { useUserId } from "./useUserId";

// Schreibt die im "Uebung anpassen"-Popup angepassten Felder einer Uebung
// zurueck: Arbeitsgewicht, Ziel-Score und (sofern nicht aus der aktiven Phase
// gesperrt) das Repband. Bewusst genau die drei Felder wie V1 – keine weiteren.
// Der Datenbank-Handgriff liegt hinter der Naht ExerciseStore/exerciseWrite.
// Nach Erfolg wird der Uebungskatalog neu geladen; die Detailseite leitet ihre
// Statistik daraus ab.

export type { ExerciseEditValues };

export function useUpdateExercise(): {
  update: (id: string, values: ExerciseEditValues) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (vars: {
      id: string;
      values: ExerciseEditValues;
    }): Promise<void> =>
      writeExerciseEdit(supabaseExerciseStore, userId, vars.id, vars.values),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.exerciseUpdate);
    },
  });

  return {
    update: (id, values) => mutation.mutateAsync({ id, values }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
