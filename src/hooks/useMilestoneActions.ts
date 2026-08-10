import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseExerciseStore } from "@/lib/exerciseStore";
import { writeMilestoneAction } from "@/lib/exerciseWrite";
import type { MilestoneAction } from "@/lib/exerciseWrite";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Schreibzugriffe auf die Meilensteine, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand). Nach Erfolg werden alle Meilenstein-Listen neu geladen.
// Die Datenbank-Handgriffe liegen hinter der Naht ExerciseStore/exerciseWrite;
// hier steht nur noch Absicht und Auffrischung.
// markAchieved stempelt das heutige Datum, aber nur solange achieved_at leer ist
// (Guard im Store) – idempotent, ueberschreibt kein bestehendes Erreichen-Datum.

export function useMilestoneActions(): {
  add: (exerciseId: string, name: string, targetRm: number) => Promise<void>;
  update: (id: string, name: string, targetRm: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  markAchieved: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: MilestoneAction): Promise<void> =>
      writeMilestoneAction(supabaseExerciseStore, userId, action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.milestones);
    },
  });

  return {
    add: (exerciseId, name, targetRm) =>
      mutation.mutateAsync({ type: "add", exerciseId, name, targetRm }),
    update: (id, name, targetRm) =>
      mutation.mutateAsync({ type: "update", id, name, targetRm }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    markAchieved: (id) =>
      mutation.mutateAsync({ type: "markAchieved", id, date: todayISO() }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
