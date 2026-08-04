import { useSyncExternalStore } from "react";
import {
  parseBodyView,
  serializeBodyView,
  withGoals,
  withMetric,
  BODY_VIEW_STORAGE_KEY,
  DEFAULT_BODY_VIEW,
  type BodyMeasureView,
} from "@/lib/bodyMeasureView";
import type { BodyMetric } from "@/lib/composition";

// Geraete-lokaler Store fuer die Mess-Ansicht (gewaehlte Metrik + „Ziele"-
// Zustand). Bewusst dasselbe Muster wie usePinnedCharts/usePinnedGoals (kein
// TanStack-Query/Supabase): der Zustand liegt nur auf diesem Geraet, haelt sich
// ueber Neuladen und ist nicht Teil des Exports. Ein winziger externer Store
// haelt die eine Mess-Karte in Sync, ohne Props durchzureichen.

function read(): BodyMeasureView {
  if (typeof window === "undefined") return { ...DEFAULT_BODY_VIEW };
  try {
    return parseBodyView(window.localStorage.getItem(BODY_VIEW_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_BODY_VIEW };
  }
}

let snapshot: BodyMeasureView = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function write(next: BodyMeasureView): void {
  snapshot = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BODY_VIEW_STORAGE_KEY, serializeBodyView(next));
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
    if (e.key === BODY_VIEW_STORAGE_KEY) {
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

function getSnapshot(): BodyMeasureView {
  return snapshot;
}

export interface UseBodyMeasureView {
  metric: BodyMetric;
  goals: boolean;
  setMetric: (m: BodyMetric) => void;
  setGoals: (on: boolean) => void;
}

export function useBodyMeasureView(): UseBodyMeasureView {
  const view = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    metric: view.metric,
    goals: view.goals,
    setMetric: (m) => write(withMetric(snapshot, m)),
    setGoals: (on) => write(withGoals(snapshot, on)),
  };
}
