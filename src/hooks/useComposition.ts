import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { CompositionRow } from "@/schemas";

// Alle InBody-/BIA-Messungen des Nutzers, neueste zuerst. Speist den Mess-Chart
// (Metrik-Reihe) und die Mess-Liste.
export function useComposition() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["composition", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<CompositionRow[]> => {
      const { data, error } = await supabase
        .from("composition")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CompositionRow[];
    },
  });
}
