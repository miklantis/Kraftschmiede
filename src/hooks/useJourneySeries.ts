import { useSyncExternalStore } from "react";
import {
  JOURNEY_SERIES_STORAGE_KEY,
  parseSeriesKeys,
  serializeSeriesKeys,
  toggleSeriesKey,
  type JourneySeriesKey,
} from "@/lib/journeyChart";

// Geraete-lokaler Store dafuer, welche Serien in den Journey-Verlaufskacheln
// gezeichnet werden. Bewusst dasselbe Muster wie usePinnedCharts/usePinnedGoals
// (kein TanStack-Query/Supabase): der Schalterstand liegt nur auf diesem
// Geraet, getrennt vom synchronisierten Datenbestand, und haelt sich ueber
// Neuladen. Er gilt fuer alle Kacheln gemeinsam – ein Schalter je Serie, nicht
// je Uebung.

function read(): JourneySeriesKey[] {
  if (typeof window === "undefined") return parseSeriesKeys(null);
  try {
    return parseSeriesKeys(
      window.localStorage.getItem(JOURNEY_SERIES_STORAGE_KEY),
    );
  } catch {
    return parseSeriesKeys(null);
  }
}

let snapshot: JourneySeriesKey[] = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function write(next: JourneySeriesKey[]): void {
  snapshot = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        JOURNEY_SERIES_STORAGE_KEY,
        serializeSeriesKeys(next),
      );
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
    if (e.key === JOURNEY_SERIES_STORAGE_KEY) {
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

function getSnapshot(): JourneySeriesKey[] {
  return snapshot;
}

export interface UseJourneySeries {
  /** Eingeschaltete Serien, immer in der festen Serien-Reihenfolge. */
  active: JourneySeriesKey[];
  has: (key: JourneySeriesKey) => boolean;
  toggle: (key: JourneySeriesKey) => void;
}

export function useJourneySeries(): UseJourneySeries {
  const active = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    active,
    has: (key) => active.includes(key),
    toggle: (key) => write(toggleSeriesKey(snapshot, key)),
  };
}
