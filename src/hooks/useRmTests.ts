import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { RmTestRow } from "@/schemas";

// 1RM-Tests einer Uebung. RLS scope't auf den Nutzer; der Query-Key traegt
// user_id und exercise_id, damit je Uebung getrennt gecached wird und beim
// Kontowechsel nichts gemischt wird. Juengste zuerst (Datum, dann Anlage).
export function useRmTests(exerciseId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.rmTests(userId, exerciseId),
    enabled: userId !== null && exerciseId !== "",
    queryFn: async (): Promise<RmTestRow[]> => {
      const { data, error } = await supabase
        .from("rm_tests")
        .select("*")
        .eq("exercise_id", exerciseId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as RmTestRow[];
    },
  });
}

/** Alle 1RM-Tests des Nutzers (fuer Verlauf und Kalender), juengste zuerst. */
export function useAllRmTests() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.rmTestsAll(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<RmTestRow[]> => {
      const { data, error } = await supabase
        .from("rm_tests")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as RmTestRow[];
    },
  });
}
