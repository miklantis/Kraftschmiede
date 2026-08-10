import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseExerciseStore } from "@/lib/exerciseStore";
import { writeRmTestAction } from "@/lib/exerciseWrite";
import type { RmTestAction } from "@/lib/exerciseWrite";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die 1RM-Tests, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand) – wie bei den Meilensteinen. Nach Erfolg werden alle
// Test-Listen neu geladen. Die Datenbank-Handgriffe und ihre Reihenfolge liegen
// hinter der Naht ExerciseStore/exerciseWrite.
//
// Loeschen des JUENGSTEN Tests nimmt ihn zurueck: der Rekord der Uebung geht auf
// den Stand davor (previous_rm der Zeile). Bei aelteren Tests verschwindet nur
// die Zeile - der Rekord stammt dort ohnehin aus einem neueren Test. Was gilt,
// entscheidet die reine Funktion rollbackForDelete; der Aufrufer gibt das
// Ergebnis als restore herein.

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
  /** Ruecknahme des Rekords oder null, wenn er unberuehrt bleibt. */
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
    mutationFn: (action: RmTestAction): Promise<void> =>
      writeRmTestAction(supabaseExerciseStore, userId, action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.rmTest);
    },
  });

  return {
    add: (input) => mutation.mutateAsync({ type: "add", ...input }),
    remove: (input) => mutation.mutateAsync({ type: "delete", ...input }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
