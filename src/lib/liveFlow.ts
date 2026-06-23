// Gefuehrter Ablauf (Phase 11, Lieferung 3) - die reine Logik. Keine React-/
// DOM-/DB-Abhaengigkeit: nimmt die Live-Eintraege als Daten herein und gibt
// Entscheidungen heraus (naechstes To-do, Pausen-Typ, Fortschritt, neuer Satz).
// 1:1 aus V1 live.js (computeActive / firstOpenWarm / firstOpenSet /
// onSetCompleted-Entscheidung / addSet / liveProgressInfo). Der geraete-lokale
// Store (useLiveSession) ruft diese Funktionen auf; getestet ueber Vitest.

import type { LiveEntry, LiveSet } from "./liveSession";

/**
 * Das aktive To-do: genau ein offener Satz ueber die ganze Einheit. `warm`
 * unterscheidet Aufwaerm- (true) von Arbeitssatz (false) bei gleichem Index.
 */
export interface ActiveSet {
  ei: number;
  si: number;
  warm: boolean;
}

/** Erster nicht erledigter Aufwaermsatz einer Uebung, sonst -1. */
function firstOpenWarm(en: LiveEntry): number {
  for (let i = 0; i < en.warmupSets.length; i++) {
    if (!en.warmupSets[i].done) return i;
  }
  return -1;
}

/** Erster nicht erledigter Arbeitssatz einer Uebung, sonst -1. */
function firstOpenSet(en: LiveEntry): number {
  for (let i = 0; i < en.sets.length; i++) {
    if (!en.sets[i].done) return i;
  }
  return -1;
}

/**
 * Naechstes offenes To-do ueber alle Uebungen: pro Uebung erst die Aufwaerm-,
 * dann die Arbeitssaetze; danach die naechste Uebung. null = alles erledigt.
 */
export function computeActive(entries: LiveEntry[]): ActiveSet | null {
  for (let i = 0; i < entries.length; i++) {
    const w = firstOpenWarm(entries[i]);
    if (w >= 0) return { ei: i, si: w, warm: true };
    const s = firstOpenSet(entries[i]);
    if (s >= 0) return { ei: i, si: s, warm: false };
  }
  return null;
}

/** Pruefen, ob ein konkreter Satz der aktive (gruen gerahmte) ist. */
export function isActive(
  active: ActiveSet | null,
  ei: number,
  si: number,
  warm: boolean,
): boolean {
  return !!active && active.warm === warm && active.ei === ei && active.si === si;
}

/**
 * Pausen-Entscheidung nach einem abgehakten Arbeitssatz - 1:1 wie V1
 * onSetCompleted: ist als Naechstes ein Aufwaermsatz dran oder alles erledigt,
 * kommt KEINE Pause; liegt der naechste offene Satz in derselben Uebung, ist es
 * eine Satzpause, sonst die laengere Uebungspause. `entries` muss schon den
 * abgehakten Stand tragen.
 */
export function restAfterSet(
  entries: LiveEntry[],
  ei: number,
): "set" | "exercise" | null {
  const a = computeActive(entries);
  if (!a || a.warm) return null;
  return a.ei === ei ? "set" : "exercise";
}

/** Fortschritt fuer den eingeklappten Mini-Streifen (V1 liveProgressInfo). */
export interface ProgressInfo {
  total: number;
  done: number;
  exCount: number;
  curLabel: string;
  progress: string;
}

export function progressInfo(entries: LiveEntry[]): ProgressInfo {
  let total = 0;
  let done = 0;
  entries.forEach((en) => {
    en.sets.forEach((x) => {
      total++;
      if (x.done) done++;
    });
  });
  const exCount = entries.length;
  let curIdx = 0;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].sets.some((x) => !x.done)) {
      curIdx = i;
      break;
    }
  }
  return {
    total,
    done,
    exCount,
    curLabel: "Übung " + Math.min(curIdx + 1, exCount) + " von " + exCount,
    progress: done + " / " + total + " Sätze",
  };
}

/**
 * Neuer Arbeitssatz beim Antippen von "+ Satz" - uebernimmt die Zielwerte des
 * letzten Satzes (V1 addSet). Startet nicht abgehakt/angepasst.
 */
export function appendedSet(entry: LiveEntry): LiveSet {
  const last = entry.sets[entry.sets.length - 1];
  const reps = last ? last.targetReps || last.reps : 8;
  const weight = last ? last.targetWeight || last.weight : entry.barWeight ?? 0;
  const score = last ? last.score : 3;
  return {
    reps,
    weight,
    score,
    targetReps: reps,
    targetWeight: weight,
    done: false,
    failed: false,
    adjusted: false,
    adjustNote: "",
  };
}
