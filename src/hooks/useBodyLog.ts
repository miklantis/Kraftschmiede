import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { BodyLogRow } from "@/schemas";

// Alle Befinden-Eintraege (Muskelkater/Readiness/Schmerz) des Nutzers, neueste
// zuerst. Speist Rest-Empfehlung, Kater-Figur und Verlaufsliste auf der
// Koerper-Seite. Der heutige Eintrag und der letzte werden in der View daraus
// abgeleitet.
export function useBodyLog() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.bodyLog(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<BodyLogRow[]> => {
      const { data, error } = await supabase
        .from("body_log")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as BodyLogRow[];
    },
  });
}
