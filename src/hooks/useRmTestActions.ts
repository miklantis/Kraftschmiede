import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die 1RM-Tests, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand) – wie bei den Meilensteinen. Nach Erfolg werden alle
// Test-Listen neu geladen.
//
// Loeschen des JUENGSTEN Tests nimmt ihn zurueck: der Rekord der Uebung geht auf
// den Stand davor (previous_rm der Zeile). Bei aelteren Tests verschwindet nur
// die Zeile - der Rekord stammt dort ohnehin aus einem neueren Test. Was gilt,
// entscheidet die reine Funktion rollbackForDelete; der Hook fuehrt es aus.
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
  | {
      type: "delete";
      id: string;
      exerciseId: string;
      /** Ruecknahme des Rekords oder null, wenn er unberuehrt bleibt. */
      restore: { rm: number | null; asOf: string | null } | null;
    };

export interface RmTestAddInput {
  exerciseId: string;
  date: string;
  weight: number;
  reps: number;
  estRm: number;
  previousRm: number | null;
}

export interface RmTestRemoveInput {
  id: string;
  exerciseId: string;
  restore: { rm: number | null; asOf: string | null } | null;
}

export function useRmTestActions(): {
  add: (input: RmTestAddInput) => Promise<void>;
  remove: (input: RmTestRemoveInput) => Promise<void>;
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

      if (action.restore) {
        // Rekord auf den Stand vor dem Test zuruecksetzen. Ohne Vorwert gilt
        // die Uebung wieder als „kein 1RM“ (rm_stale, damit klar ist, dass ein
        // frischer Beleg fehlt).
        const { error: updateError } = await supabase
          .from("exercises")
          .update({
            rm: action.restore.rm,
            rm_as_of: action.restore.asOf,
            rm_stale: action.restore.rm == null,
          })
          .eq("id", action.exerciseId);
        if (updateError) throw new Error(updateError.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rmTests"] });
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    add: (input) => mutation.mutateAsync({ type: "add", ...input }),
    remove: (input) => mutation.mutateAsync({ type: "delete", ...input }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
