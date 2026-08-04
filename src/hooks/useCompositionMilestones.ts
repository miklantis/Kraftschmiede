import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
    queryKey: ["compMilestones", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<CompositionMilestoneRow[]> => {
      const { data, error } = await supabase
        .from("composition_milestones")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CompositionMilestoneRow[];
    },
  });
}
