import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";

// Loescht eine abgeschlossene Einheit. Die Fremdschluessel sind auf ON DELETE
// CASCADE gesetzt, daher raeumt die DB session_exercises und sets automatisch
// mit weg – hier reicht das Loeschen der sessions-Zeile. Nach Erfolg werden die
// betroffenen Listen neu geladen (Trainings-Uebersicht und Verlauf), damit
// Kalender, Liste und Empfehlung sofort stimmen.
export function useDeleteSession(): {
  delete: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["sessions-detailed", userId],
      });
      void queryClient.invalidateQueries({ queryKey: ["sessions", userId] });
    },
  });

  return {
    delete: (id: string) => mutation.mutateAsync(id),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
