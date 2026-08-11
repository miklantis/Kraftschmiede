import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { ZeitraumRow } from "@/schemas";

// Alle Zeitraeume des Nutzers, juengster Start zuerst (dann Anlage). RLS
// scope't auf den Nutzer; der Query-Key traegt die user_id, damit beim
// Kontowechsel nichts gemischt wird.
export function useZeitraeume() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.zeitraeume(userId),
    enabled: userId !== null,
    queryFn: (): Promise<ZeitraumRow[]> =>
      leseZeilen<ZeitraumRow>({
        tabelle: "zeitraeume",
        sortierung: [
          { spalte: "start_datum", absteigend: true },
          { spalte: "created_at", absteigend: true },
        ],
      }),
  });
}
