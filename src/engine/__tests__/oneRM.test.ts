import { describe, expect, it } from "vitest";
import {
  best1RMFromSets,
  brzycki,
  epley,
  nextRecord1RM,
  oneRM,
  record1RMFromSets,
  wathan,
} from "../oneRM";
import { scoreInfo, SCORE_MAP } from "../score";
import type { EngineSet } from "../types";

describe("oneRM", () => {
  it("reps=1 ergibt das Gewicht selbst", () => {
    expect(oneRM(100, 1)).toBe(100);
    expect(oneRM(100, 1, "epley")).toBe(100);
  });

  it("ohne Gewicht oder Reps => 0", () => {
    expect(oneRM(0, 5)).toBe(0);
    expect(oneRM(100, 0)).toBe(0);
  });

  it("Epley: 100kg x 5 ~ 116.7", () => {
    expect(Math.round(epley(100, 5) * 10) / 10).toBe(116.7);
  });

  it("Brzycki: 100kg x 5 ~ 112.5", () => {
    expect(Math.round(brzycki(100, 5) * 10) / 10).toBe(112.5);
  });

  it("Wathan liefert plausiblen Wert > Gewicht", () => {
    expect(wathan(100, 5)).toBeGreaterThan(100);
  });

  it("Default = Mittelwert der drei Formeln", () => {
    const mean = (brzycki(100, 5) + epley(100, 5) + wathan(100, 5)) / 3;
    expect(oneRM(100, 5)).toBeCloseTo(mean, 6);
  });
});

describe("best1RMFromSets", () => {
  const formula = "epley";

  it("nimmt den besten sauberen Arbeitssatz", () => {
    const sets: EngineSet[] = [
      { type: "warmup", weight: 60, reps: 5, done: true }, // Aufwaermen zaehlt nicht
      { type: "work", weight: 100, reps: 5, done: true },
      { type: "work", weight: 90, reps: 8, done: true },
    ];
    const r = best1RMFromSets(sets, formula);
    expect(r.value).toBe(Math.round(epley(100, 5) * 100) / 100);
    expect(r.lowConfidence).toBe(false);
  });

  it("ignoriert nicht abgehakte und versagte Saetze", () => {
    const sets: EngineSet[] = [
      { type: "work", weight: 120, reps: 3, done: false },
      { type: "work", weight: 110, reps: 3, failed: true, done: true },
      { type: "work", weight: 80, reps: 5, done: true },
    ];
    const r = best1RMFromSets(sets, formula);
    expect(r.value).toBe(Math.round(epley(80, 5) * 100) / 100);
  });

  it("lowConfidence bei hohen Wiederholungen (>10)", () => {
    const sets: EngineSet[] = [{ type: "work", weight: 50, reps: 15, done: true }];
    expect(best1RMFromSets(sets, formula).lowConfidence).toBe(true);
  });

  it("ohne saubere Saetze => value null", () => {
    expect(best1RMFromSets([], formula).value).toBe(null);
  });
});

describe("scoreInfo", () => {
  it("kennt Score 1..5", () => {
    expect(scoreInfo(3)?.label).toBe("im Ziel");
    expect(scoreInfo(5)?.rir).toBe("0");
    expect(SCORE_MAP[1]?.label).toBe("sehr leicht");
  });

  it("unbekannter Score => null", () => {
    expect(scoreInfo(9)).toBe(null);
  });
});

describe("record1RMFromSets", () => {
  it("zaehlt nur Saetze mit hoechstens 5 Wiederholungen", () => {
    const sets: EngineSet[] = [
      { type: "work", weight: 60, reps: 12, done: true },
      { type: "work", weight: 80, reps: 4, done: true },
    ];
    expect(record1RMFromSets(sets, "mean")).toBeCloseTo(
      oneRM(80, 4, "mean"),
      1,
    );
  });

  it("ohne Satz im Rekord-Bereich => null", () => {
    const sets: EngineSet[] = [{ type: "work", weight: 60, reps: 10, done: true }];
    expect(record1RMFromSets(sets, "mean")).toBe(null);
  });

  it("ignoriert Aufwaermen, nicht Erledigtes und Versagen", () => {
    const sets: EngineSet[] = [
      { type: "warmup", weight: 100, reps: 3, done: true },
      { type: "work", weight: 100, reps: 3, done: false },
      { type: "work", weight: 100, reps: 3, done: true, failed: true },
    ];
    expect(record1RMFromSets(sets, "mean")).toBe(null);
  });
});

describe("nextRecord1RM", () => {
  it("hebt nur an, wenn der Kandidat den Rekord schlaegt", () => {
    expect(nextRecord1RM({ current: 100, record: 110, estimate: 110 })).toBe(110);
  });

  it("senkt nie von allein", () => {
    expect(nextRecord1RM({ current: 100, record: 90, estimate: 95 })).toBe(null);
    expect(nextRecord1RM({ current: 100, record: null, estimate: 80 })).toBe(null);
  });

  it("befuellt ohne bisherigen Rekord erst (Kandidat, sonst Schaetzwert)", () => {
    expect(nextRecord1RM({ current: null, record: 90, estimate: 95 })).toBe(90);
    expect(nextRecord1RM({ current: 0, record: null, estimate: 95 })).toBe(95);
    expect(nextRecord1RM({ current: null, record: null, estimate: null })).toBe(null);
  });
});
