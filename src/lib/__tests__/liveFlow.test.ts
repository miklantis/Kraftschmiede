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
    equipment: "barbell",
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

  // Vorhaben #100: Einstieg mitten in der Einheit (belegtes Rack).
  it("bleibt in der Fokus-Uebung, obwohl die erste noch offen ist", () => {
    const a = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    const b = entry({ sets: [set(true), set(false)] });
    expect(computeActive([a, b], 1)).toEqual({ ei: 1, si: 1, warm: false });
    expect(computeActive([a, b])).toEqual({ ei: 0, si: 0, warm: true });
  });

  it("nimmt auch in der Fokus-Uebung erst deren Aufwaermsatz", () => {
    const a = entry({ sets: [set(false)] });
    const b = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    expect(computeActive([a, b], 1)).toEqual({ ei: 1, si: 0, warm: true });
  });

  it("faellt auf die naechste offene Uebung zurueck, wenn die Fokus-Uebung fertig ist", () => {
    const a = entry({ sets: [set(false)] });
    const b = entry({ sets: [set(true)] });
    expect(computeActive([a, b], 1)).toEqual({ ei: 0, si: 0, warm: false });
  });

  it("ignoriert einen Fokus ausserhalb der Uebungsliste", () => {
    const a = entry({ sets: [set(false)] });
    expect(computeActive([a], 7)).toEqual({ ei: 0, si: 0, warm: false });
    expect(computeActive([a], -1)).toEqual({ ei: 0, si: 0, warm: false });
  });

  it("liefert auch mit Fokus null, wenn alles erledigt ist", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ sets: [set(true)] });
    expect(computeActive([a, b], 1)).toBeNull();
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

  // Vorhaben #100: der gemeldete Fall - Bankdruecken zuerst, waehrend beim
  // Kreuzheben noch die Aufwaermsaetze offen sind. Frueher kam hier gar keine
  // Pause, weil der global naechste offene Satz ein Aufwaermsatz war.
  it("Satzpause, auch wenn eine andere Uebung noch Aufwaermsaetze offen hat", () => {
    const kreuzheben = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    const bank = entry({ sets: [set(true), set(false)] });
    expect(restAfterSet([kreuzheben, bank], 1)).toBe("set");
  });

  it("Satzpause statt Uebungspause, wenn die eigene Uebung noch offen ist", () => {
    const a = entry({ sets: [set(false)] });
    const b = entry({ sets: [set(true), set(false)] });
    expect(restAfterSet([a, b], 1)).toBe("set");
  });

  it("Uebungspause, wenn die eigene Uebung durch ist und nur Arbeitssaetze folgen", () => {
    const a = entry({ sets: [set(false)] });
    const b = entry({ sets: [set(true)] });
    expect(restAfterSet([a, b], 1)).toBe("exercise");
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

  it("nennt die Fokus-Uebung, solange sie offene Arbeitssaetze hat", () => {
    const a = entry({ sets: [set(false), set(false)] });
    const b = entry({ sets: [set(true), set(false)] });
    expect(progressInfo([a, b], 1).curLabel).toBe("Übung 2 von 2");
    expect(progressInfo([a, b]).curLabel).toBe("Übung 1 von 2");
  });

  it("faellt auf die erste offene Uebung zurueck, wenn die Fokus-Uebung fertig ist", () => {
    const a = entry({ sets: [set(false)] });
    const b = entry({ sets: [set(true)] });
    expect(progressInfo([a, b], 1).curLabel).toBe("Übung 1 von 2");
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
