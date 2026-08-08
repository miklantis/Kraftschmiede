import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { JourneyRow, PhaseRow } from "@/schemas";

// Eine einzelne archivierte Journey samt ihrer Phasen (nach position geordnet)
// fuer die Rueckschau-Seite. Gleiche Bauform wie useActiveJourney, nur ueber die
// Id statt ueber das Aktiv-Kennzeichen.
export interface ArchivedJourneyDetail extends JourneyRow {
  phases: PhaseRow[];
}

export function useArchivedJourney(journeyId: string | null) {
  const userId = useUserId();
  return useQuery({
    queryKey: ["archivedJourney", userId, journeyId],
    enabled: userId !== null && journeyId !== null,
    queryFn: async (): Promise<ArchivedJourneyDetail | null> => {
      const { data, error } = await supabase
        .from("journeys")
        .select("*, phases(*)")
        .eq("id", journeyId as string)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const row = data as JourneyRow & { phases: PhaseRow[] };
      const { phases, ...journey } = row;
      const sorted = (phases ?? [])
        .slice()
        .sort((a, b) => a.position - b.position);
      return { ...journey, phases: sorted };
    },
  });
}
