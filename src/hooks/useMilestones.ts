import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { ExerciseMilestoneRow } from "@/schemas";

// Meilensteine einer Uebung. RLS scope't auf den Nutzer; der Query-Key traegt
// user_id und exercise_id, damit je Uebung getrennt gecached wird und beim
// Kontowechsel nichts gemischt wird. Aelteste zuerst (position, dann created).
export function useMilestones(exerciseId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.milestones(userId, exerciseId),
    enabled: userId !== null && exerciseId !== "",
    queryFn: async (): Promise<ExerciseMilestoneRow[]> => {
      const { data, error } = await supabase
        .from("exercise_milestones")
        .select("*")
        .eq("exercise_id", exerciseId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ExerciseMilestoneRow[];
    },
  });
}
