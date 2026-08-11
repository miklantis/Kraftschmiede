import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
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
    queryFn: (): Promise<ExerciseMilestoneRow[]> =>
      leseZeilen<ExerciseMilestoneRow>({
        tabelle: "exercise_milestones",
        gleich: { exercise_id: exerciseId },
        sortierung: [{ spalte: "position" }, { spalte: "created_at" }],
      }),
  });
}
