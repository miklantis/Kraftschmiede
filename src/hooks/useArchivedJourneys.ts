import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
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
    queryFn: (): Promise<JourneyRow[]> =>
      leseZeilen<JourneyRow>({
        tabelle: "journeys",
        gleich: { active: false },
      }),
  });
}
