import { useSyncExternalStore } from "react";
import {
  LIVE_STORAGE_KEY,
  newLiveId,
  parseLive,
  serializeLive,
  type LiveEntry,
  type LiveSession,
} from "@/lib/liveSession";
import { appendedSet, restAfterSet } from "@/lib/liveFlow";
import { clickTick, ensureAudio } from "@/lib/liveAudio";

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

/**
 * Laufende Pause (Lieferung 3). Fluechtig, NICHT persistiert: ein Reload mitten
 * in der Pause laesst sie fallen - der Stand der Saetze bleibt aber erhalten.
 * `endsAt` ist die absolute Endzeit (ms); die Pausen-Leiste rechnet daraus den
 * Countdown und feuert das Signal beim Nulldurchgang.
 */
export interface RestState {
  type: "set" | "exercise";
  endsAt: number;
  baseSec: number;
}

/** Timer-/Ton-Einstellungen, vom Panel je Render hereingereicht (syncPrefs). */
interface LivePrefs {
  setRestSec: number;
  exerciseRestSec: number;
  autoStart: boolean;
  sound: boolean;
  vibrate: boolean;
}

const DEFAULT_PREFS: LivePrefs = {
  setRestSec: 90,
  exerciseRestSec: 150,
  autoStart: true,
  sound: true,
  vibrate: true,
};

// Modul-intern, kein Re-Render noetig: die Aktionen (Abhaken, Pause) lesen hier
// die jeweils aktuellen Einstellungen, die das Panel ueber syncPrefs setzt.
let prefs: LivePrefs = DEFAULT_PREFS;

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
  /** Laufende Pause oder null. Fluechtig. */
  rest: RestState | null;
  /** Scheiben-Anzeige je Uebung (Index): 0 aus, 1 alle Saetze, 2 nur aktiver. */
  plateShow: Record<number, number>;
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
  rest: null,
  plateShow: {},
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
        rest: null,
        plateShow: {},
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
  entries: LiveSession["entries"];
  generalWarmup: LiveSession["generalWarmup"];
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
    generalWarmup: input.generalWarmup,
    entries: input.entries,
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
      rest: null,
      plateShow: {},
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
  set({
    session: null,
    pending: null,
    ending: false,
    collapsed: false,
    entering: false,
    rest: null,
    plateShow: {},
  });
}

// ---- Gefuehrter Ablauf (Lieferung 3) ---------------------------------------

const audioPrefs = (): { sound: boolean; vibrate: boolean } => ({
  sound: prefs.sound,
  vibrate: prefs.vibrate,
});

/** Timer-/Ton-Einstellungen aus den Settings setzen (Panel ruft je Render). */
function syncPrefs(p: LivePrefs): void {
  prefs = p;
}

/** Eine Uebung immutabel ersetzen. */
function patchEntry(ei: number, fn: (e: LiveEntry) => LiveEntry): void {
  const s = state.session;
  if (!s) return;
  const entries = s.entries.map((e, i) => (i === ei ? fn(e) : e));
  set({ session: { ...s, entries } });
}

/** Pause starten (nur wenn Sekunden > 0). */
function startRest(type: "set" | "exercise", sec: number): void {
  if (sec <= 0) {
    set({ rest: null });
    return;
  }
  set({ rest: { type, endsAt: Date.now() + sec * 1000, baseSec: sec } });
}

function adjustRest(delta: number): void {
  const r = state.rest;
  if (!r) return;
  const endsAt = Math.max(Date.now(), r.endsAt) + delta * 1000;
  set({ rest: { ...r, endsAt: Math.max(Date.now(), endsAt) } });
}

function skipRest(): void {
  if (state.rest) set({ rest: null });
}

/** Arbeitssatz abhaken/loesen; bei Abhaken ggf. Auto-Pause (V1 onSetCompleted). */
function toggleWorkSet(ei: number, si: number): void {
  const s = state.session;
  const cur = s?.entries[ei]?.sets[si];
  if (!s || !cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  const entries = s.entries.map((e, i) =>
    i === ei
      ? { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, done: nextDone } : x)) }
      : e,
  );
  set({ session: { ...s, entries } });
  if (nextDone) {
    const type = restAfterSet(entries, ei); // null, wenn als Naechstes Aufwaermen/Ende
    if (type === null) {
      skipRest();
    } else if (prefs.autoStart) {
      startRest(type, type === "set" ? prefs.setRestSec : prefs.exerciseRestSec);
    }
    // autoStart aus + naechster Satz regulaer: laufende Pause unberuehrt (V1).
  }
}

/** Aufwaermsatz abhaken/loesen (kein Pausen-Timer). */
function toggleWarmSet(ei: number, wi: number): void {
  const s = state.session;
  const cur = s?.entries[ei]?.warmupSets[wi];
  if (!s || !cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  patchEntry(ei, (e) => ({
    ...e,
    warmupSets: e.warmupSets.map((w, j) => (j === wi ? { ...w, done: nextDone } : w)),
  }));
}

/** Allgemeines Aufwaermen (Cardio) abhaken/loesen. */
function toggleGeneralWarmup(si: number): void {
  const s = state.session;
  const cur = s?.generalWarmup.sets[si];
  if (!s || !cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  const sets = s.generalWarmup.sets.map((w, j) =>
    j === si ? { ...w, done: nextDone } : w,
  );
  set({ session: { ...s, generalWarmup: { sets } } });
}

/** Wert eines Arbeitssatzes uebernehmen (Wdh/kg/RIR). */
function commitSetValue(
  ei: number,
  si: number,
  kind: "reps" | "weight" | "score",
  value: number,
): void {
  patchEntry(ei, (e) => ({
    ...e,
    sets: e.sets.map((x, j) => {
      if (j !== si) return x;
      if (kind === "reps") return { ...x, reps: Math.max(0, Math.round(value) || 0) };
      if (kind === "weight") {
        // Weicht das Gewicht vom geplanten Ziel ab, wird der Satz als angepasst
        // vermerkt (relevant fuer den Verlauf in Lieferung 4) - wie V1 markAdjust.
        if (value !== x.targetWeight) {
          return { ...x, weight: value, adjusted: true, adjustNote: "Gewicht angepasst" };
        }
        return { ...x, weight: value };
      }
      // score: 5 (RIR 0) markiert den Satz als nicht geschafft (V1 failed).
      return { ...x, score: value, failed: value === 5 };
    }),
  }));
}

/** Wert eines Aufwaermsatzes uebernehmen (Wdh/kg). */
function commitWarmupValue(
  ei: number,
  wi: number,
  kind: "reps" | "weight",
  value: number,
): void {
  patchEntry(ei, (e) => ({
    ...e,
    warmupSets: e.warmupSets.map((w, j) =>
      j === wi
        ? { ...w, [kind]: kind === "reps" ? Math.max(0, Math.round(value) || 0) : value }
        : w,
    ),
  }));
}

/** Satz anhaengen (Zielwerte des letzten Satzes). */
function addSet(ei: number): void {
  patchEntry(ei, (e) => ({ ...e, sets: [...e.sets, appendedSet(e)] }));
}

/** Letzten Satz entfernen (mindestens einer bleibt). */
function delSet(ei: number): void {
  patchEntry(ei, (e) => (e.sets.length > 1 ? { ...e, sets: e.sets.slice(0, -1) } : e));
}

/** Stange einer Langhantel-Uebung wechseln. */
function changeBar(ei: number, bar: { id: string; name: string; weight: number }): void {
  patchEntry(ei, (e) => ({
    ...e,
    barId: bar.id,
    barName: bar.name,
    barWeight: bar.weight,
  }));
}

/** Scheiben-Anzeige je Uebung durchschalten (0 -> 1 -> 2 -> 0). */
function cyclePlateMode(ei: number): void {
  const next = ((state.plateShow[ei] ?? 0) + 1) % 3;
  set({ plateShow: { ...state.plateShow, [ei]: next } });
}

function patchGeneralWarmup(fn: (sets: LiveSession["generalWarmup"]["sets"]) => LiveSession["generalWarmup"]["sets"]): void {
  const s = state.session;
  if (!s) return;
  set({ session: { ...s, generalWarmup: { sets: fn(s.generalWarmup.sets) } } });
}

/** Dauer (Minuten) eines Aufwaerm-Cardio-Satzes uebernehmen. */
function commitGeneralWarmupMinutes(si: number, value: number): void {
  patchGeneralWarmup((sets) =>
    sets.map((w, j) => (j === si ? { ...w, minutes: Math.max(0, Math.round(value) || 0) } : w)),
  );
}

/** Art (Rad/Rudern/...) eines Aufwaerm-Cardio-Satzes setzen. */
function setGeneralWarmupMode(si: number, mode: string): void {
  patchGeneralWarmup((sets) => sets.map((w, j) => (j === si ? { ...w, mode } : w)));
}

/** Aufwaerm-Cardio-Satz anhaengen (5 min Rad). */
function addGeneralWarmup(): void {
  patchGeneralWarmup((sets) => [...sets, { minutes: 5, mode: "bike", done: false }]);
}

/** Letzten Aufwaerm-Cardio-Satz entfernen (mindestens einer bleibt). */
function delGeneralWarmup(): void {
  patchGeneralWarmup((sets) => (sets.length > 1 ? sets.slice(0, -1) : sets));
}

export function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(min-width:960px)").matches
  );
}

export interface LiveBarChoice {
  id: string;
  name: string;
  weight: number;
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
  // Gefuehrter Ablauf (Lieferung 3)
  syncPrefs: (p: LivePrefs) => void;
  toggleWorkSet: (ei: number, si: number) => void;
  toggleWarmSet: (ei: number, wi: number) => void;
  toggleGeneralWarmup: (si: number) => void;
  commitSetValue: (
    ei: number,
    si: number,
    kind: "reps" | "weight" | "score",
    value: number,
  ) => void;
  commitWarmupValue: (ei: number, wi: number, kind: "reps" | "weight", value: number) => void;
  addSet: (ei: number) => void;
  delSet: (ei: number) => void;
  changeBar: (ei: number, bar: LiveBarChoice) => void;
  cyclePlateMode: (ei: number) => void;
  commitGeneralWarmupMinutes: (si: number, value: number) => void;
  setGeneralWarmupMode: (si: number, mode: string) => void;
  addGeneralWarmup: () => void;
  delGeneralWarmup: () => void;
  adjustRest: (delta: number) => void;
  skipRest: () => void;
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
    syncPrefs,
    toggleWorkSet,
    toggleWarmSet,
    toggleGeneralWarmup,
    commitSetValue,
    commitWarmupValue,
    addSet,
    delSet,
    changeBar,
    cyclePlateMode,
    commitGeneralWarmupMinutes,
    setGeneralWarmupMode,
    addGeneralWarmup,
    delGeneralWarmup,
    adjustRest,
    skipRest,
  };
}
