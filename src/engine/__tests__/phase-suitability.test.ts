import { describe, expect, it } from "vitest";
import { loadForReps, workWeightForPhase } from "../phaseChange";
import type { PhaseWeightOpts } from "../phaseChange";
import { suitability } from "../suitability";
import type { Exercise, SuitabilityTemplate } from "../types";

describe("loadForReps – invertierte Epley-Naeherung", () => {
  it("1 Wdh = 1RM", () => {
    expect(loadForReps(100, 1)).toBe(100);
  });
  it("ohne 1RM = 0", () => {
    expect(loadForReps(0, 5)).toBe(0);
  });
  it("5 Wdh ~ 86% 1RM", () => {
    expect(Math.round(loadForReps(100, 5))).toBe(86);
  });
});

describe("workWeightForPhase – Phasenwechsel (Paritaet zu V1)", () => {
  const base: PhaseWeightOpts = {
    bar: { weight: 20 },
    plates: [1.25, 2.5, 5, 10, 15, 20, 25],
  };
  const opts = (cur: number): PhaseWeightOpts => ({ ...base, currentWeight: cur });

  it("ohne 1RM => halten", () => {
    const r = workWeightForPhase(null, [8, 12], opts(70));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(70);
  });
  it("zu schwere Altlast wird gesenkt", () => {
    const r = workWeightForPhase(100, [8, 12], opts(85));
    expect(r.decision).toBe("lower");
    expect(r.weight).toBe(67.5);
  });
  it("Aufwaertswechsel auf +12% gedeckelt (60 -> 65)", () => {
    const r = workWeightForPhase(100, [4, 6], opts(60));
    expect(r.decision).toBe("raise");
    expect(r.weight).toBe(65);
  });
  it("Aufwaertswechsel ohne Deckel (~8 Wdh)", () => {
    const r = workWeightForPhase(100, [4, 6], opts(75));
    expect(r.decision).toBe("raise");
    expect(r.weight).toBe(77.5);
  });
  it("bereits passend => halten", () => {
    const r = workWeightForPhase(100, [8, 12], opts(67.5));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(67.5);
  });
});

describe("suitability – Phasen-Fit (Paritaet zu V1)", () => {
  const exMap: Record<string, Exercise> = {
    sq: { id: "sq", name: "Squat", tier: "main", profile: "strength", muscleGroups: ["legs"], recoveryHours: 48 },
    bp: { id: "bp", name: "Bench", tier: "main", profile: "strength", muscleGroups: ["chest"], recoveryHours: 48 },
    cu: { id: "cu", name: "Curl", tier: "accessory", profile: "strength", muscleGroups: ["biceps"], recoveryHours: 48 },
    co: { id: "co", name: "Core", tier: "main", profile: "core", muscleGroups: ["core"], recoveryHours: 24 },
  };
  const tplTwoMain: SuitabilityTemplate = {
    id: "t2",
    items: [{ exerciseId: "sq" }, { exerciseId: "bp" }, { exerciseId: "co" }],
  };
  const tplOneMain: SuitabilityTemplate = {
    id: "t1",
    items: [{ exerciseId: "sq" }, { exerciseId: "cu" }, { exerciseId: "co" }],
  };
  const suit = (t: SuitabilityTemplate, focus: string) =>
    suitability(
      t,
      { now: Date.now(), lastByExercise: {}, soreness: {}, weekCounts: {}, phase: { focus } },
      { exMap },
    );
  const diff2 = (a: number, b: number) => Math.round((a - b) * 100) / 100;

  it("Kraftphase: 2 Hauptlifts schlagen 1 (+0.6 pro Hauptlift)", () => {
    expect(diff2(suit(tplTwoMain, "strength").score, suit(tplOneMain, "strength").score)).toBe(0.6);
  });
  it("Hypertrophie-Phase: kein Hauptlift-Bonus", () => {
    expect(diff2(suit(tplTwoMain, "hypertrophy").score, suit(tplOneMain, "hypertrophy").score)).toBe(
      0,
    );
  });
  it("Testphase vs. Hypertrophie: Delta 0.7", () => {
    expect(diff2(suit(tplTwoMain, "test").score, suit(tplTwoMain, "hypertrophy").score)).toBe(0.7);
  });

  it("Kater=3 schliesst aus", () => {
    const r = suitability(
      tplTwoMain,
      { now: Date.now(), lastByExercise: {}, soreness: { legs: 3 }, weekCounts: {} },
      { exMap },
    );
    expect(r.excluded).toBe(true);
  });
});
