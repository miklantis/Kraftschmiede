import { useQuery } from "@tanstack/react-query";
import { leseZeile } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
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
    queryKey: queryKeys.archivedJourney(userId, journeyId),
    enabled: userId !== null && journeyId !== null,
    queryFn: async (): Promise<ArchivedJourneyDetail | null> => {
      const row = await leseZeile<JourneyRow & { phases: PhaseRow[] }>({
        tabelle: "journeys",
        spalten: "*, phases(*)",
        gleich: { id: journeyId as string },
      });
      if (!row) return null;
      const { phases, ...journey } = row;
      const sorted = (phases ?? [])
        .slice()
        .sort((a, b) => a.position - b.position);
      return { ...journey, phases: sorted };
    },
  });
}
