import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { ExerciseMuscleRow } from "@/schemas";

// Feine Muskel-Beteiligung je Uebung (Tabelle exercise_muscles). Wie der
// Uebungskatalog laden wir alle Zeilen des Nutzers auf einmal und filtern
// clientseitig je Uebung; RLS scope't auf den Nutzer, der Query-Key traegt die
// user_id. Speist die MuscleMap auf der Uebungs-Detailseite (und spaeter mehr).
export function useExerciseMuscles() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.exerciseMuscles(userId),
    enabled: userId !== null,
    queryFn: (): Promise<ExerciseMuscleRow[]> =>
      leseZeilen<ExerciseMuscleRow>({ tabelle: "exercise_muscles" }),
  });
}
