import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import { parseCompositionText } from "@/lib/composition";

// Spielt ein Mess-JSON ein (InBody-Skill-Format oder Array). Jede Messung wird
// ueber user_id+date angelegt oder ueberschrieben (gleiches Datum -> Update,
// wie V1). Gibt die Zahl importierter Messungen zurueck. Nach Erfolg wird die
// Mess-Zeitreihe neu geladen.
export function useImportComposition(): {
  importText: (text: string) => Promise<number>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (text: string): Promise<number> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      const rows = parseCompositionText(text); // wirft bei ungueltigem JSON
      const payload = rows.map((r) => ({ ...r, user_id: userId }));
      const { error } = await supabase
        .from("composition")
        .upsert(payload, { onConflict: "user_id,date" });
      if (error) throw new Error(error.message);
      return rows.length;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["composition", userId] });
    },
  });

  return {
    importText: (text) => mutation.mutateAsync(text),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
