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

/** Die Bauregeln eines Bausteins: alles, was zum Bauen der beiden Listen und
 *  zum Bauart-Vermerk gebraucht wird - und sonst nichts. Wer nur die Listen
 *  braucht (Journey-Start, Vorlagen-Vorschau), kommt mit diesem Ausschnitt aus,
 *  ohne die Vorgabewerte des Bausteins mitzuschleppen. */
export interface PhaseBuildRules {
  planBuilder: PlanBuilderName | null;
  loadBuilder: LoadBuilderName | null;
  careful: boolean;
  /** Start- und Zielanteil der Lastliste; nur bei gesetztem `loadBuilder`. */
  loadStartDefault: number | null;
  loadEndDefault: number | null;
}

/** Die Vorgabewerte eines Bausteins, so weit sie in eine Phase wandern.
 *  Deckungsgleich mit den gleichnamigen Feldern von `phase_types`. */
export interface PhaseTypeInput extends PhaseBuildRules {
  key: string;
  name: string;
  weeksDefault: number;
  setsStartDefault: number;
  setsEndDefault: number;
  repMinDefault: number | null;
  repMaxDefault: number | null;
  deloadAllowed: boolean;
  deloadDefault: number | null;
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

/** Was aus Baustein und Wochenzahl folgt und darum nirgends gespeichert werden
 *  muss: die beiden Listen und der Vermerk, nach welcher Regel sie entstanden
 *  sind. Genau dieser Ausschnitt einer Phase ist ableitbar. */
export interface PhasePlans {
  weekPlan: WeekPlan | null;
  loadPlan: LoadPlan | null;
  planBuilder: PlanBuilderName | null;
  loadBuilder: LoadBuilderName | null;
  careful: boolean;
}

/**
 * Wochenliste, Lastliste und Bauart-Vermerk aus den Bauregeln des Bausteins und
 * der Wochenzahl bauen.
 *
 * Die eine Stelle, an der die beiden Listen entstehen - egal ob beim Seed einer
 * Vorlage, beim Journey-Start oder fuer die Vorschau im Vorlagen-Waehler. Die
 * Wochenzahl ist dabei der Regler: Sie bestimmt die Laenge beider Listen, und
 * eine verstellte Phasenlaenge zieht die Rampe mit, statt hinten abzuschneiden.
 *
 * Der Vermerk haengt an der Liste, nicht an der Bauregel: Wo keine Liste
 * entstanden ist, bleibt er leer. Sonst laese der Coach eine Rampe, die es
 * nicht gibt. `careful` haengt an keiner Liste und kommt unveraendert aus dem
 * Baustein.
 */
export function buildPhasePlans(
  rules: PhaseBuildRules,
  weeks: number,
  /** Ausdruecklich vorgegebene Laststufen; siehe `PhaseAdjustments.load`. */
  load?: number[],
): PhasePlans {
  const weekPlan = buildWeekPlanFor(rules.planBuilder, weeks);
  // Getippte Stufen gehen vor: nennt die Phase ihre Last selbst, wird nichts
  // gebaut. Sonst verteilt die Bauregel des Bausteins die Stufen ueber genau
  // diese Wochenzahl.
  const loadPlan =
    load !== undefined
      ? loadPlanFromShares(load)
      : buildLoadPlanFor(
          rules.loadBuilder,
          weeks,
          rules.loadStartDefault,
          rules.loadEndDefault,
        );
  return {
    weekPlan,
    loadPlan,
    planBuilder: weekPlan == null ? null : rules.planBuilder,
    loadBuilder: loadPlan == null ? null : rules.loadBuilder,
    careful: rules.careful,
  };
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
    // Listen und Bauart-Vermerk kommen aus derselben Stelle, die auch der
    // Journey-Start benutzt - so kann die gebaute Phase gar nicht von dem
    // abweichen, was spaeter zur Laufzeit entsteht.
    ...buildPhasePlans(type, weeks, adjustments.load),
  };
}
