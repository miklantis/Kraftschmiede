import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";

// Liest die Zuordnung (journey_workouts) einer Journey und liefert die Menge der
// zugewiesenen Workout-Ids (template_id). Datenzugriff gekapselt; die Komponente
// kennt Supabase nicht. Bei fehlender Journey-Id ist die Abfrage inaktiv.
export function useJourneyWorkouts(journeyId: string | null) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["journeyWorkouts", userId, journeyId],
    enabled: userId !== null && journeyId !== null,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("journey_workouts")
        .select("template_id")
        .eq("journey_id", journeyId as string);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ template_id: string }>;
      return new Set(rows.map((r) => r.template_id));
    },
  });
}
