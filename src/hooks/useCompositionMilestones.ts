import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { CompositionMilestoneRow } from "@/schemas";

// Alle Koerper-Meilensteine des Nutzers (ueber alle Metriken). Die Mess-Karte
// filtert clientseitig auf die gerade gewaehlte Metrik – die Datenmenge ist
// klein, deshalb genuegt eine Abfrage. RLS scope't auf den Nutzer; der
// Query-Key traegt user_id, damit beim Kontowechsel nichts gemischt wird.
// Aelteste zuerst (position, dann created).
export function useCompositionMilestones() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.compMilestones(userId),
    enabled: userId !== null,
    queryFn: (): Promise<CompositionMilestoneRow[]> =>
      leseZeilen<CompositionMilestoneRow>({
        tabelle: "composition_milestones",
        sortierung: [{ spalte: "position" }, { spalte: "created_at" }],
      }),
  });
}
