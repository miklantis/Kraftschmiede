import { describe, expect, it } from "vitest";
import {
  withAppendedSet,
  withBar,
  withEntryNote,
  withRemovedSet,
  withSetDone,
  withSetValue,
  withWarmDone,
  withWarmValue,
} from "../liveEntries";
import type { LiveEntry, LiveSet, LiveWarmupSet } from "../liveSession";

function set(over: Partial<LiveSet> = {}): LiveSet {
  return {
    reps: 8,
    weight: 60,
    score: 3,
    targetScore: 3,
    targetReps: 8,
    targetWeight: 60,
    done: false,
    failed: false,
    adjusted: false,
    adjustNote: "",
    ...over,
  };
}
function warm(over: Partial<LiveWarmupSet> = {}): LiveWarmupSet {
  return { reps: 5, weight: 40, done: false, ...over };
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
    warmupSets: [warm()],
    sets: [set(), set()],
    note: "",
    ...over,
  };
}

describe("withSetDone", () => {
  it("hakt genau den gemeinten Satz ab", () => {
    const next = withSetDone([entry()], 0, 1, true);
    expect(next[0].sets[0].done).toBe(false);
    expect(next[0].sets[1].done).toBe(true);
  });

  it("laesst unbeteiligte Uebungen referenzgleich", () => {
    const a = entry();
    const b = entry({ exerciseId: "b" });
    const next = withSetDone([a, b], 0, 0, true);
    expect(next[1]).toBe(b);
    expect(next[0]).not.toBe(a);
  });

  it("gibt dasselbe Array zurueck, wenn es den Satz nicht gibt", () => {
    const list = [entry()];
    expect(withSetDone(list, 0, 9, true)).toBe(list);
    expect(withSetDone(list, 5, 0, true)).toBe(list);
  });
});

describe("withWarmDone", () => {
  it("hakt den Aufwaermsatz ab, ohne die Arbeitssaetze zu beruehren", () => {
    const next = withWarmDone([entry()], 0, 0, true);
    expect(next[0].warmupSets[0].done).toBe(true);
    expect(next[0].sets[0].done).toBe(false);
  });
});

describe("withSetValue - Gewicht", () => {
  it("setzt keinen Vermerk, wenn das Gewicht dem Ziel entspricht", () => {
    const next = withSetValue([entry()], 0, 0, "weight", 60, false);
    expect(next[0].sets[0].weight).toBe(60);
    expect(next[0].sets[0].adjusted).toBe(false);
    expect(next[0].sets[0].adjustNote).toBe("");
  });

  it("setzt den Vermerk, sobald das Gewicht abweicht", () => {
    const next = withSetValue([entry()], 0, 0, "weight", 65, false);
    expect(next[0].sets[0].weight).toBe(65);
    expect(next[0].sets[0].adjusted).toBe(true);
    expect(next[0].sets[0].adjustNote).toBe("Gewicht angepasst");
  });

  it("laesst den Vermerk beim Zuruecksetzen auf das Ziel stehen (heutiges Verhalten)", () => {
    const eins = withSetValue([entry()], 0, 0, "weight", 65, false);
    const zwei = withSetValue(eins, 0, 0, "weight", 60, false);
    expect(zwei[0].sets[0].weight).toBe(60);
    expect(zwei[0].sets[0].adjusted).toBe(true);
  });
});

describe("withSetValue - Bewertung", () => {
  it("markiert Bewertung 5 als gescheitert", () => {
    const next = withSetValue([entry()], 0, 0, "score", 5, false);
    expect(next[0].sets[0].score).toBe(5);
    expect(next[0].sets[0].failed).toBe(true);
  });

  it("laesst Bewertung 3 als geschafft stehen", () => {
    const next = withSetValue([entry({ sets: [set({ failed: true })] })], 0, 0, "score", 3, false);
    expect(next[0].sets[0].failed).toBe(false);
  });
});

describe("withSetValue - Wiederholungen", () => {
  it("rundet und klemmt negative bzw. ungueltige Werte auf 0", () => {
    expect(withSetValue([entry()], 0, 0, "reps", -4, false)[0].sets[0].reps).toBe(0);
    expect(withSetValue([entry()], 0, 0, "reps", Number.NaN, false)[0].sets[0].reps).toBe(0);
    expect(withSetValue([entry()], 0, 0, "reps", 8.6, false)[0].sets[0].reps).toBe(9);
  });

  it("klemmt die Wiederholungen im 1RM-Test auf das Maximum", () => {
    expect(withSetValue([entry()], 0, 0, "reps", 12, true)[0].sets[0].reps).toBe(5);
    expect(withSetValue([entry()], 0, 0, "reps", 0, true)[0].sets[0].reps).toBe(1);
    expect(withSetValue([entry()], 0, 0, "reps", 3, true)[0].sets[0].reps).toBe(3);
  });
});

describe("withWarmValue", () => {
  it("rundet die Wiederholungen und laesst das Gewicht frei", () => {
    const next = withWarmValue([entry()], 0, 0, "reps", 5.4);
    expect(next[0].warmupSets[0].reps).toBe(5);
    expect(withWarmValue([entry()], 0, 0, "weight", 42.5)[0].warmupSets[0].weight).toBe(42.5);
  });
});

describe("withAppendedSet", () => {
  it("haengt einen Satz mit den Zielwerten des letzten an", () => {
    const e = entry({ sets: [set({ targetReps: 10, targetWeight: 80, done: true })] });
    const next = withAppendedSet([e], 0);
    expect(next[0].sets).toHaveLength(2);
    expect(next[0].sets[1].reps).toBe(10);
    expect(next[0].sets[1].targetWeight).toBe(80);
    expect(next[0].sets[1].done).toBe(false);
  });
});

describe("withRemovedSet", () => {
  it("entfernt den letzten Satz", () => {
    const next = withRemovedSet([entry()], 0);
    expect(next[0].sets).toHaveLength(1);
  });

  it("ist beim letzten verbleibenden Satz wirkungslos und gibt dasselbe Array zurueck", () => {
    const list = [entry({ sets: [set()] })];
    expect(withRemovedSet(list, 0)).toBe(list);
  });
});

describe("withBar", () => {
  it("uebernimmt Kennung, Name und Gewicht der Stange", () => {
    const next = withBar([entry()], 0, { id: "b2", name: "Kurz", weight: 10 });
    expect(next[0].barId).toBe("b2");
    expect(next[0].barName).toBe("Kurz");
    expect(next[0].barWeight).toBe(10);
  });
});

describe("withEntryNote", () => {
  it("setzt die Notiz an der gemeinten Uebung und laesst die andere in Ruhe", () => {
    const a = entry();
    const b = entry({ exerciseId: "b" });
    const next = withEntryNote([a, b], 1, "Schmerzen links");
    expect(next[1].note).toBe("Schmerzen links");
    expect(next[0]).toBe(a);
  });

  it("entfernt die Notiz bei leerem Text", () => {
    const next = withEntryNote([entry({ note: "alt" })], 0, "   ");
    expect(next[0].note).toBe("");
  });

  it("schneidet Leerraum ab", () => {
    const next = withEntryNote([entry()], 0, "  fiel schwer  ");
    expect(next[0].note).toBe("fiel schwer");
  });

  it("bleibt referenzgleich, wenn sich nichts aendert", () => {
    const entries = [entry({ note: "gleich" })];
    expect(withEntryNote(entries, 0, "gleich")).toBe(entries);
    expect(withEntryNote(entries, 5, "egal")).toBe(entries);
  });
});
