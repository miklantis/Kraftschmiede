import { ChipEditor } from "@/components/ui/chip-editor";
import { useInventoryActions } from "@/hooks/useInventoryActions";
import type { WeightItem } from "@/hooks/useInventory";
import { fmtKg } from "@/lib/format";

// Inventar - Scheiben (pro Seite ladbar) und Kettlebells. Beide nutzen denselben
// Chip-Editor: vorhandene Gewichte als loeschbare Chips, daneben die noch nicht
// vorhandenen Standardwerte zum Hinzufuegen. Werte als Strings durch den Editor,
// hier geparst und geschrieben.
const PLATE_OPTS = [0.5, 1.25, 2.5, 5, 10, 15, 20, 25];
const KB_OPTS = [4, 6, 8, 10, 12, 16, 20, 24, 28, 32];
const DB_OPTS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

function addOptions(
  options: number[],
  present: WeightItem[],
): { value: string; label: string }[] {
  return options
    .filter((v) => !present.some((p) => p.weight === v))
    .map((v) => ({ value: String(v), label: fmtKg(v) }));
}

export function InventoryPlates({
  plates,
}: {
  plates: WeightItem[];
}): React.ReactElement {
  const { addPlate, deletePlate } = useInventoryActions();
  return (
    <ChipEditor
      chips={plates.map((p) => ({ id: p.id, label: fmtKg(p.weight) }))}
      onRemove={(id) => void deletePlate(id)}
      addOptions={addOptions(PLATE_OPTS, plates)}
      onAdd={(v) => void addPlate(Number(v))}
      emptyText="Keine Scheiben."
    />
  );
}

export function InventoryKettlebells({
  kettlebells,
}: {
  kettlebells: WeightItem[];
}): React.ReactElement {
  const { addKettlebell, deleteKettlebell } = useInventoryActions();
  return (
    <ChipEditor
      chips={kettlebells.map((k) => ({ id: k.id, label: fmtKg(k.weight) }))}
      onRemove={(id) => void deleteKettlebell(id)}
      addOptions={addOptions(KB_OPTS, kettlebells)}
      onAdd={(v) => void addKettlebell(Number(v))}
      emptyText="Keine Kettlebells."
    />
  );
}

export function InventoryDumbbells({
  dumbbells,
}: {
  dumbbells: WeightItem[];
}): React.ReactElement {
  const { addDumbbell, deleteDumbbell } = useInventoryActions();
  return (
    <ChipEditor
      chips={dumbbells.map((d) => ({ id: d.id, label: fmtKg(d.weight) }))}
      onRemove={(id) => void deleteDumbbell(id)}
      addOptions={addOptions(DB_OPTS, dumbbells)}
      onAdd={(v) => void addDumbbell(Number(v))}
      emptyText="Keine Kurzhanteln."
    />
  );
}
