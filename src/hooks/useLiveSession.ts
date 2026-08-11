import { useSyncExternalStore } from "react";
import {
  LIVE_STORAGE_KEY,
  newLiveId,
  parseLive,
  serializeLive,
  hasEntries,
  type LiveEntry,
  type LiveGeneralWarmupSet,
  type LiveSession,
  type WorkoutSession,
  type RmTestSession,
  type SkillSession,
  type SkillLiveExercise,
} from "@/lib/liveSession";
import { adjustedRest, startedRest, type RestState } from "@/lib/liveRest";
import {
  autoRestAfterSkillSet,
  autoRestAfterWorkSet,
  type AutoRestDecision,
} from "@/lib/liveAutoRest";
import {
  withAppendedSet,
  withBar,
  withRemovedSet,
  withSetDone,
  withSetValue,
  withWarmDone,
  withWarmValue,
} from "@/lib/liveEntries";
import {
  withAppendedGeneral,
  withGeneralDone,
  withGeneralMinutes,
  withGeneralMode,
  withRemovedGeneral,
} from "@/lib/liveWarmup";
import { withSkillDone, withSkillValue } from "@/lib/liveSkillEdit";
import { clickTick, ensureAudio } from "@/lib/liveAudio";
import { istDesktopJetzt } from "@/hooks/useIsDesktop";

// Geraete-lokaler Store der laufenden Live-Session. Bewusst KEIN TanStack-Query/
// Supabase: die laufende Einheit ist ein Arbeitsobjekt auf diesem Geraet (genau
// wie die angehefteten Charts, usePinnedCharts). Ein winziger externer Store
// haelt das global gemountete Live-Panel und die Trainingsseite in Sync, ohne
// Props durchzureichen. Persistiert werden nur `session` und `collapsed`; die
// Uebergangs-Flags (pending/ending/entering) sind fluechtig.
//
// Zustaendigkeit (Vorhaben #55): Der Store HAELT den Zustand, SICHERT ihn im
// Geraetespeicher und loest die Seiteneffekte aus (Ton, Pause, Uhr). ENTSCHIEDEN
// und UMGEFORMT wird ausserhalb, in reinen und getesteten Funktionen:
//   liveFlow      - naechstes To-do, Pausen-Typ, Fortschritt
//   liveEntries   - Saetze und Aufwaermsaetze je Uebung
//   liveRest      - Pausen-Rechnung
//   liveAutoRest  - Entscheidung nach einem abgehakten Satz
//   liveWarmup    - allgemeines Aufwaermen (Cardio)
//   liveSkillEdit - Aenderungen an den Skill-Uebungen
// Der Store enthaelt selbst keine Datenumformung mehr. Bewusst hier geblieben:
// cyclePlateMode (Anzeige, keine Fachregel) und die Skill-Uhr, die nur festhaelt,
// welche Uhr gerade laeuft - der Takt liegt in SkillWatchValue.tsx.
//
// Start-Uebergang wie V1: beim Bestaetigen faehrt erst das Start-Popup nach
// unten raus, dann steigt das Panel von unten herein - die beiden Bewegungen
// ueberlagern sich nicht. Deshalb wird die Session erst nach der Popup-Ausblende-
// Dauer scharfgeschaltet.

/** Muss zur Ausblende-Dauer des Overlay-Primitives passen (overlay.tsx). */
const START_EXIT_MS = 320;

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
  /** Laufende Stoppuhr einer Skill-Dauer-Uebung (Lieferung 5) oder null.
   *  Fluechtig: nur eine Uhr zugleich; der Tick laeuft lokal in der Zelle. */
  skillWatch: { ei: number; si: number } | null;
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
  skillWatch: null,
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
        skillWatch: null,
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
  journeyId: string | null;
  phaseId: string | null;
  /** Hinweis zur vorgegebenen Last der Phase; null ohne Lastfaktor-Journey. */
  loadNote: string | null;
  entries: WorkoutSession["entries"];
  generalWarmup: WorkoutSession["generalWarmup"];
}

/** Start-Popup oeffnen: die Einheit vormerken (noch nicht laufen lassen). */
function openStartWorkout(input: StartWorkoutInput): void {
  if (state.session) return; // bereits eine Einheit aktiv
  const pending: LiveSession = {
    id: newLiveId(),
    kind: "workout",
    templateId: input.templateId,
    journeyId: input.journeyId,
    phaseId: input.phaseId,
    loadNote: input.loadNote,
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

export interface StartSkillInput {
  skillId: string;
  skillName: string;
  phaseIndex: number;
  mastered: boolean;
  exercises: SkillLiveExercise[];
}

/** Skill-Start-Popup oeffnen: die Einheit vormerken (noch nicht laufen lassen). */
function openStartSkill(input: StartSkillInput): void {
  if (state.session) return;
  const pending: SkillSession = {
    id: newLiveId(),
    kind: "skill",
    title: input.skillName,
    startedAt: Date.now(),
    skillId: input.skillId,
    phaseIndex: input.phaseIndex,
    mastered: input.mastered,
    exercises: input.exercises,
  };
  set({ pending });
}

export interface StartRmTestInput {
  exerciseId: string;
  /** Anzeigename der Uebung (Kopf, Mini-Streifen, Dialoge). */
  exerciseName: string;
  /** Rekord vor dem Test. */
  previousRm: number | null;
  entry: LiveEntry;
  generalWarmup: RmTestSession["generalWarmup"];
}

/** 1RM-Test starten. Bewusst ohne Start-Popup: der Test wird auf der
 *  Uebungsseite ausgeloest und faehrt direkt als Panel herein. */
function startRmTest(input: StartRmTestInput): void {
  if (state.session) return; // nur eine laufende Einheit zugleich
  set({
    session: {
      id: newLiveId(),
      kind: "rmtest",
      title: "1RM-Test · " + input.exerciseName,
      startedAt: Date.now(),
      exerciseId: input.exerciseId,
      previousRm: input.previousRm,
      generalWarmup: input.generalWarmup,
      entries: [input.entry],
    },
    pending: null,
    ending: false,
    collapsed: false,
    entering: !istDesktopJetzt(),
    rest: null,
    plateShow: {},
    skillWatch: null,
  });
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
      entering: !istDesktopJetzt(),
      rest: null,
      plateShow: {},
      skillWatch: null,
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
 * Laufende Einheit lokal raeumen. Verwerfen ruft das direkt; Speichern ruft es
 * erst, nachdem der Schreib-Hook (useFinishSession) die Saetze normalisiert in
 * den Verlauf geschrieben (bzw. die Mutation pausiert/vorgemerkt) hat.
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
    skillWatch: null,
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

/**
 * Umgeformte Uebungen uebernehmen. Die Umformung selbst liegt in
 * `@/lib/liveEntries`; hier wird nur gehalten und gesichert. Kam dieselbe
 * Referenz zurueck, gab es nichts zu aendern - dann feuert auch kein set().
 */
function applyEntries(fn: (entries: LiveEntry[]) => LiveEntry[]): void {
  const s = state.session;
  if (!hasEntries(s)) return;
  const entries = fn(s.entries);
  if (entries === s.entries) return;
  set({ session: { ...s, entries } });
}

/** Wie applyEntries, aber fuer das allgemeine Aufwaermen (`@/lib/liveWarmup`). */
function applyGeneralWarmup(
  fn: (sets: LiveGeneralWarmupSet[]) => LiveGeneralWarmupSet[],
): void {
  const s = state.session;
  if (!hasEntries(s)) return;
  const sets = fn(s.generalWarmup.sets);
  if (sets === s.generalWarmup.sets) return;
  set({ session: { ...s, generalWarmup: { sets } } });
}

/** Wie applyEntries, aber fuer die Skill-Uebungen (`@/lib/liveSkillEdit`). */
function applySkillExercises(
  fn: (exercises: SkillLiveExercise[]) => SkillLiveExercise[],
): void {
  const s = state.session;
  if (!s || s.kind !== "skill") return;
  const exercises = fn(s.exercises);
  if (exercises === s.exercises) return;
  set({ session: { ...s, exercises } });
}

/** Pause starten (nur wenn Sekunden > 0). Gerechnet wird in `@/lib/liveRest`. */
function startRest(type: RestState["type"], sec: number): void {
  set({ rest: startedRest(type, sec, Date.now()) });
}

function adjustRest(delta: number): void {
  const r = state.rest;
  if (!r) return;
  set({ rest: adjustedRest(r, delta, Date.now()) });
}

function skipRest(): void {
  if (state.rest) set({ rest: null });
}

/** Die Auto-Pausen-Entscheidung ausfuehren (entschieden wird in liveAutoRest). */
function applyAutoRest(decision: AutoRestDecision): void {
  if (decision.kind === "clear") skipRest();
  else if (decision.kind === "start") startRest(decision.type, decision.sec);
}

/** Arbeitssatz abhaken/loesen; bei Abhaken ggf. Auto-Pause (V1 onSetCompleted). */
function toggleWorkSet(ei: number, si: number): void {
  const s = state.session;
  if (!hasEntries(s)) return;
  const cur = s.entries[ei]?.sets[si];
  if (!cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  const entries = withSetDone(s.entries, ei, si, nextDone);
  set({ session: { ...s, entries } });
  if (nextDone) applyAutoRest(autoRestAfterWorkSet(entries, ei, prefs));
}

/** Aufwaermsatz abhaken/loesen (kein Pausen-Timer). */
function toggleWarmSet(ei: number, wi: number): void {
  const s = state.session;
  if (!hasEntries(s)) return;
  const cur = s.entries[ei]?.warmupSets[wi];
  if (!cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  applyEntries((entries) => withWarmDone(entries, ei, wi, nextDone));
}

/** Allgemeines Aufwaermen (Cardio) abhaken/loesen. */
function toggleGeneralWarmup(si: number): void {
  const s = state.session;
  if (!hasEntries(s)) return;
  const cur = s.generalWarmup.sets[si];
  if (!cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  applyGeneralWarmup((sets) => withGeneralDone(sets, si, nextDone));
}

/** Wert eines Arbeitssatzes uebernehmen (Wdh/kg/RIR). */
function commitSetValue(
  ei: number,
  si: number,
  kind: "reps" | "weight" | "score",
  value: number,
): void {
  const istRmTest = state.session?.kind === "rmtest";
  applyEntries((entries) => withSetValue(entries, ei, si, kind, value, istRmTest));
}

/** Wert eines Aufwaermsatzes uebernehmen (Wdh/kg). */
function commitWarmupValue(
  ei: number,
  wi: number,
  kind: "reps" | "weight",
  value: number,
): void {
  applyEntries((entries) => withWarmValue(entries, ei, wi, kind, value));
}

/** Satz anhaengen (Zielwerte des letzten Satzes). */
function addSet(ei: number): void {
  applyEntries((entries) => withAppendedSet(entries, ei));
}

/** Letzten Satz entfernen (mindestens einer bleibt). */
function delSet(ei: number): void {
  applyEntries((entries) => withRemovedSet(entries, ei));
}

/** Stange einer Langhantel-Uebung wechseln. */
function changeBar(ei: number, bar: { id: string; name: string; weight: number }): void {
  applyEntries((entries) => withBar(entries, ei, bar));
}

/** Scheiben-Anzeige je Uebung durchschalten (0 -> 1 -> 2 -> 0). */
function cyclePlateMode(ei: number): void {
  const next = ((state.plateShow[ei] ?? 0) + 1) % 3;
  set({ plateShow: { ...state.plateShow, [ei]: next } });
}

/** Dauer (Minuten) eines Aufwaerm-Cardio-Satzes uebernehmen. */
function commitGeneralWarmupMinutes(si: number, value: number): void {
  applyGeneralWarmup((sets) => withGeneralMinutes(sets, si, value));
}

/** Art (Rad/Rudern/...) eines Aufwaerm-Cardio-Satzes setzen. */
function setGeneralWarmupMode(si: number, mode: string): void {
  applyGeneralWarmup((sets) => withGeneralMode(sets, si, mode));
}

/** Aufwaerm-Cardio-Satz anhaengen (5 min, Art Vario). */
function addGeneralWarmup(): void {
  applyGeneralWarmup(withAppendedGeneral);
}

/** Letzten Aufwaerm-Cardio-Satz entfernen (mindestens einer bleibt). */
function delGeneralWarmup(): void {
  applyGeneralWarmup(withRemovedGeneral);
}

// ---- Skill-Einheit (Lieferung 5) -------------------------------------------

/** Skill-Satz abhaken/loesen; bei Abhaken ggf. Auto-Pause (wie V1). */
function toggleSkillSet(ei: number, si: number): void {
  const s = state.session;
  if (!s || s.kind !== "skill") return;
  const cur = s.exercises[ei]?.sets[si];
  if (!cur) return;
  const nextDone = !cur.done;
  ensureAudio();
  clickTick(nextDone, audioPrefs());
  applySkillExercises((exercises) => withSkillDone(exercises, ei, si, nextDone));
  if (nextDone) applyAutoRest(autoRestAfterSkillSet(prefs));
}

/** Ergebniswert eines Skill-Satzes uebernehmen (Wdh oder Sekunden, ganzzahlig). */
function commitSkillValue(ei: number, si: number, value: number): void {
  applySkillExercises((exercises) => withSkillValue(exercises, ei, si, value));
}

/** Stoppuhr einer Skill-Dauer-Uebung scharfschalten (nur eine zugleich). */
function startSkillWatch(ei: number, si: number): void {
  set({ skillWatch: { ei, si } });
}

/** Stoppuhr beenden. */
function stopSkillWatch(): void {
  if (state.skillWatch) set({ skillWatch: null });
}

export interface LiveBarChoice {
  id: string;
  name: string;
  weight: number;
}

export interface UseLiveSession extends LiveState {
  openStartWorkout: (input: StartWorkoutInput) => void;
  openStartSkill: (input: StartSkillInput) => void;
  startRmTest: (input: StartRmTestInput) => void;
  cancelStart: () => void;
  confirmStart: () => void;
  clearEntering: () => void;
  collapse: () => void;
  expand: () => void;
  setCollapsed: (value: boolean) => void;
  requestEnd: () => void;
  closeEnd: () => void;
  clear: () => void;
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
  // Skill-Einheit (Lieferung 5)
  toggleSkillSet: (ei: number, si: number) => void;
  commitSkillValue: (ei: number, si: number, value: number) => void;
  startSkillWatch: (ei: number, si: number) => void;
  stopSkillWatch: () => void;
}

export function useLiveSession(): UseLiveSession {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ...snap,
    openStartWorkout,
    openStartSkill,
    startRmTest,
    cancelStart,
    confirmStart,
    clearEntering,
    collapse: () => setCollapsed(true),
    expand: () => setCollapsed(false),
    setCollapsed,
    requestEnd,
    closeEnd,
    clear: endSession,
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
    toggleSkillSet,
    commitSkillValue,
    startSkillWatch,
    stopSkillWatch,
  };
}
