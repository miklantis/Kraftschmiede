// Wochenplan-Bezug je Uebung (Issue #225, Schritt 3/4). Aus dem Phasen-Kontext
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
  /** Phase, an die der Anker gebunden sein muss - in der Rampe die laufende
   *  Phase, in der Entlastung die Kraftphase davor (dort liegt X). */
  anchorPhaseId: string | null;
  /** Entlastungswoche der Testphase: entlasten statt steigern. */
  deload: boolean;
  /** Letzte Einheit je Uebung in der laufenden Journey-Woche. */
  currentWeekEntryByExercise: Record<string, SetEntry | null>;
  /** Letzte Einheit je Uebung in der vorigen Journey-Woche. */
  previousWeekEntryByExercise: Record<string, SetEntry | null>;
}

/** Uebungsseite des Bezugs: Anker samt Phasenbindung, Startgewicht der Phase
 *  und geschaetztes 1RM. */
export interface PlanAnchorExercise {
  id: string;
  referenceWeight: number | null;
  referencePhaseId: string | null;
  /** Startgewicht X der Phase, an die der Anker gebunden ist. */
  planStartWeight?: number | null;
  rm: number | null;
}

/** Anker der Uebung fuer den Plan. Er zaehlt nur, wenn er an die Bezugsphase
 *  gebunden ist - sonst tritt die Uebung gerade in die Phase ein und bekommt ihr
 *  Startgewicht. In der Entlastung zaehlt das Startgewicht X der Kraftphase
 *  davor (Rueckfall: deren fortgeschriebener Anker), nicht der Stand am
 *  Phasenende - entlastet wird von X. */
export function planAnchor(
  anchorPhaseId: string | null,
  deload: boolean,
  exercise: PlanAnchorExercise,
): number | null {
  if (anchorPhaseId == null || exercise.referencePhaseId !== anchorPhaseId) {
    return null;
  }
  if (!deload) return exercise.referenceWeight;
  return exercise.planStartWeight ?? exercise.referenceWeight;
}

/** Plan-Bezug fuer eine Uebung; null, wenn die Phase keinen Wochenplan fuehrt. */
export function planContextFor(
  source: PlanSource | null | undefined,
  exercise: PlanAnchorExercise,
): PlanContext | null {
  if (!source || !source.week || !source.prevWeek || source.startReps == null) {
    return null;
  }
  return {
    week: source.week,
    prevWeek: source.prevWeek,
    startReps: source.startReps,
    anchor: planAnchor(source.anchorPhaseId, source.deload, exercise),
    deload: source.deload,
    currentWeekEntry: source.currentWeekEntryByExercise[exercise.id] ?? null,
    previousWeekEntry: source.previousWeekEntryByExercise[exercise.id] ?? null,
    rm: exercise.rm,
  };
}
