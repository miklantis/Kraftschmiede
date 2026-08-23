// Wochenplan einer Phase: Saetze, Wiederholungen und Ziel-Anstrengung stehen je
// Woche fest, gesteuert wird nur noch das Gewicht. Das gilt in Kraft-,
// Schnellkraft- und Testphasen; Hypertrophie, Kraftausdauer, Wiedereinstieg und
// Erhaltung bleiben bei der Doppelprogression des Coaches (Issue #225).
//
// Reine Rechenlogik: hier entsteht die Form des Plans und seine Ableitung aus
// der Phasenlaenge. Gespeichert wird der Plan an der Phase (week_plan), gelesen
// wird er ueber weekPlanForWeek.

import { z } from "zod";

import type { PhaseBuild } from "./types";

// ---- Form -------------------------------------------------------------------

/** Eine Woche des Plans. Quelle der Wahrheit fuer die Form ist dieses Schema;
 *  der TypeScript-Typ wird daraus abgeleitet. */
export const weekPlanWeekSchema = z.object({
  /** 1-basierte Woche innerhalb der Phase. */
  week: z.number().int().positive(),
  /** Arbeitssaetze dieser Woche (ohne Aufwaermen). 0 = die Woche verlangt keine
   *  geplante Einheit (reine Testwoche), siehe weekDemandsSession. */
  sets: z.number().int().min(0),
  /** Ziel-Wiederholungen je Arbeitssatz; untere Grenze, wenn repsMax gesetzt ist. */
  reps: z.number().int().positive(),
  /** Obere Grenze, wenn die Woche mit einem Band statt einer festen Zahl arbeitet. */
  repsMax: z.number().int().positive().nullable().default(null),
  /** Ziel-Anstrengung als Wiederholungen in Reserve (RIR). */
  rir: z.number().int().min(0),
  /** Anteil des Phasen-Ankers, mit dem gearbeitet wird (1 = volles Arbeitsgewicht). */
  loadPct: z.number().positive().default(1),
  /** Kurzer Wochenziel-Text fuer die Anzeige. */
  note: z.string(),
});
export type WeekPlanWeek = z.infer<typeof weekPlanWeekSchema>;

/** Der ganze Plan: eine Zeile je Phasenwoche, aufsteigend nach week. */
export const weekPlanSchema = z.array(weekPlanWeekSchema);
export type WeekPlan = z.infer<typeof weekPlanSchema>;

/** Plan aus einem unbekannten Wert (z. B. jsonb-Spalte) lesen. Alles, was nicht
 *  zur Form passt, gilt als „kein Plan" - dann bleibt es beim bisherigen
 *  Verhalten, statt mit halben Daten zu rechnen. */
export function parseWeekPlan(value: unknown): WeekPlan | null {
  if (value == null) return null;
  const parsed = weekPlanSchema.safeParse(value);
  if (!parsed.success || parsed.data.length === 0) return null;
  return parsed.data;
}

// ---- Eckwerte ---------------------------------------------------------------

/** Durchgehende Satzzahl der Kraft- und Schnellkraftwochen. */
export const WEEK_PLAN_SETS = 4;

/** Ziel-Anstrengung der Aufbauwochen (RIR 2) und der schwersten Wochen (RIR 1).
 *  Ohne die Anhebung wuerde die Rampe ab der Mitte der Phase einfrieren:
 *  schwere Saetze sind naturgemaess haerter als RIR 2. */
export const WEEK_PLAN_RIR = 2;
export const WEEK_PLAN_RIR_PEAK = 1;

/** Entlastungswoche der Testphase: leichte Einheiten mit 60 % vom
 *  Arbeitsgewicht. Zwei Saetze statt drei - bei drei Einheiten in der Woche
 *  waere die Summe sonst groesser als in einer Kraftwoche (#240). */
export const DELOAD_SETS = 2;
export const DELOAD_REPS_MIN = 3;
export const DELOAD_REPS_MAX = 5;
export const DELOAD_LOAD_PCT = 0.6;
/** Bei 60 % vom Arbeitsgewicht ist die Einheit bewusst leicht. */
export const DELOAD_RIR = 3;

/** Reine Testwoche: keine geplante Einheit. Sie steht trotzdem als Zeile im
 *  Plan - sonst waere sie in der Anzeige und in der Kurve nicht vorhanden. Die
 *  uebrigen Werte beschreiben den 1RM-Versuch: eine Wiederholung ohne Reserve
 *  auf vollem Gewicht, also hoechste Intensitaet bei null Volumen. */
export const TEST_WEEK_SETS = 0;

// Wiederholungsleitern der vier ueblichen Phasenlaengen.
const LADDERS: Record<number, number[]> = {
  3: [5, 4, 3],
  4: [5, 4, 3, 2],
  5: [5, 5, 4, 3, 2],
  6: [5, 5, 4, 4, 3, 2],
};

const LADDER_MIN = 3;
const LADDER_MAX = 6;

// ---- Ableitung --------------------------------------------------------------

/** Wiederholungsleiter zur Phasenlaenge. Ausserhalb 3-6 Wochen definiert:
 *  kuerzer wird die kuerzeste Leiter von hinten geschnitten (die schweren
 *  Wochen fallen weg), laenger wird die erste Woche wiederholt (der Anlauf wird
 *  laenger, der Abstieg bis 2 Wiederholungen bleibt am Ende stehen). */
export function repLadder(weeks: number): number[] {
  const w = Math.max(1, Math.round(weeks));
  if (w < LADDER_MIN) return LADDERS[LADDER_MIN]!.slice(0, w);
  const base = LADDERS[Math.min(w, LADDER_MAX)]!;
  if (w <= LADDER_MAX) return base.slice();
  const lead = new Array<number>(w - LADDER_MAX).fill(base[0]!);
  return [...lead, ...base];
}

/** Ziel-Anstrengung je Woche: RIR 2, in den beiden schwersten (letzten) Wochen
 *  RIR 1. Phasen unter 4 Wochen heben nur die letzte Woche an. */
function rirForWeek(weekIndex: number, weeks: number): number {
  const peakWeeks = weeks < 4 ? 1 : 2;
  return weekIndex >= weeks - peakWeeks ? WEEK_PLAN_RIR_PEAK : WEEK_PLAN_RIR;
}

/** Wochenplan einer Kraft- oder Schnellkraftphase: feste Leiter, durchgehend
 *  4 Arbeitssaetze, keine Entlastungswoche - die steht am Anfang der
 *  Testphase. */
export function buildStrengthWeekPlan(weeks: number): WeekPlan {
  const ladder = repLadder(weeks);
  return ladder.map((reps, i) => ({
    week: i + 1,
    sets: WEEK_PLAN_SETS,
    reps,
    repsMax: null,
    rir: rirForWeek(i, ladder.length),
    loadPct: 1,
    // Kein Wochentext: die Leiter erklaert sich ueber Saetze, Wiederholungen
    // und RIR - zusaetzliche Saetze machen die Phasenkarte nur unruhig (#275).
    note: "",
  }));
}

/** Wochenplan einer Testphase. Bauregel: die letzte Woche ist die reine
 *  Testwoche, jede Woche davor ist Entlastung (#240). Eine einwoechige
 *  Testphase besteht damit nur aus der Testwoche.
 *
 *  Die Testwoche plant nichts: trainiert werden darf, aber ohne Vorgabe, und
 *  der 1RM-Test laeuft unveraendert von der Uebungsseite aus. */
export function buildTestPhaseWeekPlan(weeks: number): WeekPlan {
  const n = Math.max(1, Math.round(weeks));
  return Array.from({ length: n }, (_, i) =>
    i === n - 1
      ? {
          week: i + 1,
          sets: TEST_WEEK_SETS,
          reps: 1,
          repsMax: null,
          rir: 0,
          loadPct: 1,
          note: "Testwoche: keine Vorgabe, der 1RM-Test läuft über die Übungsseite",
        }
      : {
          week: i + 1,
          sets: DELOAD_SETS,
          reps: DELOAD_REPS_MIN,
          repsMax: DELOAD_REPS_MAX,
          rir: DELOAD_RIR,
          loadPct: DELOAD_LOAD_PCT,
          note: "Entlastung mit 60 % vom Arbeitsgewicht, danach die Testwoche",
        },
  );
}

/** Verlangt diese Planwoche eine Einheit? Die reine Testwoche verlangt nichts
 *  (0 Arbeitssaetze) - sie gibt weder dem Coach noch der Anzeige etwas vor. */
export function weekDemandsSession(
  week: WeekPlanWeek | null | undefined,
): boolean {
  return week != null && week.sets > 0;
}

// ---- Bauart-Vermerk ---------------------------------------------------------
// Ein Wochenplan allein sagt nicht, was er tut: Kraft- und Testphasen tragen
// beide einen und verhalten sich gegensaetzlich. Deshalb schreibt jede Phase
// beim Anlegen mit, nach welcher Bauregel ihre Listen entstanden sind - und zur
// Laufzeit wird dieser Vermerk gelesen statt einer Fokus-Liste im Code
// (Konzept Bausteine, Abschnitt 2).

/** Bauregeln der Wochenliste, deren Plan die Last Woche fuer Woche hochfaehrt
 *  (Anker beim Phaseneintritt plus Wochenschritt, engine/planLoad.ts). */
export const RISING_PLAN_BUILDERS = ["strength_ladder", "power_ladder"] as const;

/** Bauregel der Testphase: sie traegt ebenfalls einen Plan, steigert aber
 *  nichts - ihre Entlastungswochen arbeiten mit einem Anteil des Startgewichts
 *  X der vorangegangenen Kraftphase, ihre letzte Woche plant gar nichts. */
export const TEST_PLAN_BUILDER = "test";

/** Alle Bauregeln der Wochenliste. Einzige Pflegequelle: die Zod-Enums der
 *  Phasen-Schemas leiten sich daraus ab. */
export const PLAN_BUILDERS = [
  ...RISING_PLAN_BUILDERS,
  TEST_PLAN_BUILDER,
] as const;
export type PlanBuilderName = (typeof PLAN_BUILDERS)[number];

/** Bauregeln der Lastliste (Anteil des Referenzgewichts je Phasenwoche). Die
 *  Rampe selbst kommt mit dem Wiederaufbau-Baustein (Schritt 5). */
export const LOAD_BUILDERS = ["rebuild_ramp"] as const;
export type LoadBuilderName = (typeof LOAD_BUILDERS)[number];

/** Traegt diese Phase ueberhaupt eine gebaute Wochenliste? */
export function hasPlanBuilder(phase: PhaseBuild | null | undefined): boolean {
  return (PLAN_BUILDERS as readonly string[]).includes(phase?.plan_builder ?? "");
}

/** Faehrt die Wochenliste dieser Phase die Last als Rampe hoch? */
export function buildsRisingPlan(phase: PhaseBuild | null | undefined): boolean {
  return (RISING_PLAN_BUILDERS as readonly string[]).includes(
    phase?.plan_builder ?? "",
  );
}

/** Laeuft diese Phase als Testphase (Entlastung, dann reine Testwoche)? */
export function buildsTestPlan(phase: PhaseBuild | null | undefined): boolean {
  return phase?.plan_builder === TEST_PLAN_BUILDER;
}

/** Steuert die Wochenliste dieser Phase das Gewicht - als Rampe (Kraft,
 *  Schnellkraft) oder als Entlastung (Testphase)? */
export function planGovernsLoad(phase: PhaseBuild | null | undefined): boolean {
  return buildsRisingPlan(phase) || buildsTestPlan(phase);
}

/** Steigert der Coach in dieser Phase vorsichtig? Ersetzt den fest
 *  verdrahteten Zweig `focus === "reentry"`. */
export function isCarefulPhase(phase: PhaseBuild | null | undefined): boolean {
  return phase?.careful === true;
}

/** Wochenliste zur Bauregel des Bausteins. `null` (Steuerweg Coach) heisst:
 *  keine Liste, der Coach steuert Saetze und Wiederholungen weiter selbst.
 *  Welcher Baustein welche Bauregel bekommt, steht seit Schritt 3 in der
 *  Bausteine-Tabelle und nicht mehr als Fokus-Liste im Code. */
export function buildWeekPlanFor(
  builder: PlanBuilderName | null | undefined,
  weeks: number,
): WeekPlan | null {
  if (builder === "strength_ladder" || builder === "power_ladder") {
    return buildStrengthWeekPlan(weeks);
  }
  if (builder === TEST_PLAN_BUILDER) return buildTestPhaseWeekPlan(weeks);
  return null;
}

// ---- Zugriff ----------------------------------------------------------------

/** Geltende Wochenzeile aus Plan und 1-basierter Woche in der Phase.
 *  Jenseits des Plans haelt die Vorgabe: vor Woche 1 gilt die erste Zeile,
 *  hinter der letzten Woche die letzte - eine ueberlange Phase faellt damit
 *  nicht auf die Doppelprogression zurueck, sondern bleibt auf dem Peak. */
export function weekPlanForWeek(
  plan: WeekPlan | null | undefined,
  weekInPhase: number,
): WeekPlanWeek | null {
  if (!plan || plan.length === 0) return null;
  const sorted = plan.slice().sort((a, b) => a.week - b.week);
  const w = Math.round(weekInPhase);
  const exact = sorted.find((row) => row.week === w);
  if (exact) return exact;
  if (w < sorted[0]!.week) return sorted[0]!;
  return sorted[sorted.length - 1]!;
}

/** Zeile der FOLGENDEN Phasenwoche; null, wenn der Plan dort endet.
 *  Bewusst ohne das Halten von weekPlanForWeek: in der letzten Phasenwoche gibt
 *  es keine naechste Woche mehr, und die gehaltene letzte Zeile waere ein
 *  Ausblick auf eine Woche, die real nicht mehr kommt (Issue #268, Schritt 2). */
export function nextWeekPlanWeek(
  plan: WeekPlan | null | undefined,
  weekInPhase: number,
): WeekPlanWeek | null {
  if (!plan || plan.length === 0) return null;
  const w = Math.round(weekInPhase) + 1;
  return plan.find((row) => row.week === w) ?? null;
}
