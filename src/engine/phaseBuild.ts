// Eine Phase aus einem Baustein bauen.
//
// Die eine Stelle, an der eine Phase entsteht (Konzept Abschnitt 5 und 10):
// Der Baustein liefert die Vorgabewerte, die Anpassungen ueberschreiben einzelne
// davon, und das Ergebnis ist eine vollstaendige Phasenzeile. Danach ist die
// Phase aus sich heraus lesbar - Engine und Coach fragen den Baustein nie wieder.
//
// Die Wochenzahl zieht dabei drei Dinge nach sich, die alle hier passieren:
// die Wochenliste wird neu gebaut, die Entlastungswoche wird gekappt, und die
// Lastliste wird neu verteilt.

import {
  buildLoadPlanFor,
  loadPlanFromShares,
  type LoadPlan,
} from "./loadPlan";
import {
  buildWeekPlanFor,
  type LoadBuilderName,
  type PlanBuilderName,
  type WeekPlan,
} from "./weekPlan";

/** Die Vorgabewerte eines Bausteins, so weit sie in eine Phase wandern.
 *  Deckungsgleich mit den gleichnamigen Feldern von `phase_types`. */
export interface PhaseTypeInput {
  key: string;
  name: string;
  planBuilder: PlanBuilderName | null;
  loadBuilder: LoadBuilderName | null;
  careful: boolean;
  weeksDefault: number;
  setsStartDefault: number;
  setsEndDefault: number;
  repMinDefault: number | null;
  repMaxDefault: number | null;
  deloadAllowed: boolean;
  deloadDefault: number | null;
  /** Start- und Zielanteil der Lastliste; nur bei gesetztem `loadBuilder`. */
  loadStartDefault: number | null;
  loadEndDefault: number | null;
}

/** Abweichungen von den Vorgaben des Bausteins. Was nicht gesetzt ist, kommt
 *  aus dem Baustein. */
export interface PhaseAdjustments {
  /** Abweichender Phasenname; ohne Angabe traegt die Phase den Baustein-Namen. */
  name?: string;
  weeks?: number;
  setsStart?: number;
  setsEnd?: number;
  repTargetMin?: number | null;
  repTargetMax?: number | null;
  deloadWeek?: number | null;
  /**
   * Ausdruecklich vorgegebene Laststufen, je Phasenwoche ein Anteil des
   * Referenzgewichts (0.65 = 65 %). Sie ersetzen die Bauregel des Bausteins -
   * fuer Phasen, die ihre Stufen selbst nennen. Ohne Angabe entsteht die Liste
   * aus der Bauregel, und ohne Bauregel gibt die Phase keine Last vor.
   */
  load?: number[];
}

/** Eine fertig gebaute Phase - dieselben Felder, die in der Phasenzeile stehen. */
export interface BuiltPhase {
  name: string;
  focus: string;
  weeks: number;
  setsStart: number;
  setsEnd: number;
  deloadWeek: number | null;
  repTargetMin: number | null;
  repTargetMax: number | null;
  weekPlan: WeekPlan | null;
  loadPlan: LoadPlan | null;
  planBuilder: PlanBuilderName | null;
  loadBuilder: LoadBuilderName | null;
  careful: boolean;
}

/**
 * Entlastungswoche auf die Phasenlaenge zurechtstutzen.
 *
 * Zwei Regeln: Eine Entlastung darf nie die letzte Woche der Phase sein - sonst
 * hoert die Phase auf einer Absenkung auf, statt danach wieder Anlauf zu
 * nehmen. Und unter drei Wochen ist ueberhaupt keine sinnvoll, weil dann kaum
 * Rampe uebrig bleibt.
 */
export function cappedDeloadWeek(
  week: number | null | undefined,
  weeks: number,
): number | null {
  if (week == null || week < 1) return null;
  if (weeks < 3) return null;
  return Math.min(week, weeks - 1);
}

/**
 * Phase aus Baustein plus Anpassungen bauen.
 *
 * Sperren (`setsLocked`, `repBandLocked`) werden hier bewusst nicht erzwungen:
 * Sie halten fest, dass eine Einstellung in diesem Steuerweg *wirkungslos* ist -
 * die Wochenliste gibt Saetze und Wiederholungen ohnehin vor. Wer die Auswahl
 * anbietet, verbirgt sie (Teil 2); wer eine Phase baut, schreibt sie mit.
 */
export function buildPhaseFromType(
  type: PhaseTypeInput,
  adjustments: PhaseAdjustments = {},
): BuiltPhase {
  const weeks = adjustments.weeks ?? type.weeksDefault;
  const planBuilder = type.planBuilder;
  const weekPlan = buildWeekPlanFor(planBuilder, weeks);
  // Getippte Stufen gehen vor: nennt die Phase ihre Last selbst, wird nichts
  // gebaut. Sonst verteilt die Bauregel des Bausteins die Stufen ueber genau
  // diese Wochenzahl - eine verstellte Phasenlaenge zieht die Rampe damit mit,
  // statt hinten abzuschneiden.
  const loadPlan =
    adjustments.load !== undefined
      ? loadPlanFromShares(adjustments.load)
      : buildLoadPlanFor(
          type.loadBuilder,
          weeks,
          type.loadStartDefault,
          type.loadEndDefault,
        );
  const deloadRoh = type.deloadAllowed
    ? (adjustments.deloadWeek !== undefined
        ? adjustments.deloadWeek
        : type.deloadDefault)
    : null;
  return {
    name: adjustments.name ?? type.name,
    focus: type.key,
    weeks,
    setsStart: adjustments.setsStart ?? type.setsStartDefault,
    setsEnd: adjustments.setsEnd ?? type.setsEndDefault,
    deloadWeek: cappedDeloadWeek(deloadRoh, weeks),
    repTargetMin:
      adjustments.repTargetMin !== undefined
        ? adjustments.repTargetMin
        : type.repMinDefault,
    repTargetMax:
      adjustments.repTargetMax !== undefined
        ? adjustments.repTargetMax
        : type.repMaxDefault,
    weekPlan,
    loadPlan,
    // Ohne gebaute Wochenliste kein Vermerk: eine Phase ohne Plan laeuft ueber
    // den Coach und darf nicht als Rampe gelesen werden.
    planBuilder: weekPlan == null ? null : planBuilder,
    // Ebenso auf der Lastseite: der Vermerk sagt, nach welcher Regel die
    // Lastliste entstanden ist - ohne Liste gibt es keine.
    loadBuilder: loadPlan == null ? null : type.loadBuilder,
    careful: type.careful,
  };
}
