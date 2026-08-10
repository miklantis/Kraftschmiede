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

// Von der Journey vorgegebene Last: Referenzgewicht x Lastfaktor der Phase.
// `cap` = true, solange der Lastfaktor unter 1 liegt – dann ist `weight`
// zugleich Zielwert und Obergrenze: die Rampe der Journey steuert das Gewicht,
// nicht die Tagesform. Bei Lastfaktor 1 (Abschlussphase) wirkt `weight` nur als
// Untergrenze, damit die Journey wieder exakt am alten Niveau ankommt und der
// Coach von dort normal weiterarbeitet.
export interface RampLoad {
  weight: number;
  cap: boolean;
}

export interface SuggestOpts {
  bar?: Bar;
  plates?: number[];
  // Vorhandene Kurzhantel-Stufen. Ist die Liste gesetzt und nicht leer, wird das
  // Gewicht auf die naechste feste Stufe gerundet statt mit Scheiben geladen.
  dumbbells?: number[];
  reentry?: boolean;
  // Vorgabe einer Lastfaktor-Journey; ohne sie rechnet der Coach wie gewohnt.
  ramp?: RampLoad | null;
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

  // Rampenlast der Journey, auf eine ladbare Stufe abgerundet.
  const ramp =
    o.ramp && o.ramp.weight > 0
      ? { weight: ld(o.ramp.weight, true), cap: o.ramp.cap }
      : null;

  // Die Vorgabe der Journey auf einen fertigen Vorschlag anwenden.
  // `reacting` = der Vorschlag geht wegen Versagen/zu hoher Anstrengung nach
  // unten; dann deckelt die Rampe nur, sie hebt nichts an. `capReps` sind die
  // Wiederholungen, die stehen bleiben, wenn der Deckel eine Gewichtssteigerung
  // schluckt (sonst faellt die doppelte Progression auf das Bandende zurueck).
  const withRamp = (
    res: SuggestResult,
    reacting?: boolean,
    capReps?: number,
  ): SuggestResult => {
    if (!ramp) return res;
    if (!ramp.cap) {
      // Abschlussphase: nur Untergrenze, und nur wenn nicht gerade gesenkt wird.
      if (reacting || res.weight >= ramp.weight - 1e-9) return res;
      return {
        weight: ramp.weight,
        targetReps: res.targetReps,
        decision: "increase",
        note: "Abschlussphase – zurueck auf das Referenzgewicht",
      };
    }
    if (res.weight > ramp.weight + 1e-9) {
      return {
        weight: ramp.weight,
        targetReps: capReps ?? res.targetReps,
        decision: reacting ? res.decision : "hold",
        note: reacting
          ? res.note
          : "Lastfaktor der Phase – Gewicht bleibt gedeckelt",
      };
    }
    if (!reacting && res.weight < ramp.weight - 1e-9) {
      return {
        weight: ramp.weight,
        targetReps: res.targetReps,
        decision: "increase",
        note: "Lastfaktor der Phase – Gewicht auf die Phasenlast angehoben",
      };
    }
    return res;
  };

  if (reentry) {
    // Wiedereinstieg: nur erhoehen bei Score <= 3 und Technik ok; abrunden.
    const wsR = workSets(lastEntry);
    const okScore = wsR.length ? avg(wsR.map((s) => s.score || 3)) <= 3 : true;
    const techOk = !wsR.some((s) => s.painFlag);
    if (wsR.length && okScore && techOk) {
      return withRamp({
        weight: ld(W + 2.5, true),
        targetReps: range[0],
        decision: "increase",
        note: "Wiedereinstieg: vorsichtig +Schritt, abgerundet",
      });
    }
    // Gehalten wird hier wegen zu hoher Anstrengung oder Schmerz (ohne Vordaten
    // dagegen nur mangels Grundlage): im ersten Fall darf eine Rampe nicht
    // hochziehen, sondern nur deckeln.
    return withRamp(
      {
        weight: ld(W, true),
        targetReps: range[0],
        decision: "hold",
        note: "Wiedereinstieg: Gewicht halten",
      },
      wsR.length > 0,
    );
  }

  const ws = workSets(lastEntry);
  if (!ws.length) {
    return withRamp({
      weight: ld(W, false),
      targetReps: range[1],
      decision: "hold",
      note: "keine Vordaten – Startgewicht halten",
    });
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
      return withRamp(
        {
          weight: ld(W - 2.5, true),
          targetReps: range[1],
          decision: "decrease",
          note: "Versagen/Reduktion oder zu hart – Gewicht senken",
        },
        true,
      );
    }
    return withRamp(
      {
        weight: ld(W, false),
        targetReps: range[1],
        decision: "hold",
        note: "hart/verfehlt – Gewicht halten",
      },
      true,
    );
  }

  // alles erreicht und leichter als Ziel -> doppelte Progression
  if (allMet && avgScore < tScore) {
    if (minReps >= range[1]) {
      // oberes Repband erreicht -> Gewicht hoch, Reps zurueck auf Minimum
      return withRamp(
        {
          weight: ld(W + 2.5, false),
          targetReps: range[0],
          decision: "increase",
          note: "Repband oben erreicht – Gewicht +Schritt, Reps zuruecksetzen",
        },
        false,
        range[1],
      );
    }
    // sonst zuerst Wiederholungen steigern
    return withRamp({
      weight: ld(W, false),
      targetReps: Math.min(range[1], maxReps + 1),
      decision: "increase-reps",
      note: "leichter als Ziel – Wiederholungen steigern (Gewicht gleich)",
    });
  }

  // im Ziel, aber Reps nicht voll oder metTarget false -> halten
  return withRamp({
    weight: ld(W, false),
    targetReps: range[1],
    decision: "hold",
    note: "im Ziel – Gewicht halten, Repband ausreizen",
  });
}
