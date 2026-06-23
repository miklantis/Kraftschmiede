// Reine Helfer fuer die Koerpermessung (InBody/BIA): Aufbereitung der Mess-
// Zeitreihe je Metrik fuer den Chart, Anzeige-Chips je Messung und die
// Normalisierung des Import-JSON auf die DB-Spalten. Kein DOM-/DB-Bezug.
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
  if (e.phase_angle != null) v.push("Phasenw. " + fmtScore(e.phase_angle) + "°");
  if (e.visceral_fat != null) v.push("Viszeral " + fmtScore(e.visceral_fat));
  return v;
}

// --- Import-Normalisierung ---------------------------------------------------
// Das Import-JSON kommt aus dem InBody-Skill (camelCase, mit Zusatzfeldern wie
// id/source/heightCm/age, die das V2-Schema nicht kennt). Wir nehmen nur date +
// die acht numerischen Kernwerte und mappen auf die DB-Spalten. snake_case wird
// als Fallback akzeptiert. user_id setzt der Hook.

export interface CompImportRow {
  date: string;
  weight: number | null;
  body_fat_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  tbw_kg: number | null;
  phase_angle: number | null;
  visceral_fat: number | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function numOrNull(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const raw = obj[k];
    if (raw == null) continue;
    const n = typeof raw === "string" ? Number(raw.replace(",", ".")) : Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

// Beliebiges geparstes JSON (Objekt mit composition[] ODER reines Array) in
// saubere Import-Zeilen wandeln. Eintraege ohne gueltiges ISO-Datum fallen weg.
// Reine Funktion (kein JSON.parse) – gut testbar.
export function normalizeCompositionRows(raw: unknown): CompImportRow[] {
  let arr: unknown;
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).composition))
    arr = (raw as Record<string, unknown>).composition;
  else arr = null;
  if (!Array.isArray(arr)) return [];

  const out: CompImportRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const date = typeof o.date === "string" ? o.date.trim() : "";
    if (!ISO_DATE.test(date)) continue;
    out.push({
      date,
      weight: numOrNull(o, "weight"),
      body_fat_kg: numOrNull(o, "bodyFatKg", "body_fat_kg"),
      body_fat_pct: numOrNull(o, "bodyFatPct", "body_fat_pct"),
      skeletal_muscle_kg: numOrNull(o, "skeletalMuscleKg", "skeletal_muscle_kg"),
      tbw_kg: numOrNull(o, "tbwKg", "tbw_kg"),
      phase_angle: numOrNull(o, "phaseAngle", "phase_angle"),
      visceral_fat: numOrNull(o, "visceralFat", "visceral_fat"),
    });
  }
  return out;
}

// Roh-Text -> Import-Zeilen. Wirft bei ungueltigem JSON oder wenn keine
// verwertbare Messung gefunden wurde (mit deutscher Meldung).
export function parseCompositionText(text: string): CompImportRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Kein gültiges JSON. Bitte den Text prüfen.");
  }
  const rows = normalizeCompositionRows(parsed);
  if (!rows.length) {
    throw new Error(
      "Keine Messung erkannt. Erwartet wird { \"composition\": [ … ] } mit je einem date.",
    );
  }
  return rows;
}

// Beispiel-JSON fuer den "Beispiel"-Knopf der Import-Karte.
export const COMPOSITION_EXAMPLE = JSON.stringify(
  {
    composition: [
      {
        date: "2026-06-15",
        weight: 79.8,
        bodyFatKg: 15.7,
        bodyFatPct: 19.7,
        skeletalMuscleKg: 38.9,
        tbwKg: 48.4,
        phaseAngle: 6.2,
        visceralFat: 8,
      },
    ],
  },
  null,
  2,
);
