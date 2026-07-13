// Abschnitt 1 – Inventar. Spiegelt inventory_bars, inventory_plates,
// inventory_kettlebells, inventory_equipment.

import { z } from "zod";
import { uuid } from "./shared";

// inventory_bars – Stangen (Langhantel-Typen). is_default markiert die Standardstange.
export const inventoryBarRow = z.object({
  id: uuid,
  user_id: uuid,
  key: z.string().nullable(),
  name: z.string(),
  weight: z.number(),
  is_default: z.boolean(),
  position: z.number().int(),
});
export type InventoryBarRow = z.infer<typeof inventoryBarRow>;

export const inventoryBarInsert = inventoryBarRow
  .omit({ id: true })
  .partial({ key: true, is_default: true, position: true });
export type InventoryBarInsert = z.infer<typeof inventoryBarInsert>;

// inventory_plates – verfuegbare Scheiben-Typen (kein Bestandszaehler).
export const inventoryPlateRow = z.object({
  id: uuid,
  user_id: uuid,
  weight: z.number(),
  position: z.number().int(),
});
export type InventoryPlateRow = z.infer<typeof inventoryPlateRow>;

export const inventoryPlateInsert = inventoryPlateRow
  .omit({ id: true })
  .partial({ position: true });
export type InventoryPlateInsert = z.infer<typeof inventoryPlateInsert>;

// inventory_kettlebells – verfuegbare Kettlebell-Gewichte.
export const inventoryKettlebellRow = z.object({
  id: uuid,
  user_id: uuid,
  weight: z.number(),
  position: z.number().int(),
});
export type InventoryKettlebellRow = z.infer<typeof inventoryKettlebellRow>;

export const inventoryKettlebellInsert = inventoryKettlebellRow
  .omit({ id: true })
  .partial({ position: true });
export type InventoryKettlebellInsert = z.infer<typeof inventoryKettlebellInsert>;

// inventory_dumbbells – verfuegbare Kurzhantel-Gewichte (festes Gewicht je Stueck).
export const inventoryDumbbellRow = z.object({
  id: uuid,
  user_id: uuid,
  weight: z.number(),
  position: z.number().int(),
});
export type InventoryDumbbellRow = z.infer<typeof inventoryDumbbellRow>;

export const inventoryDumbbellInsert = inventoryDumbbellRow
  .omit({ id: true })
  .partial({ position: true });
export type InventoryDumbbellInsert = z.infer<typeof inventoryDumbbellInsert>;

// inventory_equipment – Equipment-Tor fuer Skills (key wird von Skill-Phasen referenziert).
export const inventoryEquipmentRow = z.object({
  id: uuid,
  user_id: uuid,
  key: z.string(),
  label: z.string(),
  active: z.boolean(),
  position: z.number().int(),
});
export type InventoryEquipmentRow = z.infer<typeof inventoryEquipmentRow>;

export const inventoryEquipmentInsert = inventoryEquipmentRow
  .omit({ id: true })
  .partial({ active: true, position: true });
export type InventoryEquipmentInsert = z.infer<typeof inventoryEquipmentInsert>;
