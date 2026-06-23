import type { ExMetric } from "./exerciseHistory";

// Angeheftete Verlaufs-Charts ("Dashboard"). In V1 (app.js DASH) bewusst
// GERAETE-LOKAL gehalten: getrennt vom eigentlichen Datenbestand, nicht in der
// Datenbank, nicht im Export/Import, nicht synchronisiert. Diese Datei haelt
// nur die reinen Helfer + Typen; die Persistenz (localStorage) und der
// React-Store liegen in hooks/usePinnedCharts.ts.

export interface PinnedChart {
  exerciseId: string;
  metric: ExMetric;
}

// Eigener localStorage-Schluessel (analog V1 fs_dash_v013), versioniert.
export const PINS_STORAGE_KEY = "ks_pins_v1";

const VALID_METRICS: readonly ExMetric[] = [
  "rm",
  "weight",
  "reps",
  "duration",
  "volume",
];

function isValidMetric(m: unknown): m is ExMetric {
  return typeof m === "string" && (VALID_METRICS as readonly string[]).includes(m);
}

// Index eines Pins (Uebung + Metrik) oder -1.
export function pinIndex(
  pins: readonly PinnedChart[],
  exerciseId: string,
  metric: ExMetric,
): number {
  return pins.findIndex(
    (p) => p.exerciseId === exerciseId && p.metric === metric,
  );
}

// Ist genau diese Uebung+Metrik angeheftet?
export function hasPin(
  pins: readonly PinnedChart[],
  exerciseId: string,
  metric: ExMetric,
): boolean {
  return pinIndex(pins, exerciseId, metric) >= 0;
}

// Umschalten: ist der Pin da, faellt er weg; sonst kommt er ans Ende. Gibt eine
// NEUE Liste zurueck (rein, kein Mutieren des Eingangs).
export function togglePin(
  pins: readonly PinnedChart[],
  exerciseId: string,
  metric: ExMetric,
): PinnedChart[] {
  const i = pinIndex(pins, exerciseId, metric);
  if (i >= 0) return pins.filter((_, idx) => idx !== i);
  return [...pins, { exerciseId, metric }];
}

// Aus localStorage gelesenen Rohtext sicher in eine Pin-Liste uebersetzen.
// Defekte Eintraege (falsche Form, unbekannte Metrik) werden verworfen.
export function parsePins(raw: string | null): PinnedChart[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: PinnedChart[] = [];
  for (const item of data) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { exerciseId?: unknown }).exerciseId === "string" &&
      isValidMetric((item as { metric?: unknown }).metric)
    ) {
      out.push({
        exerciseId: (item as PinnedChart).exerciseId,
        metric: (item as PinnedChart).metric,
      });
    }
  }
  return out;
}

export function serializePins(pins: readonly PinnedChart[]): string {
  return JSON.stringify(pins);
}
