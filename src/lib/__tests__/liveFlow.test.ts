import { describe, expect, it } from "vitest";
import {
  appendedSet,
  computeActive,
  isActive,
  progressInfo,
  restAfterSet,
} from "../liveFlow";
import type { LiveEntry, LiveSet, LiveWarmupSet } from "../liveSession";

function set(done: boolean, over: Partial<LiveSet> = {}): LiveSet {
  return {
    reps: 8,
    weight: 60,
    score: 3,
    targetReps: 8,
    targetWeight: 60,
    done,
    failed: false,
    adjusted: false,
    adjustNote: "",
    ...over,
  };
}
function warm(done: boolean): LiveWarmupSet {
  return { reps: 5, weight: 40, done };
}
function entry(over: Partial<LiveEntry> = {}): LiveEntry {
  return {
    exerciseId: "e",
    exerciseName: "Uebung",
    category: "barbell",
    tag: "",
    barId: "bar1",
    barName: "Standard",
    barWeight: 20,
    warmupSets: [],
    sets: [set(false), set(false)],
    ...over,
  };
}

describe("computeActive", () => {
  it("nimmt zuerst den offenen Aufwaermsatz", () => {
    const e = entry({ warmupSets: [warm(true), warm(false)], sets: [set(false)] });
    expect(computeActive([e])).toEqual({ ei: 0, si: 1, warm: true });
  });

  it("geht nach erledigtem Aufwaermen zum ersten Arbeitssatz", () => {
    const e = entry({ warmupSets: [warm(true)], sets: [set(true), set(false)] });
    expect(computeActive([e])).toEqual({ ei: 0, si: 1, warm: false });
  });

  it("springt zur naechsten Uebung, wenn die erste fertig ist", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ sets: [set(false)] });
    expect(computeActive([a, b])).toEqual({ ei: 1, si: 0, warm: false });
  });

  it("liefert null, wenn alles erledigt ist", () => {
    const e = entry({ warmupSets: [warm(true)], sets: [set(true)] });
    expect(computeActive([e])).toBeNull();
  });
});

describe("isActive", () => {
  it("trennt Aufwaerm- und Arbeitssatz bei gleichem Index", () => {
    const a = { ei: 0, si: 0, warm: true };
    expect(isActive(a, 0, 0, true)).toBe(true);
    expect(isActive(a, 0, 0, false)).toBe(false);
  });
});

describe("restAfterSet", () => {
  it("keine Pause, wenn als Naechstes ein Aufwaermsatz dran ist", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    expect(restAfterSet([a, b], 0)).toBeNull();
  });

  it("Satzpause, wenn der naechste offene Satz dieselbe Uebung ist", () => {
    const e = entry({ sets: [set(true), set(false)] });
    expect(restAfterSet([e], 0)).toBe("set");
  });

  it("Uebungspause, wenn die naechste Uebung dran ist", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ sets: [set(false)] });
    expect(restAfterSet([a, b], 0)).toBe("exercise");
  });

  it("keine Pause, wenn alles erledigt ist", () => {
    const e = entry({ sets: [set(true)] });
    expect(restAfterSet([e], 0)).toBeNull();
  });
});

describe("progressInfo", () => {
  it("zaehlt nur Arbeitssaetze und nennt die aktuelle Uebung", () => {
    const a = entry({ sets: [set(true), set(true)] });
    const b = entry({ sets: [set(false), set(false)] });
    const p = progressInfo([a, b]);
    expect(p.total).toBe(4);
    expect(p.done).toBe(2);
    expect(p.exCount).toBe(2);
    expect(p.curLabel).toBe("Übung 2 von 2");
    expect(p.progress).toBe("2 / 4 Sätze");
  });
});

describe("appendedSet", () => {
  it("uebernimmt die Zielwerte des letzten Satzes, nicht abgehakt", () => {
    const e = entry({
      sets: [set(true, { targetReps: 10, targetWeight: 80, weight: 82, score: 4 })],
    });
    const s = appendedSet(e);
    expect(s.reps).toBe(10);
    expect(s.weight).toBe(80);
    expect(s.targetReps).toBe(10);
    expect(s.targetWeight).toBe(80);
    expect(s.done).toBe(false);
    expect(s.adjusted).toBe(false);
  });
});
