import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseErfassungStore } from "@/lib/erfassungStore";
import { writeErfassungAction } from "@/lib/erfassungWrite";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Loescht eine abgeschlossene Einheit. Die Fremdschluessel sind auf ON DELETE
// CASCADE gesetzt, daher raeumt die DB session_exercises und sets automatisch
// mit weg – hier reicht das Loeschen der sessions-Zeile. Nach Erfolg werden die
// betroffenen Listen neu geladen (Trainings-Uebersicht und Verlauf), damit
// Kalender, Liste und Empfehlung sofort stimmen. Der Datenbank-Handgriff liegt
// hinter der Naht (lib/erfassungStore.ts), die Abfolge in lib/erfassungWrite.ts.
export function useDeleteSession(): {
  delete: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (id: string): Promise<void> =>
      writeErfassungAction(supabaseErfassungStore, userId, todayISO(), {
        type: "deleteEinheit",
        id,
      }),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.deleteSession);
    },
  });

  return {
    delete: (id: string) => mutation.mutateAsync(id),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
