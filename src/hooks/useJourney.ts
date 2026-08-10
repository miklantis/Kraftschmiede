import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
      const { data, error } = await supabase
        .from("journeys")
        .select("*, phases(*)")
        .eq("active", true)
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
