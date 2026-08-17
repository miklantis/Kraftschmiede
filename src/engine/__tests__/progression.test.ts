import { describe, expect, it } from "vitest";
import { suggestWeight } from "../progression";
import type { EngineSet, SetEntry } from "../types";

const EX = { workWeight: 60, repRange: [8, 12] as [number, number], targetScore: 3 };
const entry = (sets: EngineSet[]): SetEntry => ({ sets });
const work = (o: Partial<EngineSet>): EngineSet => ({
  type: "work",
  weight: 60,
  reps: 8,
  done: true,
  targetReps: 8,
  targetWeight: 60,
  score: 3,
  ...o,
});

describe("suggestWeight – Doppelprogression", () => {
  it("keine Vordaten => Startgewicht halten", () => {
    const r = suggestWeight(EX, null);
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(12);
  });

  it("Repband oben erreicht => Gewicht +Schritt, Reps zuruecksetzen", () => {
    const r = suggestWeight(EX, entry([work({ reps: 12, score: 2 }), work({ reps: 12, score: 2 })]));
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
    expect(r.targetReps).toBe(8);
  });

  it("leichter als Ziel, Repband nicht voll => Wiederholungen steigern", () => {
    const r = suggestWeight(EX, entry([work({ reps: 9, score: 2 }), work({ reps: 9, score: 2 })]));
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(10);
  });

  it("Bandende voll, aber nur am Ziel => Gewicht bleibt (Saetze steigern)", () => {
    const r = suggestWeight(EX, entry([work({ reps: 12, targetReps: 12, score: 3 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(12);
  });

  it("Score genau am Ziel und erfuellt => eine Wiederholung mehr", () => {
    const r = suggestWeight(EX, entry([work({ reps: 10, targetReps: 10, score: 3 })]));
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(11);
  });

  it("Score am Ziel im schmalen Repband => Einzelschritt statt Sprung ans Bandende", () => {
    // Maximalkraft-Fall: Band 4-6, vier Saetze mit 4 Wiederholungen im Ziel.
    const kraft = { workWeight: 50, repRange: [4, 6] as [number, number], targetScore: 3 };
    const satz = (): EngineSet => ({
      type: "work",
      weight: 50,
      reps: 4,
      done: true,
      targetReps: 4,
      targetWeight: 50,
      score: 3,
    });
    const r = suggestWeight(kraft, entry([satz(), satz(), satz(), satz()]));
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(50);
    expect(r.targetReps).toBe(5);
  });

  it("Steigerung richtet sich nach dem schwaechsten Satz", () => {
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 10, targetReps: 9, score: 2 }),
        work({ reps: 9, targetReps: 9, score: 2 }),
      ]),
    );
    expect(r.decision).toBe("increase-reps");
    expect(r.targetReps).toBe(10);
  });

  it("erfuellt, aber hart => Wiederholungen bleiben stehen", () => {
    const r = suggestWeight(EX, entry([work({ reps: 9, targetReps: 9, score: 4 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(9);
  });

  it("Ziel verfehlt => oberes Bandende bleibt das Ziel", () => {
    const r = suggestWeight(EX, entry([work({ reps: 7, targetReps: 10, score: 3 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(12);
  });

  it("Versagen => Gewicht senken", () => {
    const r = suggestWeight(EX, entry([work({ reps: 5, failed: true, score: 5 })]));
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(57.5);
  });

  it("Last reduziert => Gewicht senken", () => {
    const r = suggestWeight(EX, entry([work({ weight: 55, score: 3 })]));
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(57.5);
  });

  it("hart, aber kein Versagen => Gewicht halten", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 4 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });

  it("Wiedereinstieg: leicht und sauber => vorsichtig erhoehen (abgerundet)", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 3 })]), { reentry: true });
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
    expect(r.targetReps).toBe(8);
  });

  it("Wiedereinstieg mit Schmerz-Flag => Gewicht halten", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 3, painFlag: true })]), {
      reentry: true,
    });
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });
});

describe("suggestWeight – Kurzhantel-Stufen", () => {
  const DB = [8, 10, 12, 14, 16, 18, 20];
  const dbEx = {
    workWeight: 14,
    repRange: [8, 12] as [number, number],
    targetScore: 3,
  };
  const dbWork = (o: Partial<EngineSet>): EngineSet => ({
    type: "work",
    weight: 14,
    reps: 8,
    done: true,
    targetReps: 8,
    targetWeight: 14,
    score: 3,
    ...o,
  });

  it("keine Vordaten => Startgewicht auf vorhandene Stufe", () => {
    const r = suggestWeight(dbEx, null, { dumbbells: DB });
    expect(r.weight).toBe(14);
    expect(r.decision).toBe("hold");
  });

  it("Repband oben erreicht => eine Stufe hoch (kein Scheiben-Schritt)", () => {
    // W+2.5 = 16.5 -> naechste Stufe 16
    const r = suggestWeight(
      dbEx,
      entry([dbWork({ reps: 12, score: 2 }), dbWork({ reps: 12, score: 2 })]),
      { dumbbells: DB },
    );
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(16);
  });

  it("Versagen => Stufe runter, konservativ abgerundet", () => {
    // W-2.5 = 11.5, beim Senken wird abgerundet -> naechste Stufe darunter: 10
    const r = suggestWeight(
      dbEx,
      entry([dbWork({ score: 5, failed: true }), dbWork({ score: 5, failed: true })]),
      { dumbbells: DB },
    );
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(10);
  });
});
