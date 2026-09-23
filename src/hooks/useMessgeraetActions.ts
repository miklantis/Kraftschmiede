import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseCompositionStore } from "@/lib/compositionStore";
import { writeMessgeraetAction } from "@/lib/compositionWrite";
import type { MessgeraetAction } from "@/lib/compositionWrite";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die Messgeraete, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand). Der Hook traegt nur Absicht und Auffrischung; die
// Datenbank-Handgriffe liegen hinter derselben Naht wie die Messungen
// (lib/compositionStore.ts), die Abfolge in lib/compositionWrite.ts.

export function useMessgeraetActions(): {
  add: (name: string) => Promise<void>;
  update: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: MessgeraetAction): Promise<void> =>
      writeMessgeraetAction(supabaseCompositionStore, userId, action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.messgeraete);
    },
  });

  return {
    add: (name) => mutation.mutateAsync({ type: "add", name }),
    update: (id, name) => mutation.mutateAsync({ type: "update", id, name }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
