import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { ZeitraumRow } from "@/schemas";

// Alle Zeitraeume des Nutzers, juengster Start zuerst (dann Anlage). RLS
// scope't auf den Nutzer; der Query-Key traegt die user_id, damit beim
// Kontowechsel nichts gemischt wird.
export function useZeitraeume() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["zeitraeume", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<ZeitraumRow[]> => {
      const { data, error } = await supabase
        .from("zeitraeume")
        .select("*")
        .order("start_datum", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ZeitraumRow[];
    },
  });
}
