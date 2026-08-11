import { useQuery } from "@tanstack/react-query";
import { leseZeile } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { JourneyRow, PhaseRow } from "@/schemas";

// Aktive Journey samt ihrer Phasen (nach position geordnet). null, wenn keine
// aktive Journey existiert.
export interface ActiveJourney extends JourneyRow {
  phases: PhaseRow[];
}

export function useActiveJourney() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.activeJourney(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<ActiveJourney | null> => {
      const row = await leseZeile<JourneyRow & { phases: PhaseRow[] }>({
        tabelle: "journeys",
        spalten: "*, phases(*)",
        gleich: { active: true },
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
