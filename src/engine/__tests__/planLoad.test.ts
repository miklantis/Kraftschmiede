import { describe, expect, it } from "vitest";
import {
  anchorAfterSession,
  loadableDown,
  planStartWeight,
  planWeekLoad,
  planWeekMet,
} from "../planLoad";
import { scoreForRir } from "../score";
import type { EngineSet, SetEntry } from "../types";

const PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];
const OPTS = { bar: { weight: 20 }, plates: PLATES };

// Ein Arbeitssatz mit Vorgabe; Abweichungen kommen als Teilangabe herein.
function set(over: Partial<EngineSet> = {}): EngineSet {
  return {
    type: "work",
    weight: 40,
    reps: 5,
    score: 3,
    failed: false,
    done: true,
    targetReps: 5,
    targetWeight: 40,
    ...over,
  };
}

function entry(sets: EngineSet[]): SetEntry {
  return { sets };
}

describe("planStartWeight – Startgewicht beim Phaseneintritt", () => {
  it("rechnet aus dem 1RM ueber Planwiederholungen plus Reserve, abgerundet", () => {
    // 100 kg 1RM, 5 Ziel-Wdh + 2 Reserve -> 100 / (1 + 7/30) = 81,08 -> 80 kg
    expect(planStartWeight(100, 5, 0, OPTS)).toBe(80);
  });
  it("faellt ohne 1RM auf das letzte Arbeitsgewicht zurueck (z. B. Lunge)", () => {
    expect(planStartWeight(null, 5, 42, OPTS)).toBe(40);
  });
});

describe("planWeekMet – strenge Bewertung der gewerteten Einheit", () => {
  const target = scoreForRir(2); // RIR 2 -> Score 3

  it("alle Saetze voll, im Wochenziel -> erfuellt", () => {
    expect(planWeekMet(entry([set(), set(), set(), set()]), target)).toBe(true);
  });
  it("eine Wiederholung weniger reicht nicht (keine Ermuedungstoleranz)", () => {
    expect(planWeekMet(entry([set(), set(), set(), set({ reps: 4 })]), target)).toBe(
      false,
    );
  });
  it("reduziertes Gewicht -> nicht erfuellt", () => {
    expect(planWeekMet(entry([set(), set({ weight: 37.5 })]), target)).toBe(false);
  });
  it("Versagen -> nicht erfuellt, auch bei voller Wiederholungszahl", () => {
    expect(planWeekMet(entry([set(), set({ failed: true })]), target)).toBe(false);
  });
  it("zu hohe Durchschnitts-Anstrengung -> nicht erfuellt", () => {
    expect(
      planWeekMet(entry([set({ score: 4 }), set({ score: 4 })]), target),
    ).toBe(false);
  });
  it("ohne Arbeitssaetze -> nicht erfuellt", () => {
    expect(planWeekMet(entry([]), target)).toBe(false);
    expect(planWeekMet(null, target)).toBe(false);
  });
});

describe("planWeekLoad – Gewicht der laufenden Journey-Woche", () => {
  const base = {
    previousTargetScore: scoreForRir(2),
    fallbackWeight: 0,
    startReps: 5,
    step: 2.5,
    opts: OPTS,
  };

  it("ohne Anker: Startgewicht der Phase aus dem 1RM", () => {
    const res = planWeekLoad({ ...base, anchor: null, est1RM: 100 });
    expect(res).toEqual({ weight: 80, reason: "start", diff: 0 });
  });

  it("Vorwoche sauber: ein Schritt hoch", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 40,
      previousWeekEntry: entry([set(), set(), set(), set()]),
    });
    expect(res).toEqual({ weight: 42.5, reason: "raised", diff: 2.5 });
  });

  it("Vorwoche verfehlt: Gewicht bleibt stehen", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 40,
      previousWeekEntry: entry([set(), set({ reps: 3 })]),
    });
    expect(res).toEqual({ weight: 40, reason: "held", diff: 0 });
  });

  it("Uebung war in der Vorwoche nicht dran: ohne Beleg keine Erhoehung", () => {
    const res = planWeekLoad({ ...base, anchor: 40, previousWeekEntry: null });
    expect(res).toEqual({ weight: 40, reason: "held", diff: 0 });
  });

  it("zweite Einheit derselben Woche: gleiche Vorgabe wie die erste", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 40,
      currentWeekEntry: entry([set({ targetWeight: 42.5, weight: 42.5 })]),
      previousWeekEntry: entry([set(), set(), set(), set()]),
    });
    expect(res).toEqual({ weight: 42.5, reason: "same-week", diff: 0 });
  });

  it("gleiche Woche: auch eine im Training reduzierte Last aendert die Vorgabe nicht", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 40,
      currentWeekEntry: entry([set({ targetWeight: 42.5, weight: 37.5 })]),
    });
    expect(res).toEqual({ weight: 42.5, reason: "same-week", diff: 0 });
  });

  it("Schrittweite aus den Einstellungen, auf eine ladbare Stufe abgerundet", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 40,
      step: 4,
      previousWeekEntry: entry([set(), set()]),
    });
    // 44 kg sind mit 1,25er Scheiben nicht ladbar -> 42,5 kg
    expect(res.weight).toBe(42.5);
    // und der Text nennt die echte Differenz (2,5), nicht die Schrittweite (4)
    expect(res.diff).toBe(2.5);
  });

  it("loadPct der Planwoche senkt die Last (Entlastung der Kombiwoche)", () => {
    const res = planWeekLoad({ ...base, anchor: 50, loadPct: 0.6 });
    expect(res.weight).toBe(loadableDown(30, OPTS));
  });
});

describe("anchorAfterSession – Anker nach der Einheit", () => {
  it("im Training reduziert: der Anker zieht nach unten nach", () => {
    expect(anchorAfterSession(42.5, 37.5)).toBe(37.5);
  });
  it("mehr geladen als vorgegeben: der Anker zieht nicht mit", () => {
    expect(anchorAfterSession(42.5, 50)).toBe(42.5);
  });
  it("ohne Vorgabe zaehlt das Bewegte, ohne Bewegtes die Vorgabe", () => {
    expect(anchorAfterSession(null, 40)).toBe(40);
    expect(anchorAfterSession(40, null)).toBe(40);
    expect(anchorAfterSession(null, null)).toBeNull();
  });
});

// Kombiwoche der Testphase (#229): Entlastung vom Startgewicht X der
// vorangegangenen Kraftphase, ohne jede Steigerung.
describe("planWeekLoad – Kombiwoche (Entlastung)", () => {
  const base = {
    previousTargetScore: scoreForRir(2),
    fallbackWeight: 0,
    startReps: 3,
    step: 2.5,
    loadPct: 0.6,
    deload: true,
    opts: OPTS,
  };

  it("rechnet den Anteil vom Anker und rundet ladbar ab", () => {
    // 60 % von 50 = 30 kg (mit 20-kg-Stange ladbar)
    expect(planWeekLoad({ ...base, anchor: 50 })).toEqual({
      weight: 30,
      reason: "deload",
      diff: 0,
    });
  });

  it("steigert auch nach einer sauberen Vorwoche nicht", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 50,
      previousWeekEntry: entry([set(), set(), set(), set()]),
    });
    expect(res).toEqual({ weight: 30, reason: "deload", diff: 0 });
  });

  it("haelt die Vorgabe der Woche, wenn schon entlastet wurde", () => {
    const res = planWeekLoad({
      ...base,
      anchor: 50,
      currentWeekEntry: entry([set({ targetWeight: 30, weight: 30 })]),
    });
    expect(res).toEqual({ weight: 30, reason: "same-week", diff: 0 });
  });

  it("faellt ohne Startgewicht auf das 1RM zurueck", () => {
    // 1RM 100, 3 Ziel-Wdh + 2 Reserve -> 85,7 -> 60 % = 51,4 -> 50 kg
    const res = planWeekLoad({ ...base, anchor: null, est1RM: 100 });
    expect(res).toEqual({ weight: 50, reason: "deload", diff: 0 });
  });
});
