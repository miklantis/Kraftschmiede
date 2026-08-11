import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseErfassungStore } from "@/lib/erfassungStore";
import { writeErfassungAction } from "@/lib/erfassungWrite";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Traegt eine Yoga-/Mobility-Einheit als abgeschlossene Einheit ein (kein
// gefuehrter Ablauf, keine Eignung/Coach – nur Datum und Dauer, 1:1 wie V1).
// Nach Erfolg werden die Trainings-Uebersicht (letzte Einheit) und der Verlauf
// (Kalender + Liste) neu geladen, damit beides sofort stimmt. Der
// Datenbank-Handgriff liegt hinter der Naht (lib/erfassungStore.ts), die
// Abfolge in lib/erfassungWrite.ts.
export function useAddYoga(): {
  add: (date: string, minutes: number) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (vars: { date: string; minutes: number }): Promise<void> =>
      writeErfassungAction(supabaseErfassungStore, userId, todayISO(), {
        type: "addYoga",
        datum: vars.date,
        minuten: vars.minutes,
      }),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.addYoga);
    },
  });

  return {
    add: (date: string, minutes: number) =>
      mutation.mutateAsync({ date, minutes }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
