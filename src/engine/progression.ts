// Gewichtsvorschlag fuer die naechste Einheit (Doppelprogression).
// Erst Wiederholungen im Repband steigern, dann das Gewicht; bei Versagen oder
// zu hoher Anstrengung halten oder senken. Reentry = vorsichtiger Wiedereinstieg.

import { avg } from "./math";
import { nearestLoadable, nearestDumbbell } from "./plates";
import { metTarget, workSets } from "./target";
import type { Bar, SetEntry } from "./types";

export interface SuggestExercise {
  workWeight?: number;
  repRange?: [number, number];
  targetScore?: number;
  barId?: string;
}

export interface SuggestOpts {
  bar?: Bar;
  plates?: number[];
  // Vorhandene Kurzhantel-Stufen. Ist die Liste gesetzt und nicht leer, wird das
  // Gewicht auf die naechste feste Stufe gerundet statt mit Scheiben geladen.
  dumbbells?: number[];
  reentry?: boolean;
}

export type SuggestDecision = "increase" | "hold" | "decrease" | "increase-reps";

export interface SuggestResult {
  weight: number;
  targetReps: number;
  decision: SuggestDecision;
  note: string;
}

const DEFAULT_PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];

export function suggestWeight(
  ex: SuggestExercise,
  lastEntry: SetEntry | null | undefined,
  opts?: SuggestOpts,
): SuggestResult {
  const o = opts ?? {};
  const bar = o.bar ?? { weight: 20 };
  const plates = o.plates ?? DEFAULT_PLATES;
  const range = ex.repRange ?? [8, 12];
  const tScore = ex.targetScore || 3;
  const W = ex.workWeight || bar.weight;
  const reentry = !!o.reentry;

  const ld = (x: number, down?: boolean): number =>
    o.dumbbells && o.dumbbells.length
      ? nearestDumbbell(x, o.dumbbells, !!down)
      : nearestLoadable(x, bar.weight, plates, !!down);

  if (reentry) {
    // Wiedereinstieg: nur erhoehen bei Score <= 3 und Technik ok; abrunden.
    const wsR = workSets(lastEntry);
    const okScore = wsR.length ? avg(wsR.map((s) => s.score || 3)) <= 3 : true;
    const techOk = !wsR.some((s) => s.painFlag);
    if (wsR.length && okScore && techOk) {
      return {
        weight: ld(W + 2.5, true),
        targetReps: range[0],
        decision: "increase",
        note: "Wiedereinstieg: vorsichtig +Schritt, abgerundet",
      };
    }
    return {
      weight: ld(W, true),
      targetReps: range[0],
      decision: "hold",
      note: "Wiedereinstieg: Gewicht halten",
    };
  }

  const ws = workSets(lastEntry);
  if (!ws.length) {
    return {
      weight: ld(W, false),
      targetReps: range[1],
      decision: "hold",
      note: "keine Vordaten – Startgewicht halten",
    };
  }

  const allMet = ws.every((s) => metTarget(s) === true);
  const anyFailed = ws.some((s) => s.failed);
  const anyReduced = ws.some(
    (s) => s.targetWeight != null && s.weight < s.targetWeight - 1e-9,
  );
  const avgScore = avg(ws.map((s) => s.score || tScore));
  const maxReps = Math.max(...ws.map((s) => s.reps || 0));
  const minReps = Math.min(...ws.map((s) => s.reps || 0));

  // ueber Ziel-Score / Versagen / Last-Reduktion -> halten oder senken
  if (anyFailed || anyReduced || avgScore > tScore + 0.5) {
    if (avgScore >= 4.5 || anyReduced) {
      return {
        weight: ld(W - 2.5, true),
        targetReps: range[1],
        decision: "decrease",
        note: "Versagen/Reduktion oder zu hart – Gewicht senken",
      };
    }
    return {
      weight: ld(W, false),
      targetReps: range[1],
      decision: "hold",
      note: "hart/verfehlt – Gewicht halten",
    };
  }

  // alles erreicht und leichter als Ziel -> doppelte Progression
  if (allMet && avgScore < tScore) {
    if (minReps >= range[1]) {
      // oberes Repband erreicht -> Gewicht hoch, Reps zurueck auf Minimum
      return {
        weight: ld(W + 2.5, false),
        targetReps: range[0],
        decision: "increase",
        note: "Repband oben erreicht – Gewicht +Schritt, Reps zuruecksetzen",
      };
    }
    // sonst zuerst Wiederholungen steigern
    return {
      weight: ld(W, false),
      targetReps: Math.min(range[1], maxReps + 1),
      decision: "increase-reps",
      note: "leichter als Ziel – Wiederholungen steigern (Gewicht gleich)",
    };
  }

  // im Ziel, aber Reps nicht voll oder metTarget false -> halten
  return {
    weight: ld(W, false),
    targetReps: range[1],
    decision: "hold",
    note: "im Ziel – Gewicht halten, Repband ausreizen",
  };
}
