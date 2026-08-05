// 1RM-Schaetzung. Drei etablierte Formeln plus Mittelwert (Default).

import { round2 } from "./math";
import type { EngineSet, RmFormula } from "./types";

export function brzycki(w: number, r: number): number {
  return r >= 37 ? 0 : (w * 36) / (37 - r);
}

export function epley(w: number, r: number): number {
  return w * (1 + r / 30);
}

export function wathan(w: number, r: number): number {
  return (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r));
}

// Geschaetztes 1RM aus Gewicht und Wiederholungen. reps=1 ergibt das Gewicht selbst.
export function oneRM(w: number, r: number, formula?: RmFormula): number {
  if (!w || !r) return 0;
  if (r === 1) return w;
  switch (formula) {
    case "brzycki":
      return brzycki(w, r);
    case "epley":
      return epley(w, r);
    case "wathan":
      return wathan(w, r);
    default:
      return (brzycki(w, r) + epley(w, r) + wathan(w, r)) / 3; // Mittelwert
  }
}

/** Hoechste Wiederholungszahl, die als Beweis fuer einen 1RM-Rekord gilt.
 *  Saetze darueber sind zu weit weg vom Maximum, um den Rekord anzuheben. */
export const RECORD_MAX_REPS = 5;

export interface Best1RM {
  value: number | null;
  lowConfidence: boolean;
}

// Bestes 1RM aus sauberen Arbeitssaetzen (done, kein Aufwaermen, kein Versagen).
// lowConfidence, wenn der beste Satz aus hohen Wiederholungen (>10) stammt.
export function best1RMFromSets(sets: EngineSet[], formula?: RmFormula): Best1RM {
  let best = 0;
  let lowConf = false;
  (sets || []).forEach((s) => {
    if (s.type === "warmup" || !s.done || s.failed) return;
    const e = oneRM(s.weight, s.reps, formula);
    if (e > best) {
      best = e;
      lowConf = s.reps > 10;
    }
  });
  return { value: best ? round2(best) : null, lowConfidence: lowConf };
}

// ---- Rekord-Regel -----------------------------------------------------------
// Das gespeicherte 1RM einer Uebung ist ein beweisgebundener Rekord: die
// Automatik im normalen Training hebt ihn nur an, und nur aus Saetzen mit
// hoechstens RECORD_MAX_REPS Wiederholungen. Sie senkt ihn nie von allein -
// dafuer gibt es den bewussten 1RM-Test.

/** Bester Rekord-Kandidat: hoechstes geschaetztes 1RM aus sauberen
 *  Arbeitssaetzen mit hoechstens RECORD_MAX_REPS Wiederholungen. */
export function record1RMFromSets(
  sets: EngineSet[],
  formula?: RmFormula,
): number | null {
  let best = 0;
  (sets || []).forEach((s) => {
    if (s.type === "warmup" || !s.done || s.failed) return;
    if (!s.reps || s.reps > RECORD_MAX_REPS) return;
    const e = oneRM(s.weight, s.reps, formula);
    if (e > best) best = e;
  });
  return best ? round2(best) : null;
}

export interface RecordUpdateInput {
  /** Bisher gespeicherter Rekord der Uebung (null/0 = noch keiner). */
  current: number | null;
  /** Kandidat aus Saetzen mit <= RECORD_MAX_REPS Wiederholungen. */
  record: number | null;
  /** Bester Schaetzwert der Einheit ueber alle sauberen Saetze - nur fuer die
   *  Erstbefuellung, wenn es noch gar keinen Rekord gibt. */
  estimate: number | null;
}

/** Neuer Rekord-Wert oder null, wenn der Rekord unveraendert bleibt.
 *  - Ohne bisherigen Rekord wird erstbefuellt (Kandidat, sonst Schaetzwert),
 *    damit eine frische Uebung ueberhaupt ein Arbeitsgewicht bekommt.
 *  - Mit bisherigem Rekord hebt nur ein hoeherer Kandidat an; nie senken. */
export function nextRecord1RM(input: RecordUpdateInput): number | null {
  const current = input.current ?? 0;
  if (current <= 0) return input.record ?? input.estimate ?? null;
  if (input.record != null && input.record > current) return input.record;
  return null;
}
