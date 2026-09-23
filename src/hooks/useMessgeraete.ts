import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { MeasurementDeviceRow } from "@/schemas";

// Alle Messgeraete des Nutzers, nach Name sortiert (so stehen sie in den
// Einstellungen und in der Auswahl an der Messung). RLS scope't auf den Nutzer;
// der Query-Key traegt die user_id, damit beim Kontowechsel nichts gemischt
// wird.
export function useMessgeraete() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.messgeraete(userId),
    enabled: userId !== null,
    queryFn: (): Promise<MeasurementDeviceRow[]> =>
      leseZeilen<MeasurementDeviceRow>({
        tabelle: "measurement_devices",
        sortierung: [{ spalte: "name" }, { spalte: "created_at" }],
      }),
  });
}
