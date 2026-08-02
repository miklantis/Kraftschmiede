import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Schreibzugriffe auf die Meilensteine, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand). Nach Erfolg werden alle Meilenstein-Listen neu geladen.
// markAchieved stempelt das heutige Datum, aber nur solange achieved_at leer ist
// (.is-Guard) – idempotent, ueberschreibt kein bestehendes Erreichen-Datum.
type MilestoneAction =
  | { type: "add"; exerciseId: string; name: string; targetRm: number }
  | { type: "update"; id: string; name: string; targetRm: number }
  | { type: "delete"; id: string }
  | { type: "markAchieved"; id: string };

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
    mutationFn: async (action: MilestoneAction): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      let error: { message: string } | null = null;

      switch (action.type) {
        case "add": {
          ({ error } = await supabase.from("exercise_milestones").insert({
            user_id: userId,
            exercise_id: action.exerciseId,
            name: action.name,
            target_rm: action.targetRm,
          }));
          break;
        }
        case "update": {
          ({ error } = await supabase
            .from("exercise_milestones")
            .update({ name: action.name, target_rm: action.targetRm })
            .eq("id", action.id));
          break;
        }
        case "delete": {
          ({ error } = await supabase
            .from("exercise_milestones")
            .delete()
            .eq("id", action.id));
          break;
        }
        case "markAchieved": {
          ({ error } = await supabase
            .from("exercise_milestones")
            .update({ achieved_at: todayISO() })
            .eq("id", action.id)
            .is("achieved_at", null));
          break;
        }
      }

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });

  return {
    add: (exerciseId, name, targetRm) =>
      mutation.mutateAsync({ type: "add", exerciseId, name, targetRm }),
    update: (id, name, targetRm) =>
      mutation.mutateAsync({ type: "update", id, name, targetRm }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    markAchieved: (id) => mutation.mutateAsync({ type: "markAchieved", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
