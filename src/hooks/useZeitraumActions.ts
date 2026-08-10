import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseZeitraumStore } from "@/lib/zeitraumStore";
import { writeZeitraumAction } from "@/lib/zeitraumWrite";
import type { ZeitraumAction, ZeitraumFelder } from "@/lib/zeitraumWrite";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die Zeitraeume, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand). Der Hook traegt nur noch Absicht und Auffrischung; die
// Datenbank-Handgriffe liegen hinter der Naht (lib/zeitraumStore.ts), die
// Abfolge in lib/zeitraumWrite.ts. Der Marker ist reiner Timeline-Kontext, es
// haengt nichts weiter daran.

export type { ZeitraumFelder };

export function useZeitraumActions(): {
  add: (felder: ZeitraumFelder) => Promise<void>;
  update: (id: string, felder: ZeitraumFelder) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: ZeitraumAction): Promise<void> =>
      writeZeitraumAction(supabaseZeitraumStore, userId, action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.zeitraeume);
    },
  });

  return {
    add: (felder) => mutation.mutateAsync({ type: "add", felder }),
    update: (id, felder) => mutation.mutateAsync({ type: "update", id, felder }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
