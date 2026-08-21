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

/** Erstes offenes To-do innerhalb EINER Uebung: erst Aufwaerm-, dann
 *  Arbeitssatz. null = diese Uebung ist durch. */
function openInEntry(en: LiveEntry, ei: number): ActiveSet | null {
  const w = firstOpenWarm(en);
  if (w >= 0) return { ei, si: w, warm: true };
  const s = firstOpenSet(en);
  if (s >= 0) return { ei, si: s, warm: false };
  return null;
}

/**
 * Naechstes offenes To-do: pro Uebung erst die Aufwaerm-, dann die
 * Arbeitssaetze; danach die naechste Uebung. null = alles erledigt.
 *
 * `focusEi` ist die Uebung, an der gerade tatsaechlich gearbeitet wird (Vorhaben
 * #100). Sie hat Vorrang, solange sie noch etwas Offenes hat - sonst wuerde bei
 * einem Einstieg mitten in der Einheit (belegtes Rack: erst Bankdruecken) weiter
 * die erste Uebung als aktiv gefuehrt. Ist die Fokus-Uebung durch oder der Index
 * veraltet, faellt die Suche von selbst auf die lineare Reihenfolge zurueck; ein
 * Aufraeumen des Merkers braucht es deshalb nicht.
 */
export function computeActive(
  entries: LiveEntry[],
  focusEi: number | null = null,
): ActiveSet | null {
  if (focusEi !== null && focusEi >= 0 && focusEi < entries.length) {
    const inFocus = openInEntry(entries[focusEi], focusEi);
    if (inFocus) return inFocus;
  }
  for (let i = 0; i < entries.length; i++) {
    const open = openInEntry(entries[i], i);
    if (open) return open;
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
 * Pausen-Entscheidung nach einem abgehakten Arbeitssatz. `entries` muss schon
 * den abgehakten Stand tragen.
 *
 * Massgeblich ist die Uebung `ei`, in der gerade gearbeitet wurde - nicht die
 * globale Reihenfolge (Vorhaben #100): Hat sie noch einen offenen Arbeitssatz,
 * ist die kurze Satzpause faellig, egal was sonst in der Einheit noch offen ist.
 * Frueher entschied das der global naechste offene Satz; standen bei einer
 * anderen Uebung noch Aufwaermsaetze aus, blieb die Pause deshalb ganz aus.
 *
 * Ist die Uebung durch, entscheidet wie bisher der lineare Rest: alles erledigt
 * oder als Naechstes ein Aufwaermsatz (dafuer braucht es keine Pause) -> keine
 * Pause, sonst die laengere Uebungspause.
 */
export function restAfterSet(
  entries: LiveEntry[],
  ei: number,
): "set" | "exercise" | null {
  const own = entries[ei];
  if (own && firstOpenSet(own) >= 0) return "set";
  const a = computeActive(entries);
  if (!a || a.warm) return null;
  return "exercise";
}

/** Fortschritt fuer den eingeklappten Mini-Streifen (V1 liveProgressInfo). */
export interface ProgressInfo {
  total: number;
  done: number;
  exCount: number;
  curLabel: string;
  progress: string;
}

/** Wie `computeActive` bekommt auch der Fortschritt die Fokus-Uebung herein,
 *  damit "Uebung X von Y" dieselbe Uebung nennt, die im Panel gruen umrandet
 *  ist. Aufwaermsaetze zaehlen hier bewusst nicht mit (wie bisher). */
export function progressInfo(
  entries: LiveEntry[],
  focusEi: number | null = null,
): ProgressInfo {
  let total = 0;
  let done = 0;
  entries.forEach((en) => {
    en.sets.forEach((x) => {
      total++;
      if (x.done) done++;
    });
  });
  const exCount = entries.length;
  let curIdx = -1;
  if (focusEi !== null && focusEi >= 0 && focusEi < entries.length) {
    if (entries[focusEi].sets.some((x) => !x.done)) curIdx = focusEi;
  }
  if (curIdx < 0) {
    curIdx = 0;
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].sets.some((x) => !x.done)) {
        curIdx = i;
        break;
      }
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
    // Die Vorgabe der Einheit gilt auch fuer den nachgelegten Satz.
    targetScore: last ? last.targetScore : null,
    targetReps: reps,
    targetWeight: weight,
    done: false,
    failed: false,
    adjusted: false,
    adjustNote: "",
  };
}
