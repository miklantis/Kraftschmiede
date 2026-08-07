// Reine Helfer fuer die Koerpermessung (InBody/BIA): Aufbereitung der Mess-
// Zeitreihe je Metrik fuer den Chart und Anzeige-Chips je Messung. Kein
// DOM-/DB-Bezug.
// Portiert aus V1 (charts.js BODY_METRIC/bodyMetricSeries, app.js compChips).

import { fmtScore } from "@/lib/format";
import type { CompositionRow } from "@/schemas";

// Anzeige-Metriken des Mess-Charts -> DB-Spalte, Einheit, Achsen-Polster.
export type BodyMetric = "weight" | "fat" | "muscle" | "water" | "phase";

interface MetricDef {
  field: keyof CompositionRow;
  unit: string;
  pad: number;
  label: string;
  short: string;
}

export const BODY_METRIC: Record<BodyMetric, MetricDef> = {
  weight: { field: "weight", unit: "kg", pad: 0.5, label: "Gewicht", short: "Gewicht" },
  fat: { field: "body_fat_pct", unit: "%", pad: 0.3, label: "Körperfett", short: "Fett" },
  muscle: { field: "skeletal_muscle_kg", unit: "kg", pad: 0.3, label: "Muskelmasse", short: "Muskel" },
  water: { field: "tbw_kg", unit: "kg", pad: 0.3, label: "Körperwasser", short: "Wasser" },
  phase: { field: "phase_angle", unit: "°", pad: 0.15, label: "Phasenwinkel", short: "Phasenw." },
};

export const BODY_METRIC_OPTIONS: ReadonlyArray<{ key: BodyMetric; label: string }> = (
  ["weight", "fat", "muscle", "water", "phase"] as const
).map((k) => ({ key: k, label: BODY_METRIC[k].short }));

export interface BodyMetricSeries {
  vals: number[];
  unit: string;
  pad: number;
  label: string;
}

// Werte-Reihe einer Metrik aus den Messungen (alt -> neu), null-Werte fallen
// weg. So zeigt der Chart nur Messungen, fuer die die Metrik vorliegt.
export function bodyMetricSeries(
  rows: readonly CompositionRow[],
  metric: BodyMetric,
): BodyMetricSeries {
  const def = BODY_METRIC[metric] ?? BODY_METRIC.weight;
  const sorted = rows
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const vals: number[] = [];
  for (const r of sorted) {
    const v = r[def.field];
    if (typeof v === "number" && !Number.isNaN(v)) vals.push(v);
  }
  return { vals, unit: def.unit, pad: def.pad, label: def.label };
}

// Anzeige-Chips einer Messung (nur vorhandene Felder). Fett bevorzugt Prozent.
export function compChips(e: CompositionRow): string[] {
  const v: string[] = [];
  if (e.weight != null) v.push(fmtScore(e.weight) + " kg");
  if (e.body_fat_pct != null) v.push("Fett " + fmtScore(e.body_fat_pct) + " %");
  else if (e.body_fat_kg != null) v.push("Fett " + fmtScore(e.body_fat_kg) + " kg");
  if (e.skeletal_muscle_kg != null)
    v.push("Muskel " + fmtScore(e.skeletal_muscle_kg) + " kg");
  if (e.tbw_kg != null) v.push("Wasser " + fmtScore(e.tbw_kg) + " kg");
  if (e.ecw_kg != null) v.push("ECW " + fmtScore(e.ecw_kg) + " kg");
  if (e.icw_kg != null) v.push("ICW " + fmtScore(e.icw_kg) + " kg");
  if (e.phase_angle != null) v.push("Phasenw. " + fmtScore(e.phase_angle) + "°");
  if (e.visceral_fat != null) v.push("Viszeral " + fmtScore(e.visceral_fat));
  return v;
}
