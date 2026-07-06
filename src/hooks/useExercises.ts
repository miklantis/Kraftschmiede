import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { ExerciseRow } from "@/schemas";

// Uebungskatalog. RLS scope't auf den Nutzer; der Query-Key traegt die
// user_id, damit beim Kontowechsel nicht gemischt wird.
export function useExercises() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["exercises", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<ExerciseRow[]> => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ExerciseRow[];
    },
  });
}
