import { describe, expect, it } from "vitest";
import { deloadCheck, rampSets, volumeForWeek } from "../volume";
import type { VolumePhase } from "../types";

describe("volumeForWeek – Rampe & Deload (Paritaet zu V1)", () => {
  // Phase A: 6 Wochen, Satz-Rampe 3..6, Deload in Woche 6 (letzte Woche).
  const A: VolumePhase = { setsStart: 3, setsEnd: 6, weeks: 6, deloadWeek: 6 };
  it("A W5 (Rampe vor Deload) = 5", () => {
    expect(volumeForWeek(A, 4, true)).toBe(5);
  });
  it("A W6 Deload greift (75% der Vorwoche) = 4", () => {
    expect(volumeForWeek(A, 5, true)).toBe(4);
  });

  // Phase B: 5 Wochen, Satz-Rampe 2..4, Deload in Woche 4 (vorletzte Woche).
  const B: VolumePhase = { setsStart: 2, setsEnd: 4, weeks: 5, deloadWeek: 4 };
  it("B W4 Deload greift = 2", () => {
    expect(volumeForWeek(B, 3, true)).toBe(2);
  });
  it("B W5 wieder volle Rampe (nicht Deload) = 4", () => {
    expect(volumeForWeek(B, 4, true)).toBe(4);
  });
  it("B W5 mit roten Markern konservativ (-1) = 3", () => {
    expect(volumeForWeek(B, 4, false)).toBe(3);
  });
  it("B W4 Deload bleibt von Markern unberuehrt = 2", () => {
    expect(volumeForWeek(B, 3, false)).toBe(2);
  });

  // Phase ohne Deload: keine Senkung, Rampe steigt.
  const C: VolumePhase = { setsStart: 2, setsEnd: 4, weeks: 4, deloadWeek: null };
  it("C W1 Start = 2", () => {
    expect(volumeForWeek(C, 0, true)).toBe(2);
  });
  it("C W4 Ende (keine Deload-Senkung) = 4", () => {
    expect(volumeForWeek(C, 3, true)).toBe(4);
  });
});

describe("rampSets", () => {
  it("eine Woche => direkt Endwert", () => {
    expect(rampSets(2, 4, 0, 1)).toBe(4);
  });
  it("lineare Interpolation", () => {
    expect(rampSets(2, 6, 1, 5)).toBe(3);
  });
});

describe("deloadCheck", () => {
  it("zwei Signale => Deload", () => {
    const r = deloadCheck({ perfDropTwoSessions: true, soreness: 2 });
    expect(r.deload).toBe(true);
    expect(r.tipping).toBe(2);
  });
  it("ein Signal => kein Deload", () => {
    expect(deloadCheck({ soreness: 3 }).deload).toBe(false);
  });
  it("niedrige Readiness zaehlt als Signal", () => {
    const r = deloadCheck({ perfDropTwoSessions: true, readiness: 2 });
    expect(r.deload).toBe(true);
  });
  it("keine Signale => kein Deload", () => {
    expect(deloadCheck({ readiness: 5, soreness: 0 }).deload).toBe(false);
  });
});
