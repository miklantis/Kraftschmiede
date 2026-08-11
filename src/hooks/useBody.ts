import { useQuery } from "@tanstack/react-query";
import { leseZeile } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { BodyLogRow } from "@/schemas";

// Zuletzt erfasster Koerperzustand (Kater/Readiness). Speist Eignung und
// Erholungs-Anzeige. null, wenn noch nie erfasst.
export function useLatestBody() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.latestBody(userId),
    enabled: userId !== null,
    queryFn: (): Promise<BodyLogRow | null> =>
      leseZeile<BodyLogRow>({
        tabelle: "body_log",
        sortierung: [{ spalte: "date", absteigend: true }],
        grenze: 1,
      }),
  });
}
