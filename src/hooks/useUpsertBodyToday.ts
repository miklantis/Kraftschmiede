import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Schreibt den HEUTIGEN Befinden-Eintrag (genau einer pro Tag): legt ihn an
// oder ueberschreibt ihn (upsert ueber user_id+date). Wie V1 saveBodyToday –
// pain_note bleibt leer, die UI fuehrt nur den Schmerz-Schalter. Nach Erfolg
// werden Verlauf/Kater (body-log), der zuletzt erfasste Zustand (latestBody)
// und die Trainings-Empfehlung neu geladen.
export interface BodyTodayValues {
  legs: number;
  upper_body: number;
  overall: number;
  readiness: number;
  pain_flag: boolean;
  notes: string;
}

export function useUpsertBodyToday(): {
  save: (values: BodyTodayValues) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (values: BodyTodayValues): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      const row = {
        user_id: userId,
        date: todayISO(),
        legs: values.legs,
        upper_body: values.upper_body,
        overall: values.overall,
        readiness: values.readiness,
        pain_flag: values.pain_flag,
        pain_note: "",
        notes: values.notes,
      };
      const { error } = await supabase
        .from("body_log")
        .upsert(row, { onConflict: "user_id,date" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.bodyToday);
    },
  });

  return {
    save: (values) => mutation.mutateAsync(values),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
