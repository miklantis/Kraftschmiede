import { describe, expect, it } from "vitest";
import {
  autoRestAfterSkillSet,
  autoRestAfterWorkSet,
  type AutoRestPrefs,
} from "../liveAutoRest";
import type {
  LiveEntry,
  LiveSet,
  LiveWarmupSet,
  SkillLiveExercise,
} from "../liveSession";

const PREFS: AutoRestPrefs = { setRestSec: 90, exerciseRestSec: 150, autoStart: true };
const PREFS_AUS: AutoRestPrefs = { ...PREFS, autoStart: false };

function set(done: boolean): LiveSet {
  return {
    reps: 8,
    weight: 60,
    score: 3,
    targetScore: 3,
    targetReps: 8,
    targetWeight: 60,
    done,
    failed: false,
    adjusted: false,
    adjustNote: "",
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
    barId: null,
    barName: null,
    barWeight: null,
    warmupSets: [],
    note: "",
    sets: [set(false)],
    ...over,
  };
}

describe("autoRestAfterWorkSet", () => {
  it("startet eine Satzpause, wenn der naechste offene Satz dieselbe Uebung ist", () => {
    const e = entry({ sets: [set(true), set(false)] });
    expect(autoRestAfterWorkSet([e], 0, PREFS)).toEqual({
      kind: "start",
      type: "set",
      sec: 90,
    });
  });

  // Vorhaben #100: Einstieg bei der zweiten Uebung, waehrend die erste noch
  // Aufwaermsaetze offen hat. Frueher lieferte das {kind:"clear"} - die Pause
  // blieb nicht nur aus, eine laufende wurde sogar abgebrochen.
  it("startet die Satzpause auch bei Einstieg mitten in der Einheit", () => {
    const kreuzheben = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    const bank = entry({ sets: [set(true), set(false)] });
    expect(autoRestAfterWorkSet([kreuzheben, bank], 1, PREFS)).toEqual({
      kind: "start",
      type: "set",
      sec: 90,
    });
  });

  it("startet eine Uebungspause, wenn die naechste Uebung dran ist", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ sets: [set(false)] });
    expect(autoRestAfterWorkSet([a, b], 0, PREFS)).toEqual({
      kind: "start",
      type: "exercise",
      sec: 150,
    });
  });

  it("bricht ab, wenn als Naechstes ein Aufwaermsatz dran ist", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    expect(autoRestAfterWorkSet([a, b], 0, PREFS)).toEqual({ kind: "clear" });
  });

  it("bricht ab, wenn alles erledigt ist", () => {
    const e = entry({ sets: [set(true)] });
    expect(autoRestAfterWorkSet([e], 0, PREFS)).toEqual({ kind: "clear" });
  });

  it("tut bei ausgeschaltetem Auto-Start und regulaer naechstem Satz nichts", () => {
    const e = entry({ sets: [set(true), set(false)] });
    expect(autoRestAfterWorkSet([e], 0, PREFS_AUS)).toEqual({ kind: "none" });
  });

  it("bricht bei ausgeschaltetem Auto-Start trotzdem ab, wenn Aufwaermen folgt", () => {
    const a = entry({ sets: [set(true)] });
    const b = entry({ warmupSets: [warm(false)], sets: [set(false)] });
    expect(autoRestAfterWorkSet([a, b], 0, PREFS_AUS)).toEqual({ kind: "clear" });
  });

  it("bricht bei ausgeschaltetem Auto-Start trotzdem ab, wenn alles erledigt ist", () => {
    const e = entry({ sets: [set(true)] });
    expect(autoRestAfterWorkSet([e], 0, PREFS_AUS)).toEqual({ kind: "clear" });
  });
});

function skillEx(done: boolean[]): SkillLiveExercise {
  return {
    name: "Handstand",
    exerciseId: null,
    metric: "reps",
    target: 5,
    tempo: null,
    sets: done.map((d) => ({ value: null, done: d, met: false })),
    note: "",
  };
}

describe("autoRestAfterSkillSet", () => {
  it("startet eine Satzpause, solange noch ein Satz offen ist", () => {
    expect(autoRestAfterSkillSet([skillEx([true, false])], PREFS)).toEqual({
      kind: "start",
      type: "set",
      sec: 90,
    });
  });

  it("startet auch dann, wenn der offene Satz in einer anderen Uebung steht", () => {
    const ex = [skillEx([true]), skillEx([false])];
    expect(autoRestAfterSkillSet(ex, PREFS)).toEqual({ kind: "start", type: "set", sec: 90 });
  });

  // Vorhaben #414: nach dem letzten Haken gibt es nichts mehr zu ueben.
  it("bricht ab, wenn alles erledigt ist", () => {
    expect(autoRestAfterSkillSet([skillEx([true, true])], PREFS)).toEqual({ kind: "clear" });
  });

  it("bricht bei ausgeschaltetem Auto-Start trotzdem ab, wenn alles erledigt ist", () => {
    expect(autoRestAfterSkillSet([skillEx([true])], PREFS_AUS)).toEqual({ kind: "clear" });
  });

  it("tut bei ausgeschaltetem Auto-Start nichts, solange etwas offen ist", () => {
    expect(autoRestAfterSkillSet([skillEx([true, false])], PREFS_AUS)).toEqual({
      kind: "none",
    });
  });
});
