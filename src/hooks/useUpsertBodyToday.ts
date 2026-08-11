import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseErfassungStore } from "@/lib/erfassungStore";
import { writeErfassungAction } from "@/lib/erfassungWrite";
import type { BefindenFelder } from "@/lib/erfassungWrite";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Schreibt den HEUTIGEN Befinden-Eintrag (genau einer pro Tag): legt ihn an
// oder ueberschreibt ihn (upsert ueber user_id+date). Wie V1 saveBodyToday –
// pain_note bleibt leer, die UI fuehrt nur den Schmerz-Schalter. Nach Erfolg
// werden Verlauf/Kater (body-log), der zuletzt erfasste Zustand (latestBody)
// und die Trainings-Empfehlung neu geladen. Der Hook traegt nur noch Absicht
// und Auffrischung; der Datenbank-Handgriff liegt hinter der Naht
// (lib/erfassungStore.ts), die Abfolge in lib/erfassungWrite.ts.
export type BodyTodayValues = BefindenFelder;

export function useUpsertBodyToday(): {
  save: (values: BodyTodayValues) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (values: BodyTodayValues): Promise<void> =>
      writeErfassungAction(supabaseErfassungStore, userId, todayISO(), {
        type: "befinden",
        felder: values,
      }),
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
