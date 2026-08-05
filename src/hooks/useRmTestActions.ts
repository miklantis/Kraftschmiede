import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die 1RM-Tests, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand) – wie bei den Meilensteinen. Nach Erfolg werden alle
// Test-Listen neu geladen.
//
// Loeschen ist bewusst eine reine Korrektur bei Fehleingabe: das 1RM der Uebung
// wird NICHT auf einen frueheren Wert zurueckgerechnet (Konzept 4.3). Wer den
// Rekord aendern will, macht einen neuen Test.
type RmTestAction =
  | {
      type: "add";
      exerciseId: string;
      date: string;
      weight: number;
      reps: number;
      estRm: number;
      previousRm: number | null;
    }
  | { type: "delete"; id: string };

export interface RmTestAddInput {
  exerciseId: string;
  date: string;
  weight: number;
  reps: number;
  estRm: number;
  previousRm: number | null;
}

export function useRmTestActions(): {
  add: (input: RmTestAddInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (action: RmTestAction): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");

      if (action.type === "add") {
        // Erst die Test-Zeile, dann der Rekord der Uebung. Der Test setzt das
        // 1RM bewusst nach oben UND nach unten (anders als die Automatik im
        // Training) und stempelt das heutige Datum.
        const { error: insertError } = await supabase.from("rm_tests").insert({
          user_id: userId,
          exercise_id: action.exerciseId,
          date: action.date,
          weight: action.weight,
          reps: action.reps,
          est_rm: action.estRm,
          previous_rm: action.previousRm,
        });
        if (insertError) throw new Error(insertError.message);

        const { error: updateError } = await supabase
          .from("exercises")
          .update({
            rm: action.estRm,
            rm_as_of: action.date,
            rm_stale: false,
          })
          .eq("id", action.exerciseId);
        if (updateError) throw new Error(updateError.message);
        return;
      }

      const { error } = await supabase
        .from("rm_tests")
        .delete()
        .eq("id", action.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rmTests"] });
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    add: (input) => mutation.mutateAsync({ type: "add", ...input }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
