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
type RmTestAction = { type: "delete"; id: string };

export function useRmTestActions(): {
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (action: RmTestAction): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      const { error } = await supabase
        .from("rm_tests")
        .delete()
        .eq("id", action.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rmTests"] });
    },
  });

  return {
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
