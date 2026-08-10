import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { JourneyRow } from "@/schemas";

// Abgeschlossene (nicht mehr aktive) Journeys fuer das Archiv auf der
// Journey-Seite. Nur die Journey-Zeilen selbst – Zeitraum und Dauer rechnet
// lib/journeyArchive daraus und aus dem ohnehin geladenen Verlauf.
export function useArchivedJourneys() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.archivedJourneys(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<JourneyRow[]> => {
      const { data, error } = await supabase
        .from("journeys")
        .select("*")
        .eq("active", false);
      if (error) throw new Error(error.message);
      return (data ?? []) as JourneyRow[];
    },
  });
}
