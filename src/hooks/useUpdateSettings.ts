import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { RecoveryWindows, Timers } from "@/schemas/shared";
import type { SettingsRow } from "@/schemas";

// Aenderung an den Einstellungen schreiben. Die Zeile existiert immer (beim
// ersten Start per Seed angelegt), daher ein gezieltes Update auf die eigene
// user_id. Es duerfen einzelne Felder geschickt werden; die jsonb-Felder
// (recovery_windows, timers) werden als vollstaendiges Objekt uebergeben - die
// aufrufende Karte kennt den aktuellen Stand und mischt die Aenderung selbst
// hinein. Nach Erfolg wird der Einstellungs-Cache neu geladen.
export type SettingsPatch = Partial<
  Pick<
    SettingsRow,
    | "rm_formula"
    | "weekly_frequency_target"
    | "weight_step"
    | "unit"
    | "recovery_windows"
    | "timers"
  >
>;

export type { RecoveryWindows, Timers };

export function useUpdateSettings(): {
  update: (patch: SettingsPatch) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (patch: SettingsPatch): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      const { error } = await supabase
        .from("settings")
        .update(patch)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", userId] });
    },
  });

  return {
    update: (patch) => mutation.mutateAsync(patch),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
