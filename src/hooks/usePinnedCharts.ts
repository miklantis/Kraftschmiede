import { useSyncExternalStore } from "react";
import {
  hasPin,
  parsePins,
  serializePins,
  togglePin,
  PINS_STORAGE_KEY,
  type PinnedChart,
} from "@/lib/pinnedCharts";
import type { ExMetric } from "@/lib/exerciseHistory";

// Geraete-lokaler Store fuer angeheftete Charts. Bewusst KEIN TanStack-Query/
// Supabase: die Pins liegen nur auf diesem Geraet (V1-Verhalten), getrennt vom
// synchronisierten Datenbestand. Ein winziger externer Store haelt Detailseite
// und Uebungsliste in Sync, ohne Props durchzureichen.

function read(): PinnedChart[] {
  if (typeof window === "undefined") return [];
  try {
    return parsePins(window.localStorage.getItem(PINS_STORAGE_KEY));
  } catch {
    return [];
  }
}

let snapshot: PinnedChart[] = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function write(next: PinnedChart[]): void {
  snapshot = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PINS_STORAGE_KEY, serializePins(next));
    }
  } catch {
    // Schreiben kann scheitern (privater Modus o. Ae.) - der In-Memory-Stand
    // bleibt trotzdem korrekt, damit die Sitzung weiter funktioniert.
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Aenderungen in einem anderen Tab uebernehmen.
  const onStorage = (e: StorageEvent): void => {
    if (e.key === PINS_STORAGE_KEY) {
      snapshot = read();
      emit();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): PinnedChart[] {
  return snapshot;
}

export interface UsePinnedCharts {
  pins: PinnedChart[];
  has: (exerciseId: string, metric: ExMetric) => boolean;
  toggle: (exerciseId: string, metric: ExMetric) => void;
}

export function usePinnedCharts(): UsePinnedCharts {
  const pins = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    pins,
    has: (exerciseId, metric) => hasPin(pins, exerciseId, metric),
    toggle: (exerciseId, metric) =>
      write(togglePin(snapshot, exerciseId, metric)),
  };
}
