// Phasenwechsel: das Arbeitsgewicht einmalig an die neue Repband-Zone anpassen,
// statt es nur Session fuer Session nachlaufen zu lassen. Reine Rechnung – kennt
// weder DB noch Phase, bekommt nur ein geschaetztes 1RM und die Zielzone.

import { nearestDumbbell, nearestLoadable } from "./plates";
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
  note: string;
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

  if (!(est1RM != null && est1RM > 0)) {
    return { weight: cur, decision: "hold", note: "kein 1RM – Gewicht halten" };
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
        note: "Phasenwechsel: bereits passend, Gewicht halten",
      };
    }
    return {
      weight: capped,
      decision: "raise",
      note: "Phasenwechsel: Last gepuffert auf neue Zone angehoben",
    };
  }
  return {
    weight: target,
    decision: "lower",
    note: "Phasenwechsel: zu schwere Last auf leichtere Zone gesenkt",
  };
}

// ---- Anker einer lastgesteuerten Phase ---------------------------------------

export interface AnchorOpts {
  bar?: Bar;
  plates?: number[];
  /** Vorhandene Kurzhantel-Stufen (nur fuer Kurzhantel-Uebungen gesetzt). */
  dumbbells?: number[];
  /** Bisher getragenes Arbeitsgewicht; Bezug fuer die Aufwaerts-Deckelung. */
  currentWeight?: number;
  maxUpPct?: number;
}

// Anker einer Phase, die ihre Last selbst plant: das Arbeitsgewicht bei der
// Start-Intensitaet der Phase (Prozent des 1RM). Alle weiteren Wochen der Phase
// ergeben sich daraus als Vielfaches (loadShareForWeek in engine/intensity.ts).
//
// Anders als workWeightForPhase kommt das Ziel hier nicht aus dem Repband,
// sondern direkt aus der Prozentangabe der Phase - genau die Zahl, die im
// Trainingsplan steht. Gemeinsam bleibt die Haltung: nach oben vorsichtig und
// gedeckelt, nach unten direkt, immer abgerundet.
//
// null, wenn kein brauchbares 1RM vorliegt: dann plant die Phase die Last fuer
// diese Uebung nicht und der Coach steuert wie gewohnt.
export function anchorForIntensity(
  est1RM: number | null | undefined,
  intensityStart: number | null | undefined,
  opts?: AnchorOpts,
): number | null {
  if (!(est1RM != null && est1RM > 0)) return null;
  if (!(intensityStart != null && intensityStart > 0)) return null;

  const o = opts ?? {};
  const bar = o.bar ?? { weight: 20 };
  const plates = o.plates ?? DEFAULT_PLATES;
  const maxUp = o.maxUpPct == null ? 0.12 : o.maxUpPct;
  const ld = (x: number): number =>
    o.dumbbells && o.dumbbells.length
      ? nearestDumbbell(x, o.dumbbells, true)
      : nearestLoadable(x, bar.weight, plates, true);

  const ziel = ld((est1RM * intensityStart) / 100);
  const cur = o.currentWeight;
  if (cur == null || !(cur > 0) || ziel <= cur) return ziel;

  // Nach oben nur gepuffert: ein Sprung in die neue Phase soll nicht auf einen
  // Schlag mehr als maxUp zulegen.
  const deckel = ld(cur * (1 + maxUp));
  return ziel > deckel ? deckel : ziel;
}
