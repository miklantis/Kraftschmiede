import { useSyncExternalStore } from "react";
import {
  hasPin,
  parsePins,
  serializePins,
  togglePin,
  PIN_GOALS_STORAGE_KEY,
  type PinnedChart,
} from "@/lib/pinnedCharts";
import type { ExMetric } from "@/lib/exerciseHistory";

// Geraete-lokaler Store dafuer, ob bei einer angehefteten Kachel der
// „Ziele"-Umschalter an ist. Bewusst dasselbe Muster wie usePinnedCharts (kein
// TanStack-Query/Supabase): der Zustand liegt nur auf diesem Geraet, getrennt
// vom synchronisierten Datenbestand, und haelt sich ueber Neuladen. Nutzt die
// gleichen reinen Helfer wie die Pins, nur mit eigenem Speicher-Schluessel;
// Eintraege haben dieselbe {exerciseId, metric}-Form.

function read(): PinnedChart[] {
  if (typeof window === "undefined") return [];
  try {
    return parsePins(window.localStorage.getItem(PIN_GOALS_STORAGE_KEY));
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
      window.localStorage.setItem(PIN_GOALS_STORAGE_KEY, serializePins(next));
    }
  } catch {
    // Schreiben kann scheitern (privater Modus o. Ae.) - der In-Memory-Stand
    // bleibt trotzdem korrekt, damit die Sitzung weiter funktioniert.
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === PIN_GOALS_STORAGE_KEY) {
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

export interface UsePinnedGoals {
  has: (exerciseId: string, metric: ExMetric) => boolean;
  toggle: (exerciseId: string, metric: ExMetric) => void;
}

export function usePinnedGoals(): UsePinnedGoals {
  const shown = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    has: (exerciseId, metric) => hasPin(shown, exerciseId, metric),
    toggle: (exerciseId, metric) =>
      write(togglePin(snapshot, exerciseId, metric)),
  };
}
