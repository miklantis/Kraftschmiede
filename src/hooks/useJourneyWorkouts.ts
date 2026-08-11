import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";

// Liest die Zuordnung (journey_workouts) einer Journey und liefert die Liste der
// zugewiesenen Workout-Ids (template_id). Bewusst ein Array, kein Set: der
// Offline-Cache serialisiert per JSON, und ein Set wuerde dabei zu {} zerfallen
// (fehlendes .has nach dem Rehydrieren). Die Konsumenten bilden bei Bedarf ein
// Set. Datenzugriff gekapselt; bei fehlender Journey-Id ist die Abfrage inaktiv.
export function useJourneyWorkouts(journeyId: string | null) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.journeyWorkouts(userId, journeyId),
    enabled: userId !== null && journeyId !== null,
    queryFn: async (): Promise<string[]> => {
      const rows = await leseZeilen<{ template_id: string }>({
        tabelle: "journey_workouts",
        spalten: "template_id",
        gleich: { journey_id: journeyId as string },
      });
      return rows.map((r) => r.template_id);
    },
  });
}
