import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { CompositionRow } from "@/schemas";

// Alle InBody-/BIA-Messungen des Nutzers, neueste zuerst. Speist den Mess-Chart
// (Metrik-Reihe) und die Mess-Liste.
export function useComposition() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.composition(userId),
    enabled: userId !== null,
    queryFn: (): Promise<CompositionRow[]> =>
      leseZeilen<CompositionRow>({
        tabelle: "composition",
        sortierung: [{ spalte: "date", absteigend: true }],
      }),
  });
}
