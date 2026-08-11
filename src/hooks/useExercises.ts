import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { ExerciseRow } from "@/schemas";

// Uebungskatalog. RLS scope't auf den Nutzer; der Query-Key traegt die
// user_id, damit beim Kontowechsel nicht gemischt wird.
export function useExercises() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.exercises(userId),
    enabled: userId !== null,
    queryFn: (): Promise<ExerciseRow[]> =>
      leseZeilen<ExerciseRow>({
        tabelle: "exercises",
        sortierung: [{ spalte: "position" }],
      }),
  });
}
