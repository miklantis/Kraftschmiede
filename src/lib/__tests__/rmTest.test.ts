import { describe, it, expect } from "vitest";
import {
  buildTestSets,
  clampTestReps,
  testResult,
  testWeight,
  TEST_SHARE,
} from "@/lib/rmTest";

const ctx = {
  equipment: "barbell",
  barWeight: 20,
  plates: [1.25, 2.5, 5, 10, 20],
  dumbbells: [] as number[],
  step: 2.5,
};

describe("testWeight", () => {
  it("belegt mit rund 90 % des Rekords vor, auf eine ladbare Stufe gerundet", () => {
    const w = testWeight(100, ctx);
    expect(w).toBeGreaterThan(100 * TEST_SHARE - 3);
    expect(w).toBeLessThan(100 * TEST_SHARE + 3);
    // ladbar: Stange + Vielfaches von 2 x kleinster Scheibe
    expect(((w - 20) / 2.5) % 1).toBe(0);
  });

  it("nimmt bei Kurzhanteln die naechste vorhandene Stufe", () => {
    const w = testWeight(20, {
      ...ctx,
      equipment: "dumbbell",
      barWeight: null,
      dumbbells: [10, 12, 14, 16, 18, 20],
    });
    expect(w).toBe(18);
  });

  it("ohne Rekord kein Vorschlag", () => {
    expect(testWeight(null, ctx)).toBe(0);
    expect(testWeight(0, ctx)).toBe(0);
  });
});

describe("buildTestSets", () => {
  it("liefert zwei Startsaetze mit 5 und 3 Wiederholungen", () => {
    const sets = buildTestSets(80);
    expect(sets.map((s) => s.reps)).toEqual([5, 3]);
    expect(sets.every((s) => s.weight === 80 && !s.done)).toBe(true);
  });
});

describe("clampTestReps", () => {
  it("begrenzt auf 1 bis 5", () => {
    expect(clampTestReps(0)).toBe(1);
    expect(clampTestReps(3)).toBe(3);
    expect(clampTestReps(9)).toBe(5);
  });
});

describe("testResult", () => {
  it("nimmt den besten abgehakten Satz", () => {
    const r = testResult(
      [
        { reps: 5, weight: 90, done: true },
        { reps: 3, weight: 100, done: true },
        { reps: 1, weight: 130, done: false },
      ],
      "mean",
    );
    expect(r.best?.weight).toBe(100);
    expect(r.estRm ?? 0).toBeGreaterThan(100);
  });

  it("ignoriert nicht abgehakte Saetze und Saetze ueber 5 Wiederholungen", () => {
    expect(
      testResult([{ reps: 5, weight: 100, done: false }], "mean").estRm,
    ).toBeNull();
    expect(
      testResult([{ reps: 8, weight: 100, done: true }], "mean").estRm,
    ).toBeNull();
  });

  it("darf unter dem alten Rekord liegen (Test senkt bewusst)", () => {
    const r = testResult([{ reps: 3, weight: 60, done: true }], "mean");
    expect(r.estRm ?? 0).toBeLessThan(100);
  });
});
