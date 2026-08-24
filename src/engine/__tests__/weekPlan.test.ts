import { describe, expect, it } from "vitest";
import {
  buildPowerWeekPlan,
  buildStrengthWeekPlan,
  buildTestPhaseWeekPlan,
  buildWeekPlanFor,
  DELOAD_LOAD_PCT,
  DELOAD_SETS,
  buildsRisingPlan,
  buildsTestPlan,
  hasPlanBuilder,
  isCarefulPhase,
  planGovernsLoad,
  parseWeekPlan,
  powerRepLadder,
  repLadder,
  nextWeekPlanWeek,
  weekDemandsSession,
  weekPlanForWeek,
  weekPlanSchema,
  WEEK_PLAN_SETS,
} from "../weekPlan";

describe("repLadder – Wiederholungsleiter je Phasenlaenge", () => {
  it("3 Wochen", () => {
    expect(repLadder(3)).toEqual([5, 4, 3]);
  });
  it("4 Wochen", () => {
    expect(repLadder(4)).toEqual([5, 4, 3, 2]);
  });
  it("5 Wochen", () => {
    expect(repLadder(5)).toEqual([5, 5, 4, 3, 2]);
  });
  it("6 Wochen", () => {
    expect(repLadder(6)).toEqual([5, 5, 4, 4, 3, 2]);
  });
  it("kuerzer als 3 Wochen: kuerzeste Leiter von hinten geschnitten", () => {
    expect(repLadder(2)).toEqual([5, 4]);
    expect(repLadder(1)).toEqual([5]);
  });
  it("laenger als 6 Wochen: erste Woche wiederholt, Abstieg bleibt hinten", () => {
    expect(repLadder(7)).toEqual([5, 5, 5, 4, 4, 3, 2]);
    expect(repLadder(8)).toEqual([5, 5, 5, 5, 4, 4, 3, 2]);
  });
});

describe("buildStrengthWeekPlan – Kraftphase (Maximalkraft)", () => {
  it("5 Wochen: Leiter, 4 Saetze durchgehend, RIR 2 mit zwei Peak-Wochen", () => {
    const plan = buildStrengthWeekPlan(5);
    expect(plan.map((w) => w.week)).toEqual([1, 2, 3, 4, 5]);
    expect(plan.map((w) => w.reps)).toEqual([5, 5, 4, 3, 2]);
    expect(plan.map((w) => w.sets)).toEqual([4, 4, 4, 4, 4]);
    expect(plan.map((w) => w.rir)).toEqual([2, 2, 2, 1, 1]);
    expect(plan.every((w) => w.sets === WEEK_PLAN_SETS)).toBe(true);
  });
  it("6 Wochen: RIR 1 in den beiden schwersten Wochen", () => {
    expect(buildStrengthWeekPlan(6).map((w) => w.rir)).toEqual([2, 2, 2, 2, 1, 1]);
  });
  it("4 Wochen: RIR 1 in den beiden schwersten Wochen", () => {
    expect(buildStrengthWeekPlan(4).map((w) => w.rir)).toEqual([2, 2, 1, 1]);
  });
  it("unter 4 Wochen: nur die letzte Woche auf RIR 1", () => {
    expect(buildStrengthWeekPlan(3).map((w) => w.rir)).toEqual([2, 2, 1]);
    expect(buildStrengthWeekPlan(2).map((w) => w.rir)).toEqual([2, 1]);
  });
  it("arbeitet auf vollem Arbeitsgewicht, ohne Wiederholungsband", () => {
    const plan = buildStrengthWeekPlan(4);
    expect(plan.every((w) => w.loadPct === 1)).toBe(true);
    expect(plan.every((w) => w.repsMax === null)).toBe(true);
  });
  it("fuehrt keinen Wochenziel-Text mehr (#275)", () => {
    const plan = buildStrengthWeekPlan(5);
    expect(plan.every((w) => w.note === "")).toBe(true);
  });
});

describe("powerRepLadder – Leiter der Intensivierung", () => {
  it("3 Wochen: bis in den Einzelversuch", () => {
    expect(powerRepLadder(3)).toEqual([3, 2, 1]);
  });
  it("4 Wochen: ein Anlauf mehr, dann derselbe Abstieg", () => {
    expect(powerRepLadder(4)).toEqual([3, 3, 2, 1]);
  });
  it("kuerzer als 3 Wochen: kuerzeste Leiter von hinten geschnitten", () => {
    expect(powerRepLadder(2)).toEqual([3, 2]);
    expect(powerRepLadder(1)).toEqual([3]);
  });
  it("laenger als 4 Wochen: erste Woche wiederholt, Abstieg bleibt hinten", () => {
    expect(powerRepLadder(5)).toEqual([3, 3, 3, 2, 1]);
    expect(powerRepLadder(6)).toEqual([3, 3, 3, 3, 2, 1]);
  });
  it("ist ueberall schwerer als die Kraftleiter – keine zweite Kraftphase", () => {
    for (const weeks of [3, 4]) {
      const kraft = repLadder(weeks);
      const intensiv = powerRepLadder(weeks);
      expect(intensiv).not.toEqual(kraft);
      expect(intensiv.every((reps, i) => reps < kraft[i]!)).toBe(true);
    }
  });
});

describe("buildPowerWeekPlan – Intensivierung", () => {
  it("3 Wochen: eigene Leiter, 4 Saetze, letzte Woche der Einzelversuch", () => {
    const plan = buildPowerWeekPlan(3);
    expect(plan.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(plan.map((w) => w.reps)).toEqual([3, 2, 1]);
    expect(plan.every((w) => w.sets === WEEK_PLAN_SETS)).toBe(true);
  });
  it("4 Wochen: RIR 2, in den beiden schwersten Wochen RIR 1", () => {
    expect(buildPowerWeekPlan(4).map((w) => w.reps)).toEqual([3, 3, 2, 1]);
    expect(buildPowerWeekPlan(4).map((w) => w.rir)).toEqual([2, 2, 1, 1]);
  });
  it("unter 4 Wochen: nur die letzte Woche auf RIR 1", () => {
    expect(buildPowerWeekPlan(3).map((w) => w.rir)).toEqual([2, 2, 1]);
  });
  it("der Einzelversuch behaelt seine Reserve – kein 1RM-Test", () => {
    const letzte = buildPowerWeekPlan(3).at(-1)!;
    expect(letzte).toMatchObject({ reps: 1, rir: 1, sets: WEEK_PLAN_SETS });
    expect(weekDemandsSession(letzte)).toBe(true);
  });
  it("arbeitet auf vollem Arbeitsgewicht, ohne Band und ohne Wochentext", () => {
    const plan = buildPowerWeekPlan(4);
    expect(plan.every((w) => w.loadPct === 1)).toBe(true);
    expect(plan.every((w) => w.repsMax === null)).toBe(true);
    expect(plan.every((w) => w.note === "")).toBe(true);
  });
});

describe("buildTestPhaseWeekPlan – Entlastung, dann reine Testwoche", () => {
  it("die letzte Woche ist die Testwoche: keine geplante Einheit", () => {
    const plan = buildTestPhaseWeekPlan(2);
    expect(plan.map((w) => w.week)).toEqual([1, 2]);
    expect(plan[1]!).toMatchObject({ sets: 0, loadPct: 1 });
    expect(weekDemandsSession(plan[1]!)).toBe(false);
    // Der Text sagt nur, was in der Zeile selbst nicht steht - dass es die
    // Testwoche ist, traegt die Tabelle (#364).
    expect(plan[1]!.note).toMatch(/Übungsseite/);
  });
  it("jede Woche davor entlastet: 2 Saetze, 3-5 Wiederholungen, 60 %", () => {
    const plan = buildTestPhaseWeekPlan(2);
    expect(plan[0]!).toMatchObject({
      week: 1,
      sets: DELOAD_SETS,
      reps: 3,
      repsMax: 5,
      rir: 3,
      loadPct: DELOAD_LOAD_PCT,
    });
    expect(weekDemandsSession(plan[0]!)).toBe(true);
  });
  it("dreiwoechige Testphase entlastet zweimal und testet zuletzt", () => {
    expect(buildTestPhaseWeekPlan(3).map((w) => w.sets)).toEqual([
      DELOAD_SETS,
      DELOAD_SETS,
      0,
    ]);
  });
  it("einwoechige Testphase ist nur die Testwoche", () => {
    const plan = buildTestPhaseWeekPlan(1);
    expect(plan).toHaveLength(1);
    expect(plan[0]!.sets).toBe(0);
  });
  it("weekDemandsSession haelt auch ohne Woche", () => {
    expect(weekDemandsSession(null)).toBe(false);
    expect(weekDemandsSession(undefined)).toBe(false);
  });
});

describe("buildWeekPlanFor – die Wochenliste zur Bauregel", () => {
  it("strength_ladder und power_ladder fahren je ihre eigene Leiter", () => {
    expect(buildWeekPlanFor("strength_ladder", 4)?.map((w) => w.reps)).toEqual([
      5, 4, 3, 2,
    ]);
    expect(buildWeekPlanFor("power_ladder", 4)?.map((w) => w.reps)).toEqual([
      3, 3, 2, 1,
    ]);
    expect(buildWeekPlanFor("power_ladder", 3)?.map((w) => w.reps)).toEqual([
      3, 2, 1,
    ]);
  });
  it("test faehrt Entlastung und Testwoche", () => {
    expect(buildWeekPlanFor("test", 2)?.map((w) => w.sets)).toEqual([
      DELOAD_SETS, 0,
    ]);
    expect(buildWeekPlanFor("test", 2)?.[0]!.loadPct).toBe(DELOAD_LOAD_PCT);
  });
  it("ohne Bauregel keine Liste – dort steuert der Coach", () => {
    expect(buildWeekPlanFor(null, 5)).toBeNull();
    expect(buildWeekPlanFor(undefined, 4)).toBeNull();
  });
});

describe("Bauart-Vermerk – was die Phase zur Laufzeit sagt", () => {
  it("erkennt eine gebaute Wochenliste", () => {
    expect(hasPlanBuilder({ plan_builder: "strength_ladder" })).toBe(true);
    expect(hasPlanBuilder({ plan_builder: "test" })).toBe(true);
    expect(hasPlanBuilder({ plan_builder: null })).toBe(false);
    expect(hasPlanBuilder(null)).toBe(false);
  });
  it("trennt die hochfahrende Liste von der Testphase", () => {
    expect(buildsRisingPlan({ plan_builder: "strength_ladder" })).toBe(true);
    expect(buildsRisingPlan({ plan_builder: "power_ladder" })).toBe(true);
    expect(buildsRisingPlan({ plan_builder: "test" })).toBe(false);
    expect(buildsTestPlan({ plan_builder: "test" })).toBe(true);
    expect(buildsTestPlan({ plan_builder: "strength_ladder" })).toBe(false);
  });
  it("beide steuern das Gewicht, eine Phase ohne Liste nicht", () => {
    expect(planGovernsLoad({ plan_builder: "strength_ladder" })).toBe(true);
    expect(planGovernsLoad({ plan_builder: "test" })).toBe(true);
    expect(planGovernsLoad({ plan_builder: null })).toBe(false);
  });
  it("liest die vorsichtige Steigerung aus dem Vermerk", () => {
    expect(isCarefulPhase({ careful: true })).toBe(true);
    expect(isCarefulPhase({ careful: false })).toBe(false);
    expect(isCarefulPhase(null)).toBe(false);
  });
});

describe("weekPlanForWeek – geltende Woche", () => {
  const plan = buildStrengthWeekPlan(5);
  it("trifft die Woche der Phase (1-basiert)", () => {
    expect(weekPlanForWeek(plan, 1)!.reps).toBe(5);
    expect(weekPlanForWeek(plan, 4)!.reps).toBe(3);
  });
  it("haelt hinter der letzten Planwoche auf dem Peak", () => {
    expect(weekPlanForWeek(plan, 6)!.reps).toBe(2);
    expect(weekPlanForWeek(plan, 99)!.week).toBe(5);
  });
  it("vor Woche 1 gilt die erste Zeile", () => {
    expect(weekPlanForWeek(plan, 0)!.week).toBe(1);
  });
  it("ohne Plan gibt es keine Vorgabe", () => {
    expect(weekPlanForWeek(null, 1)).toBeNull();
    expect(weekPlanForWeek([], 1)).toBeNull();
  });
});

// Der Ausblick auf die naechste Woche darf nicht halten wie weekPlanForWeek:
// in der letzten Phasenwoche kommt keine naechste Woche mehr (#268, Schritt 2).
describe("nextWeekPlanWeek – Zeile der Folgewoche", () => {
  const plan = buildStrengthWeekPlan(5); // 5,5,4,3,2

  it("gibt die naechste Zeile heraus", () => {
    expect(nextWeekPlanWeek(plan, 1)!.week).toBe(2);
    expect(nextWeekPlanWeek(plan, 3)).toMatchObject({ week: 4, reps: 3 });
  });
  it("endet in der letzten Phasenwoche", () => {
    expect(nextWeekPlanWeek(plan, 5)).toBeNull();
  });
  it("haelt nicht hinter dem Plan", () => {
    expect(nextWeekPlanWeek(plan, 99)).toBeNull();
  });
  it("ohne Plan gibt es keinen Ausblick", () => {
    expect(nextWeekPlanWeek(null, 1)).toBeNull();
    expect(nextWeekPlanWeek([], 1)).toBeNull();
  });
});

describe("weekPlanSchema – Form aus der Datenbank", () => {
  it("liest einen gespeicherten Plan zurueck", () => {
    const gespeichert = JSON.parse(JSON.stringify(buildStrengthWeekPlan(4)));
    expect(weekPlanSchema.parse(gespeichert)).toEqual(buildStrengthWeekPlan(4));
  });
  it("fuellt repsMax und loadPct mit ihren Vorgabewerten", () => {
    const [woche] = weekPlanSchema.parse([
      { week: 1, sets: 4, reps: 5, rir: 2, note: "Test" },
    ]);
    expect(woche).toMatchObject({ repsMax: null, loadPct: 1 });
  });
  it("parseWeekPlan verwirft Unbrauchbares statt halb zu rechnen", () => {
    expect(parseWeekPlan(null)).toBeNull();
    expect(parseWeekPlan([])).toBeNull();
    expect(parseWeekPlan("kein Plan")).toBeNull();
    expect(parseWeekPlan([{ week: 1, sets: 4 }])).toBeNull();
    // Die Testwoche steht mit 0 Saetzen im Plan und muss gelesen werden.
    expect(parseWeekPlan(buildTestPhaseWeekPlan(2))).toHaveLength(2);
    expect(parseWeekPlan(buildStrengthWeekPlan(3))).toHaveLength(3);
  });
});
