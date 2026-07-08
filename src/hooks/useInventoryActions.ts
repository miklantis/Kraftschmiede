import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";

// Schreibzugriffe aufs Inventar, gebuendelt in einem Hook. Alle Aktionen laufen
// ueber eine Mutation (gemeinsamer Lade-/Fehlerzustand); nach Erfolg wird die
// passende Liste neu geladen. Stangen sind ein festes Set (in der DB gepflegt)
// und hier nicht schreibbar. Scheiben/Kettlebells werden in der Anzeige nach
// Gewicht sortiert, daher genuegt die Standard-position.
type InventoryAction =
  | { type: "addPlate"; weight: number }
  | { type: "delPlate"; id: string }
  | { type: "addKb"; weight: number }
  | { type: "delKb"; id: string }
  | { type: "toggleEquip"; key: string; active: boolean };

export function useInventoryActions(): {
  addPlate: (weight: number) => Promise<void>;
  deletePlate: (id: string) => Promise<void>;
  addKettlebell: (weight: number) => Promise<void>;
  deleteKettlebell: (id: string) => Promise<void>;
  toggleEquipment: (key: string, active: boolean) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (action: InventoryAction): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");
      let error: { message: string } | null = null;

      switch (action.type) {
        case "addPlate": {
          ({ error } = await supabase
            .from("inventory_plates")
            .insert({ user_id: userId, weight: action.weight }));
          break;
        }
        case "delPlate": {
          ({ error } = await supabase
            .from("inventory_plates")
            .delete()
            .eq("id", action.id));
          break;
        }
        case "addKb": {
          ({ error } = await supabase
            .from("inventory_kettlebells")
            .insert({ user_id: userId, weight: action.weight }));
          break;
        }
        case "delKb": {
          ({ error } = await supabase
            .from("inventory_kettlebells")
            .delete()
            .eq("id", action.id));
          break;
        }
        case "toggleEquip": {
          ({ error } = await supabase
            .from("inventory_equipment")
            .update({ active: action.active })
            .eq("key", action.key));
          break;
        }
      }

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, action) => {
      const map: Record<InventoryAction["type"], string[]> = {
        addPlate: ["plates"],
        delPlate: ["plates"],
        addKb: ["kettlebells"],
        delKb: ["kettlebells"],
        toggleEquip: ["equipment", "ownedEquipment"],
      };
      for (const key of map[action.type]) {
        void queryClient.invalidateQueries({ queryKey: [key, userId] });
      }
    },
  });

  const run = (action: InventoryAction): Promise<void> =>
    mutation.mutateAsync(action);

  return {
    addPlate: (weight) => run({ type: "addPlate", weight }),
    deletePlate: (id) => run({ type: "delPlate", id }),
    addKettlebell: (weight) => run({ type: "addKb", weight }),
    deleteKettlebell: (id) => run({ type: "delKb", id }),
    toggleEquipment: (key, active) =>
      run({ type: "toggleEquip", key, active }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
