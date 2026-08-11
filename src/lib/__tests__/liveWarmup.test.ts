import { describe, expect, it } from "vitest";
import {
  withAppendedGeneral,
  withGeneralDone,
  withGeneralMinutes,
  withGeneralMode,
  withRemovedGeneral,
} from "../liveWarmup";
import type { LiveGeneralWarmupSet } from "../liveSession";

function satz(over: Partial<LiveGeneralWarmupSet> = {}): LiveGeneralWarmupSet {
  return { minutes: 10, mode: "bike", done: false, ...over };
}

describe("withGeneralDone", () => {
  it("hakt genau den gemeinten Satz ab", () => {
    const next = withGeneralDone([satz(), satz()], 1, true);
    expect(next[0].done).toBe(false);
    expect(next[1].done).toBe(true);
  });

  it("laesst unbeteiligte Saetze referenzgleich", () => {
    const a = satz();
    const b = satz();
    const next = withGeneralDone([a, b], 0, true);
    expect(next[1]).toBe(b);
  });

  it("gibt dasselbe Array zurueck, wenn es den Satz nicht gibt", () => {
    const list = [satz()];
    expect(withGeneralDone(list, 7, true)).toBe(list);
  });
});

describe("withGeneralMinutes", () => {
  it("rundet die Minuten und klemmt sie bei 0", () => {
    expect(withGeneralMinutes([satz()], 0, 12.6)[0].minutes).toBe(13);
    expect(withGeneralMinutes([satz()], 0, -5)[0].minutes).toBe(0);
    expect(withGeneralMinutes([satz()], 0, Number.NaN)[0].minutes).toBe(0);
  });
});

describe("withGeneralMode", () => {
  it("setzt die Art und laesst die Dauer stehen", () => {
    const next = withGeneralMode([satz()], 0, "row");
    expect(next[0].mode).toBe("row");
    expect(next[0].minutes).toBe(10);
  });
});

describe("withAppendedGeneral", () => {
  it("haengt einen offenen Satz mit 5 Minuten und Art vario an", () => {
    const next = withAppendedGeneral([satz()]);
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({ minutes: 5, mode: "vario", done: false });
  });
});

describe("withRemovedGeneral", () => {
  it("entfernt den letzten Satz", () => {
    expect(withRemovedGeneral([satz(), satz()])).toHaveLength(1);
  });

  it("ist beim letzten verbleibenden Satz wirkungslos und gibt dasselbe Array zurueck", () => {
    const list = [satz()];
    expect(withRemovedGeneral(list)).toBe(list);
  });
});
