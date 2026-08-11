import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import type { QueryRoot } from "@/lib/queryKeys";
import { supabaseAusstattungStore } from "@/lib/ausstattungStore";
import { writeAusstattungAction } from "@/lib/ausstattungWrite";
import type { AusstattungAction } from "@/lib/ausstattungWrite";
import { useUserId } from "./useUserId";

// Schreibzugriffe aufs Inventar, gebuendelt in einem Hook. Alle Aktionen laufen
// ueber eine Mutation (gemeinsamer Lade-/Fehlerzustand); nach Erfolg wird die
// passende Liste neu geladen. Der Hook traegt nur noch Absicht und Auffrischung;
// die Datenbank-Handgriffe liegen hinter der Naht (lib/ausstattungStore.ts), die
// Abfolge in lib/ausstattungWrite.ts. Stangen sind ein festes Set (in der DB
// gepflegt) und hier nicht schreibbar.

/** Die Ausstattungs-Aktionen ohne die Einstellungen – die pflegt
 *  useUpdateSettings ueber dieselbe Naht. */
type InventoryAction = Exclude<
  AusstattungAction,
  { type: "updateEinstellungen" }
>;

/** Welche Liste nach welcher Aktion neu geladen wird. */
const GRUPPE: Record<InventoryAction["type"], readonly QueryRoot[]> = {
  addScheibe: INVALIDATE.plates,
  deleteScheibe: INVALIDATE.plates,
  addKettlebell: INVALIDATE.kettlebells,
  deleteKettlebell: INVALIDATE.kettlebells,
  addKurzhantel: INVALIDATE.dumbbells,
  deleteKurzhantel: INVALIDATE.dumbbells,
  toggleEquipment: INVALIDATE.equipment,
};

export function useInventoryActions(): {
  addPlate: (weight: number) => Promise<void>;
  deletePlate: (id: string) => Promise<void>;
  addKettlebell: (weight: number) => Promise<void>;
  deleteKettlebell: (id: string) => Promise<void>;
  addDumbbell: (weight: number) => Promise<void>;
  deleteDumbbell: (id: string) => Promise<void>;
  toggleEquipment: (key: string, active: boolean) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: InventoryAction): Promise<void> =>
      writeAusstattungAction(supabaseAusstattungStore, userId, action),
    onSuccess: (_data, action) => {
      invalidateGroup(queryClient, GRUPPE[action.type]);
    },
  });

  const run = (action: InventoryAction): Promise<void> =>
    mutation.mutateAsync(action);

  return {
    addPlate: (weight) => run({ type: "addScheibe", gewicht: weight }),
    deletePlate: (id) => run({ type: "deleteScheibe", id }),
    addKettlebell: (weight) => run({ type: "addKettlebell", gewicht: weight }),
    deleteKettlebell: (id) => run({ type: "deleteKettlebell", id }),
    addDumbbell: (weight) => run({ type: "addKurzhantel", gewicht: weight }),
    deleteDumbbell: (id) => run({ type: "deleteKurzhantel", id }),
    toggleEquipment: (key, active) =>
      run({ type: "toggleEquipment", key, aktiv: active }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
