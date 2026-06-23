import { useSyncExternalStore } from "react";
import {
  LIVE_STORAGE_KEY,
  newLiveId,
  parseLive,
  serializeLive,
  type LiveSession,
} from "@/lib/liveSession";

// Geraete-lokaler Store der laufenden Live-Session. Bewusst KEIN TanStack-Query/
// Supabase: die laufende Einheit ist ein Arbeitsobjekt auf diesem Geraet (genau
// wie die angehefteten Charts, usePinnedCharts). Ein winziger externer Store
// haelt das global gemountete Live-Panel und die Trainingsseite in Sync, ohne
// Props durchzureichen. Persistiert werden nur `session` und `collapsed`; die
// Uebergangs-Flags (pending/ending/entering) sind fluechtig.
//
// Start-Uebergang wie V1: beim Bestaetigen faehrt erst das Start-Popup nach
// unten raus, dann steigt das Panel von unten herein - die beiden Bewegungen
// ueberlagern sich nicht. Deshalb wird die Session erst nach der Popup-Ausblende-
// Dauer scharfgeschaltet.

/** Muss zur Ausblende-Dauer des Overlay-Primitives passen (overlay.tsx). */
const START_EXIT_MS = 320;

interface LiveState {
  /** Laufende Einheit (das Panel ist sichtbar, wenn != null). */
  session: LiveSession | null;
  /** Vorgemerkte Einheit, solange das Start-Popup offen ist. */
  pending: LiveSession | null;
  /** Ende-Popup offen. */
  ending: boolean;
  /** Eingeklappt (Mini-Streifen) vs. aufgeklappt. */
  collapsed: boolean;
  /** Mobile Reinfahr-Animation fuer genau einen Frame scharf. */
  entering: boolean;
}

function read(): { session: LiveSession | null; collapsed: boolean } {
  if (typeof window === "undefined") return { session: null, collapsed: false };
  try {
    return parseLive(window.localStorage.getItem(LIVE_STORAGE_KEY));
  } catch {
    return { session: null, collapsed: false };
  }
}

const initial = read();
let state: LiveState = {
  session: initial.session,
  pending: null,
  ending: false,
  collapsed: initial.collapsed,
  entering: false,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function persist(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        LIVE_STORAGE_KEY,
        serializeLive({ session: state.session, collapsed: state.collapsed }),
      );
    }
  } catch {
    // Schreiben kann scheitern (privater Modus o. Ae.) - der In-Memory-Stand
    // bleibt korrekt, damit die Sitzung weiterlaeuft.
  }
}

function set(patch: Partial<LiveState>): void {
  state = { ...state, ...patch };
  persist();
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Aenderungen in einem anderen Tab uebernehmen (z. B. dort beendet).
  const onStorage = (e: StorageEvent): void => {
    if (e.key === LIVE_STORAGE_KEY) {
      const next = read();
      state = {
        ...state,
        session: next.session,
        collapsed: next.collapsed,
        pending: null,
        ending: false,
        entering: false,
      };
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

function getSnapshot(): LiveState {
  return state;
}

// ---- Aktionen ---------------------------------------------------------------

export interface StartWorkoutInput {
  templateId: string;
  title: string;
  exercisesPreview: string[];
}

/** Start-Popup oeffnen: die Einheit vormerken (noch nicht laufen lassen). */
function openStartWorkout(input: StartWorkoutInput): void {
  if (state.session) return; // bereits eine Einheit aktiv
  const pending: LiveSession = {
    id: newLiveId(),
    kind: "workout",
    templateId: input.templateId,
    title: input.title,
    startedAt: Date.now(),
    exercisesPreview: input.exercisesPreview,
  };
  set({ pending });
}

/** Start abbrechen (Popup schliessen, Vormerkung verwerfen). */
function cancelStart(): void {
  set({ pending: null });
}

/**
 * Starten bestaetigen: Popup ausfahren lassen, danach das Panel aufgeklappt
 * hereinfahren. Die Startzeit wird erst jetzt gesetzt (Vorschau-Zeit zaehlt
 * nicht mit).
 */
function confirmStart(): void {
  const p = state.pending;
  if (!p) return;
  set({ pending: null });
  window.setTimeout(() => {
    if (state.session) return;
    set({
      session: { ...p, startedAt: Date.now() },
      collapsed: false,
      entering: !isDesktop(),
    });
  }, START_EXIT_MS);
}

/** Reinfahr-Animation abschalten (vom Panel nach animationend gemeldet). */
function clearEntering(): void {
  if (state.entering) set({ entering: false });
}

function setCollapsed(value: boolean): void {
  if (state.collapsed !== value) set({ collapsed: value });
}

/** Ende-Popup oeffnen. */
function requestEnd(): void {
  if (state.session) set({ ending: true });
}

function closeEnd(): void {
  set({ ending: false });
}

/**
 * Einheit beenden. Lieferung 1: beide Wege schliessen die Einheit nur lokal -
 * es gibt noch keine Saetze zu speichern. Das normalisierte Schreiben in den
 * Verlauf kommt mit Lieferung 4 (dann unterscheiden sich Speichern/Verwerfen).
 */
function endSession(): void {
  set({ session: null, pending: null, ending: false, collapsed: false, entering: false });
}

export function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(min-width:960px)").matches
  );
}

export interface UseLiveSession extends LiveState {
  openStartWorkout: (input: StartWorkoutInput) => void;
  cancelStart: () => void;
  confirmStart: () => void;
  clearEntering: () => void;
  collapse: () => void;
  expand: () => void;
  setCollapsed: (value: boolean) => void;
  requestEnd: () => void;
  closeEnd: () => void;
  save: () => void;
  discard: () => void;
}

export function useLiveSession(): UseLiveSession {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snap,
    openStartWorkout,
    cancelStart,
    confirmStart,
    clearEntering,
    collapse: () => setCollapsed(true),
    expand: () => setCollapsed(false),
    setCollapsed,
    requestEnd,
    closeEnd,
    save: endSession,
    discard: endSession,
  };
}
