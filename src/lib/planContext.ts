// Wochenplan-Bezug je Uebung (Issue #225, Schritt 3). Aus dem Phasen-Kontext
// (welche Planwoche gilt, welche Phase laeuft) und dem Verlauf (welche Einheit
// liegt in dieser, welche in der vorigen Journey-Woche) entsteht der
// PlanContext, den der Coach fuer seine Vorgabe braucht.
//
// Eine Stelle statt drei: der Live-Aufbau, die Uebungs-Statusanzeige und die
// Coach-Vorschau waehrend der Einheit fuellen dieselbe Quelle und bekommen
// damit denselben Vorschlag. Reine Ableitung ohne DB-/DOM-Bezug.

import type { SetEntry, WeekPlanWeek } from "@/engine";
import type { PlanContext } from "./coach";

/** Der Wochenplan-Stand der laufenden Phase, unabhaengig von der Uebung. */
export interface PlanSource {
  /** Geltende Planwoche; null = die Phase laeuft nicht nach Wochenplan. */
  week: WeekPlanWeek | null;
  /** Zeile der Vorwoche (Massstab der Bewertung); null = kein Plan. */
  prevWeek: WeekPlanWeek | null;
  /** Ziel-Wiederholungen der ersten Planwoche (Bezug des Startgewichts). */
  startReps: number | null;
  /** Laufende Phase – nur ein daran gebundener Anker zaehlt. */
  phaseId: string | null;
  /** Letzte Einheit je Uebung in der laufenden Journey-Woche. */
  currentWeekEntryByExercise: Record<string, SetEntry | null>;
  /** Letzte Einheit je Uebung in der vorigen Journey-Woche. */
  previousWeekEntryByExercise: Record<string, SetEntry | null>;
}

/** Uebungsseite des Bezugs: Anker samt Phasenbindung und geschaetztes 1RM. */
export interface PlanAnchorExercise {
  id: string;
  referenceWeight: number | null;
  referencePhaseId: string | null;
  rm: number | null;
}

/** Plan-Bezug fuer eine Uebung; null, wenn die Phase keinen Wochenplan fuehrt.
 *  Der Anker zaehlt nur, wenn er an genau diese Phase gebunden ist - sonst tritt
 *  die Uebung gerade in die Phase ein und bekommt ihr Startgewicht. */
export function planContextFor(
  source: PlanSource | null | undefined,
  exercise: PlanAnchorExercise,
): PlanContext | null {
  if (!source || !source.week || !source.prevWeek || source.startReps == null) {
    return null;
  }
  const bound =
    source.phaseId != null && exercise.referencePhaseId === source.phaseId;
  return {
    week: source.week,
    prevWeek: source.prevWeek,
    startReps: source.startReps,
    anchor: bound ? exercise.referenceWeight : null,
    currentWeekEntry: source.currentWeekEntryByExercise[exercise.id] ?? null,
    previousWeekEntry: source.previousWeekEntryByExercise[exercise.id] ?? null,
    rm: exercise.rm,
  };
}
