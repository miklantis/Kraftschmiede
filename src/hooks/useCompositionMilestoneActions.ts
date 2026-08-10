import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseCompositionStore } from "@/lib/compositionStore";
import { writeCompositionMilestoneAction } from "@/lib/compositionWrite";
import type { CompositionMilestoneAction } from "@/lib/compositionWrite";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die Koerper-Meilensteine, gebuendelt in einem Hook
// (gemeinsamer Lade-/Fehlerzustand). Reine Richtwerte: nur Anlegen, Aendern,
// Loeschen – kein Erreicht-Stempel. Nach Erfolg die Liste neu laden. Die
// Datenbank-Handgriffe liegen hinter derselben Naht wie die Messungen
// (lib/compositionStore.ts), die Abfolge in lib/compositionWrite.ts.

export function useCompositionMilestoneActions(): {
  add: (metric: string, name: string, target: number) => Promise<void>;
  update: (id: string, name: string, target: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: CompositionMilestoneAction): Promise<void> =>
      writeCompositionMilestoneAction(supabaseCompositionStore, userId, action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.compMilestones);
    },
  });

  return {
    add: (metric, name, target) =>
      mutation.mutateAsync({ type: "add", metric, name, target }),
    update: (id, name, target) =>
      mutation.mutateAsync({ type: "update", id, name, target }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
