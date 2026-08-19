import { describe, expect, it } from "vitest";
import {
  buildStrengthWeekPlan,
  buildTestPhaseWeekPlan,
  buildWeekPlan,
  DELOAD_LOAD_PCT,
  DELOAD_SETS,
  hasWeekPlanFocus,
  parseWeekPlan,
  repLadder,
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

describe("buildStrengthWeekPlan – Kraft- und Schnellkraftphase", () => {
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
  it("jede Woche hat einen Wochenziel-Text", () => {
    const plan = buildStrengthWeekPlan(5);
    expect(plan.every((w) => w.note.length > 0)).toBe(true);
    expect(plan[0]!.note).toMatch(/Startgewicht/);
    expect(plan[4]!.note).toMatch(/Schwerste/);
  });
});

describe("buildTestPhaseWeekPlan – Entlastung, dann reine Testwoche", () => {
  it("die letzte Woche ist die Testwoche: keine geplante Einheit", () => {
    const plan = buildTestPhaseWeekPlan(2);
    expect(plan.map((w) => w.week)).toEqual([1, 2]);
    expect(plan[1]!).toMatchObject({ sets: 0, loadPct: 1 });
    expect(weekDemandsSession(plan[1]!)).toBe(false);
    expect(plan[1]!.note).toMatch(/Testwoche/);
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

describe("buildWeekPlan – nur Kraft, Schnellkraft und Test bekommen einen Plan", () => {
  it("strength und power fahren die Leiter", () => {
    expect(buildWeekPlan("strength", 4)?.map((w) => w.reps)).toEqual([5, 4, 3, 2]);
    expect(buildWeekPlan("power", 3)?.map((w) => w.reps)).toEqual([5, 4, 3]);
  });
  it("test faehrt Entlastung und Testwoche", () => {
    expect(buildWeekPlan("test", 2)?.map((w) => w.sets)).toEqual([DELOAD_SETS, 0]);
    expect(buildWeekPlan("test", 2)?.[0]!.loadPct).toBe(DELOAD_LOAD_PCT);
  });
  it("alle uebrigen Fokusse bleiben ohne Plan", () => {
    expect(buildWeekPlan("hypertrophy", 5)).toBeNull();
    expect(buildWeekPlan("endurance", 3)).toBeNull();
    expect(buildWeekPlan("reentry", 2)).toBeNull();
    expect(buildWeekPlan("maintenance", 4)).toBeNull();
    expect(buildWeekPlan(null, 4)).toBeNull();
  });
  it("hasWeekPlanFocus deckt sich damit", () => {
    expect(hasWeekPlanFocus("strength")).toBe(true);
    expect(hasWeekPlanFocus("power")).toBe(true);
    expect(hasWeekPlanFocus("test")).toBe(true);
    expect(hasWeekPlanFocus("hypertrophy")).toBe(false);
    expect(hasWeekPlanFocus(null)).toBe(false);
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
