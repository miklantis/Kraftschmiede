// Last einer Phase mit Wochenplan (Issue #225, Schritt 3). Der Plan setzt
// Saetze, Wiederholungen und Ziel-Anstrengung; gesteuert wird nur noch das
// Gewicht. Diese Datei ist die eine Stelle mit dieser Gewichtsregel - reine
// Rechenlogik ohne DB-/DOM-Bezug, wie die uebrige Engine.
//
// Die Regel in kurz:
//   - Phaseneintritt: Startgewicht X aus dem geschaetzten 1RM ueber die
//     Wiederholungen der ersten Planwoche plus zwei in Reserve (rund 81 %),
//     abgerundet auf eine ladbare Stufe. Ohne 1RM das letzte Arbeitsgewicht.
//   - danach je Journey-Woche: war die letzte Einheit der Vorwoche sauber
//     (alle Arbeitssaetze voll, kein reduziertes Gewicht, kein Versagen,
//     Anstrengung hoechstens im Wochenziel), geht es einen Schritt hoch -
//     sonst bleibt das Gewicht stehen und die Wiederholungszahl sinkt
//     planmaessig weiter.
//   - innerhalb einer Woche liegt immer dasselbe Gewicht auf der Uebung, auch
//     wenn sie zweimal drankommt.
//   - gesenkt wird nie. Nur eine im Training selbst reduzierte Last zieht den
//     Anker nach unten nach (anchorAfterSession).
//   - Entlastungswoche der Testphase (deload): ein Anteil des Ankers - dort
//     das Startgewicht X der vorangegangenen Kraftphase - ohne Steigerung.

import { avg } from "./math";
import { loadForReps } from "./phaseChange";
import { nearestDumbbell, nearestLoadable } from "./plates";
import { metTarget, workSets } from "./target";
import type { Bar, EngineSet, SetEntry } from "./types";

/** Reserve-Wiederholungen im Startgewicht: X traegt die Planwiederholungen der
 *  ersten Woche plus zwei in Reserve. */
export const PLAN_START_BUFFER_REPS = 2;

const DEFAULT_PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];

/** Inventar fuer das Ladbar-Machen: Stange + Scheiben, bei Kurzhanteln die
 *  vorhandenen Stufen. Gleiche Form wie in der Doppelprogression. */
export interface PlanLoadOpts {
  bar?: Bar;
  plates?: number[];
  dumbbells?: number[];
}

/** Groesste ladbare Stufe unter einem Zielwert. Der Wochenplan rundet immer ab -
 *  ein aufgerundeter Schritt waere je nach Inventar der doppelte. */
export function loadableDown(target: number, opts?: PlanLoadOpts): number {
  const o = opts ?? {};
  if (o.dumbbells && o.dumbbells.length) {
    return nearestDumbbell(target, o.dumbbells, true);
  }
  return nearestLoadable(target, o.bar?.weight ?? 20, o.plates ?? DEFAULT_PLATES, true);
}

/** Startgewicht X beim Eintritt in eine Phase mit Wochenplan. Mit geschaetztem
 *  1RM ueber die Wiederholungen der ersten Planwoche plus Reserve, sonst das
 *  letzte Arbeitsgewicht der Uebung (Uebungen ohne 1RM, z. B. Lunge). */
export function planStartWeight(
  est1RM: number | null | undefined,
  planReps: number,
  fallbackWeight: number,
  opts?: PlanLoadOpts,
): number {
  if (est1RM != null && est1RM > 0 && planReps > 0) {
    const raw = loadForReps(est1RM, planReps + PLAN_START_BUFFER_REPS);
    if (raw > 0) return loadableDown(raw, opts);
  }
  return loadableDown(fallbackWeight, opts);
}

/** Hoechstes vorgegebenes Arbeitsgewicht einer Einheit (Plan-Vorgabe), null
 *  ohne verwertbaren Satz. */
export function topTargetWeight(entry: SetEntry | null | undefined): number | null {
  let top: number | null = null;
  for (const s of workSets(entry)) {
    const w = typeof s.targetWeight === "number" ? s.targetWeight : null;
    if (w != null && w > 0 && (top == null || w > top)) top = w;
  }
  return top;
}

/** Hoechstes tatsaechlich bewegtes Arbeitsgewicht einer Einheit, null ohne
 *  verwertbaren Satz. */
export function topWorkedWeight(entry: SetEntry | null | undefined): number | null {
  let top: number | null = null;
  for (const s of workSets(entry)) {
    const w = typeof s.weight === "number" ? s.weight : null;
    if (w != null && w > 0 && (top == null || w > top)) top = w;
  }
  return top;
}

/** Hat die gewertete Einheit den Wochenplan voll erfuellt? Streng, ohne die
 *  Ermuedungstoleranz der Doppelprogression: bei zwei oder drei Ziel-
 *  Wiederholungen ist eine Wiederholung weniger ein Drittel bis die Haelfte des
 *  Satzes (ADR-0015 ruht hier). Verlangt sind alle Arbeitssaetze mit voller
 *  Wiederholungszahl, kein reduziertes Gewicht, kein Versagen und eine
 *  Durchschnitts-Anstrengung hoechstens im Wochenziel. */
export function planWeekMet(
  entry: SetEntry | null | undefined,
  targetScore: number,
): boolean {
  const ws: EngineSet[] = workSets(entry);
  if (!ws.length) return false;
  if (ws.some((s) => s.failed)) return false;
  if (ws.some((s) => metTarget(s) !== true)) return false;
  return avg(ws.map((s) => s.score ?? targetScore)) <= targetScore + 1e-9;
}

/** Warum das Gewicht so aussieht - fuer Entscheidung und Hinweistext. */
export type PlanLoadReason = "start" | "same-week" | "raised" | "held" | "deload";

export interface PlanWeekLoadInput {
  /** Anker der laufenden Phase (reference_weight, an diese Phase gebunden);
   *  null = die Uebung war in dieser Phase noch nicht dran. */
  anchor: number | null;
  /** Letzte Einheit dieser Uebung in der laufenden Journey-Woche; null = noch
   *  keine. Liegt eine vor, gilt deren Vorgabe weiter. */
  currentWeekEntry?: SetEntry | null;
  /** Letzte Einheit dieser Uebung in der vorigen Journey-Woche; null = die
   *  Uebung kam nicht dran (ohne Beleg keine Erhoehung). */
  previousWeekEntry?: SetEntry | null;
  /** Ziel-Anstrengung als Score der Vorwoche (Plan der bewerteten Woche). */
  previousTargetScore: number;
  /** Geschaetztes 1RM fuer das Startgewicht beim Phaseneintritt. */
  est1RM?: number | null;
  /** Letztes Arbeitsgewicht der Uebung - Startgewicht ohne 1RM. */
  fallbackWeight: number;
  /** Ziel-Wiederholungen der ersten Planwoche (Bezug des Startgewichts). */
  startReps: number;
  /** Anteil des Ankers, mit dem diese Woche gearbeitet wird (1 = volle Last). */
  loadPct?: number;
  /** Schrittweite eines Gewichtssprungs aus den Einstellungen. */
  step: number;
  /** Entlastung: entlastet wird vom Anker (dort das Startgewicht X der
   *  vorangegangenen Kraftphase), gesteigert wird nicht - die Woche laeuft in
   *  die Testwoche und nicht in den naechsten Schritt der Rampe. */
  deload?: boolean;
  opts?: PlanLoadOpts;
}

export interface PlanWeekLoad {
  weight: number;
  reason: PlanLoadReason;
}

/** Gewicht der laufenden Journey-Woche nach dem Wochenplan. */
export function planWeekLoad(input: PlanWeekLoadInput): PlanWeekLoad {
  const pct = input.loadPct != null && input.loadPct > 0 ? input.loadPct : 1;
  const step = input.step > 0 ? input.step : 2.5;
  const scale = (w: number): number =>
    pct === 1 ? loadableDown(w, input.opts) : loadableDown(w * pct, input.opts);

  const startWeight = (): number =>
    planStartWeight(
      input.est1RM,
      input.startReps,
      input.fallbackWeight,
      input.opts,
    );

  // Entlastung: ein Anteil des Ankers, ohne Steigerung. Liegt in der Woche
  // schon eine Einheit, gilt deren Vorgabe weiter (sonst wuerde die Entlastung
  // beim zweiten Mal noch einmal heruntergerechnet).
  if (input.deload) {
    const same = topTargetWeight(input.currentWeekEntry);
    if (same != null) return { weight: same, reason: "same-week" };
    const base =
      input.anchor != null && input.anchor > 0 ? input.anchor : startWeight();
    return { weight: scale(base), reason: "deload" };
  }

  // Kein Anker an dieser Phase: die Uebung tritt gerade ein -> Startgewicht.
  if (input.anchor == null || !(input.anchor > 0)) {
    return { weight: scale(startWeight()), reason: "start" };
  }

  // Schon in dieser Woche trainiert: dieselbe Vorgabe noch einmal. Bewusst die
  // damals vorgegebene Last, nicht die tatsaechlich bewegte - eine im Training
  // reduzierte Last zieht erst die naechste Woche nach.
  const sameWeek = topTargetWeight(input.currentWeekEntry);
  if (sameWeek != null) return { weight: sameWeek, reason: "same-week" };

  const raise =
    input.previousWeekEntry != null &&
    planWeekMet(input.previousWeekEntry, input.previousTargetScore);
  if (raise) {
    return { weight: scale(input.anchor + step), reason: "raised" };
  }
  return { weight: scale(input.anchor), reason: "held" };
}

/** Anker nach einer beendeten Einheit: die Vorgabe, aber nie hoeher als das
 *  tatsaechlich Bewegte. Nach oben zieht der Anker nie mit - ein guter Tag
 *  ueberholt den Plan nicht; nach unten zieht er nach, wenn im Training selbst
 *  reduziert wurde. Null, wenn die Einheit nichts hergibt. */
export function anchorAfterSession(
  plannedWeight: number | null | undefined,
  workedWeight: number | null | undefined,
): number | null {
  const planned = plannedWeight != null && plannedWeight > 0 ? plannedWeight : null;
  const worked = workedWeight != null && workedWeight > 0 ? workedWeight : null;
  if (planned == null) return worked;
  if (worked == null) return planned;
  return Math.min(planned, worked);
}
