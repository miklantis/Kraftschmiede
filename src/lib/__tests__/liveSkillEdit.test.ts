import { describe, expect, it } from "vitest";
import { withSkillDone, withSkillValue } from "../liveSkillEdit";
import type { SkillLiveExercise, SkillLiveSet } from "../liveSession";

function satz(over: Partial<SkillLiveSet> = {}): SkillLiveSet {
  return { value: null, done: false, met: false, ...over };
}
function uebung(over: Partial<SkillLiveExercise> = {}): SkillLiveExercise {
  return {
    name: "Klimmzug",
    exerciseId: null,
    metric: "reps",
    target: 8,
    tempo: null,
    sets: [satz(), satz()],
    ...over,
  };
}

describe("withSkillDone", () => {
  it("hakt genau den gemeinten Satz ab", () => {
    const next = withSkillDone([uebung()], 0, 1, true);
    expect(next[0].sets[0].done).toBe(false);
    expect(next[0].sets[1].done).toBe(true);
  });

  it("laesst unbeteiligte Uebungen referenzgleich", () => {
    const a = uebung();
    const b = uebung({ name: "Dip" });
    const next = withSkillDone([a, b], 0, 0, true);
    expect(next[1]).toBe(b);
    expect(next[0]).not.toBe(a);
  });

  it("gibt dasselbe Array zurueck, wenn es den Satz nicht gibt", () => {
    const list = [uebung()];
    expect(withSkillDone(list, 0, 9, true)).toBe(list);
    expect(withSkillDone(list, 4, 0, true)).toBe(list);
  });
});

describe("withSkillValue", () => {
  it("belegt einen noch leeren Satz", () => {
    const next = withSkillValue([uebung()], 0, 0, 7);
    expect(next[0].sets[0].value).toBe(7);
  });

  it("rundet den Wert und klemmt ihn bei 0", () => {
    expect(withSkillValue([uebung()], 0, 0, 7.6)[0].sets[0].value).toBe(8);
    expect(withSkillValue([uebung()], 0, 0, -3)[0].sets[0].value).toBe(0);
    expect(withSkillValue([uebung()], 0, 0, Number.NaN)[0].sets[0].value).toBe(0);
  });

  it("laesst das erreichte Ziel unberuehrt", () => {
    const e = uebung({ sets: [satz({ value: 5, met: true })] });
    expect(withSkillValue([e], 0, 0, 9)[0].sets[0].met).toBe(true);
  });
});
