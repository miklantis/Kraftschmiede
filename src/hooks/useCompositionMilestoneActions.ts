import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die Koerper-Meilensteine, gebuendelt in einem Hook
// (gemeinsamer Lade-/Fehlerzustand). Reine Richtwerte: nur Anlegen, Aendern,
// Loeschen – kein Erreicht-Stempel. Nach Erfolg die Liste neu laden.
type Action =
  | { type: "add"; metric: string; name: string; target: number }
  | { type: "update"; id: string; name: string; target: number }
  | { type: "delete"; id: string };

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
    mutationFn: async (action: Action): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      let error: { message: string } | null = null;

      switch (action.type) {
        case "add": {
          ({ error } = await supabase.from("composition_milestones").insert({
            user_id: userId,
            metric: action.metric,
            name: action.name,
            target: action.target,
          }));
          break;
        }
        case "update": {
          ({ error } = await supabase
            .from("composition_milestones")
            .update({ name: action.name, target: action.target })
            .eq("id", action.id));
          break;
        }
        case "delete": {
          ({ error } = await supabase
            .from("composition_milestones")
            .delete()
            .eq("id", action.id));
          break;
        }
      }

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["compMilestones"] });
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
