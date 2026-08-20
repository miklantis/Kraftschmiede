// Phasenwechsel: das Arbeitsgewicht einmalig an die neue Repband-Zone anpassen,
// statt es nur Session fuer Session nachlaufen zu lassen. Reine Rechnung – kennt
// weder DB noch Phase, bekommt nur ein geschaetztes 1RM und die Zielzone.

import type { CoachReason } from "./coachReason";
import { nearestLoadable } from "./plates";
import type { Bar } from "./types";

// Invertierte Epley-Naeherung: Last fuer 'reps' saubere Wiederholungen bei
// gegebenem 1RM. Epley, weil als einzige Formel geschlossen invertierbar.
export function loadForReps(oneRMv: number, reps: number): number {
  if (!(oneRMv > 0) || !(reps > 0)) return 0;
  if (reps <= 1) return oneRMv;
  return oneRMv / (1 + reps / 30);
}

export interface PhaseWeightOpts {
  bar?: Bar;
  plates?: number[];
  currentWeight?: number;
  bufferReps?: number;
  maxUpPct?: number;
}

export type PhaseWeightDecision = "hold" | "raise" | "lower";

export interface PhaseWeightResult {
  weight: number;
  decision: PhaseWeightDecision;
  /** Kennung samt Zahlen; den Satz baut lib/coachText.ts (Issue #268). */
  reason: CoachReason;
}

const DEFAULT_PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];

// Zielarbeitsgewicht beim Phasenwechsel. Verletzungsbewusst & asymmetrisch:
// Anker ist das obere (leichtere) Zonenende plus RIR-Puffer, immer abgerundet.
// Nach unten direkt auf das Zielgewicht, nach oben prozentual gedeckelt.
export function workWeightForPhase(
  est1RM: number | null | undefined,
  repRange: [number, number],
  opts?: PhaseWeightOpts,
): PhaseWeightResult {
  const o = opts ?? {};
  const bar = o.bar ?? { weight: 20 };
  const plates = o.plates ?? DEFAULT_PLATES;
  const cur = o.currentWeight || bar.weight;
  const buffer = o.bufferReps == null ? 2 : o.bufferReps;
  const maxUp = o.maxUpPct == null ? 0.12 : o.maxUpPct;
  const range = repRange ?? [8, 12];

  // Differenz zum heutigen Arbeitsgewicht - Zahl fuer den Begruendungstext.
  const diffTo = (w: number): number => Math.round((w - cur) * 100) / 100;

  if (!(est1RM != null && est1RM > 0)) {
    return {
      weight: cur,
      decision: "hold",
      reason: { code: "phase-no-rm", diff: 0 },
    };
  }

  const reps = (range[1] || range[0] || 8) + buffer; // oberes Bandende + RIR
  const target = nearestLoadable(loadForReps(est1RM, reps), bar.weight, plates, true);

  if (target >= cur) {
    const cap = nearestLoadable(cur * (1 + maxUp), bar.weight, plates, true);
    let capped = target;
    if (capped > cap) capped = cap;
    if (capped <= cur) {
      return {
        weight: cur,
        decision: "hold",
        reason: { code: "phase-fit", diff: 0 },
      };
    }
    return {
      weight: capped,
      decision: "raise",
      reason: { code: "phase-raise", diff: diffTo(capped) },
    };
  }
  return {
    weight: target,
    decision: "lower",
    reason: { code: "phase-lower", diff: diffTo(target) },
  };
}
