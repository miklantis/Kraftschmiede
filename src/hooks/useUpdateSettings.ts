import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseAusstattungStore } from "@/lib/ausstattungStore";
import { writeAusstattungAction } from "@/lib/ausstattungWrite";
import { useUserId } from "./useUserId";
import type { RecoveryWindows, Timers } from "@/schemas/shared";
import type { SettingsRow } from "@/schemas";

// Aenderung an den Einstellungen schreiben. Die Zeile existiert immer (beim
// ersten Start per Seed angelegt), daher ein gezieltes Update auf die eigene
// user_id – so bleibt es bei genau einer Zeile pro Nutzer. Es duerfen einzelne
// Felder geschickt werden; die jsonb-Felder (recovery_windows, timers) werden
// als vollstaendiges Objekt uebergeben - die aufrufende Karte kennt den
// aktuellen Stand und mischt die Aenderung selbst hinein. Nach Erfolg wird der
// Einstellungs-Cache neu geladen. Der Datenbank-Handgriff liegt hinter der Naht
// (lib/ausstattungStore.ts), die Abfolge in lib/ausstattungWrite.ts.
export type SettingsPatch = Partial<
  Pick<
    SettingsRow,
    | "rm_formula"
    | "weekly_frequency_target"
    | "weight_step"
    | "unit"
    | "recovery_windows"
    | "timers"
    | "avatar"
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
    mutationFn: (patch: SettingsPatch): Promise<void> =>
      writeAusstattungAction(supabaseAusstattungStore, userId, {
        type: "updateEinstellungen",
        patch,
      }),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.settingsUpdate);
    },
  });

  return {
    update: (patch) => mutation.mutateAsync(patch),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
