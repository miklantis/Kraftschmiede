import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { SessionInsert } from "@/schemas";

// Traegt eine Yoga-/Mobility-Einheit als abgeschlossene Einheit ein (kein
// gefuehrter Ablauf, keine Eignung/Coach – nur Datum und Dauer, 1:1 wie V1).
// Nach Erfolg werden die Trainings-Uebersicht (letzte Einheit) und der Verlauf
// (Kalender + Liste) neu geladen, damit beides sofort stimmt.
export function useAddYoga(): {
  add: (date: string, minutes: number) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (vars: {
      date: string;
      minutes: number;
    }): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      const insert: SessionInsert = {
        user_id: userId,
        date: vars.date,
        type: "yoga",
        status: "done",
        minutes: vars.minutes,
        notes: "",
      };
      const { error } = await supabase.from("sessions").insert(insert);
      if (error) throw new Error(error.message);
    },
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
