// Die geltende Vorgabe einer Uebung – fuer das Popup "Uebung anpassen"
// (Issue #297). Dort stand bisher immer das Repband der laufenden Phase, auch
// wenn ein Wochenplan die Uebung regiert: In einer Maxkraft-Phase zeigte das
// Popup "4–6 Wdh", waehrend der Coach mit der Wiederholungsleiter der Woche
// rechnet (5/4/3/2). Die angezeigte Zahl war nicht im Spiel.
//
// Die Weiche ist deshalb dieselbe wie beim Coach (planGovernsExercise), und die
// Formulierung der Wochenzeile dieselbe wie auf der Journey-Seite (weekTargets)
// – Anzeige und Rechnung koennen so nicht auseinanderlaufen.
//
// Reine Ableitung ohne DB-/DOM-Bezug.

import { scoreInfo, DEFAULT_TARGET_SCORE } from "@/engine";
import type { WeekPlanWeek } from "@/engine";
import { planGovernsExercise } from "./coach";
import { weekTargets } from "./journey";

/** Was die Journey der Uebung gerade vorgibt, fertig formuliert. */
export interface LockedTarget {
  /** Ueberschrift des Abschnitts ("Vorgabe dieser Woche" / "Repband"). */
  label: string;
  /** Herkunft neben dem Schloss ("aus der laufenden Woche"). */
  source: string;
  /** Die Zahlen selbst ("4 × 4 · RIR 1" / "8–12 Wdh · RIR 2"). */
  value: string;
  /** Regiert der Wochenplan diese Uebung? Steuert zusaetzlich den Hinweis am
   *  Arbeitsgewicht: dort haengt die Last dann am Anker vom Phasenstart. */
  planGoverned: boolean;
}

export interface LockedTargetInput {
  /** Geltende Zeile des Phasen-Wochenplans; null = die Phase fuehrt keinen. */
  planWeek: WeekPlanWeek | null;
  /** Ziel-Repband der laufenden Phase; null = die Phase gibt keins vor. */
  repBand: [number, number] | null;
}

/** Die Vorgabe, die fuer diese Uebung tatsaechlich gilt; null heisst: es gibt
 *  keine (Erhaltung, freies Training, Core/Koerpergewicht) – dann bleibt das
 *  Repband der Uebung bedienbar. */
export function lockedTarget(
  exo: { profile: string; tier: string },
  input: LockedTargetInput,
): LockedTarget | null {
  if (input.planWeek && planGovernsExercise(exo, { week: input.planWeek })) {
    return {
      label: "Vorgabe dieser Woche",
      source: "aus der Journey-Phase",
      value: weekTargets(input.planWeek),
      planGoverned: true,
    };
  }
  // Ohne Wochenplan gilt das Band der Phase – aber nur fuer Kraftuebungen,
  // dieselbe Abgrenzung wie beim Coach (activeRepTarget in lib/coachStand).
  if (exo.profile !== "strength" || !input.repBand) return null;
  // Ausserhalb des Wochenplans ist die Ziel-Anstrengung systemweit fest
  // (Issue #298) - dieselbe Zahl, mit der der Coach dort rechnet.
  const rir = scoreInfo(DEFAULT_TARGET_SCORE)?.rir;
  return {
    label: "Repband",
    source: "aus aktiver Phase",
    value:
      `${input.repBand[0]}–${input.repBand[1]} Wdh` +
      (rir ? ` · RIR ${rir}` : ""),
    planGoverned: false,
  };
}
