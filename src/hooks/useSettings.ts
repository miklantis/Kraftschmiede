import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { SettingsRow } from "@/schemas";

// Einstellungen des Nutzers (genau eine Zeile, Primaerschluessel user_id).
// null, solange noch keine Zeile existiert.
export function useSettings() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.settings(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<SettingsRow | null> => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as SettingsRow | null) ?? null;
    },
  });
}
