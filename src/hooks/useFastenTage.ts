import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { FastenTagRow } from "@/schemas";

// Tagestexte des Fastenbegleiters, nach Tag aufsteigend. Reine Definitionen
// (Seed/Migration 0066); RLS scope't auf den Nutzer, der Query-Key traegt die
// user_id, damit beim Kontowechsel nichts gemischt wird.
export function useFastenTage() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.fastenTage(userId),
    enabled: userId !== null,
    queryFn: (): Promise<FastenTagRow[]> =>
      leseZeilen<FastenTagRow>({
        tabelle: "fasten_tage",
        sortierung: [{ spalte: "tag" }],
      }),
  });
}
