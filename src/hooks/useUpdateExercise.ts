import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";

// Schreibt die im "Uebung anpassen"-Popup angepassten Felder einer Uebung
// zurueck: Arbeitsgewicht, Ziel-Score und (sofern nicht aus der aktiven Phase
// gesperrt) das Repband. Bewusst genau die drei Felder wie V1 – keine weiteren.
// Nach Erfolg wird der Uebungskatalog neu geladen; die Detailseite leitet ihre
// Statistik daraus ab.
export interface ExerciseEditValues {
  work_weight: number;
  target_score: number;
  // Nur gesetzt, wenn das Repband editierbar war (nicht aus der Phase gesperrt).
  rep_range_min?: number;
  rep_range_max?: number;
}

export function useUpdateExercise(): {
  update: (id: string, values: ExerciseEditValues) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      values: ExerciseEditValues;
    }): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      const { error } = await supabase
        .from("exercises")
        .update(vars.values)
        .eq("id", vars.id);
      if (error) throw new Error(error.message);
    },
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
