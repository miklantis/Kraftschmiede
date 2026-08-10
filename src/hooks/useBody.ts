import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
    queryFn: async (): Promise<BodyLogRow | null> => {
      const { data, error } = await supabase
        .from("body_log")
        .select("*")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as BodyLogRow | null) ?? null;
    },
  });
}
