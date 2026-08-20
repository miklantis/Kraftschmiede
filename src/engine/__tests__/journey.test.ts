import { describe, expect, it } from "vitest";
import {
  isoWeekKey,
  isoWeekNumOf,
  journeyEndDate,
  journeyPlacement,
  journeyWeekForDate,
  journeyWeekLookup,
  phasePlacement,
  weekProgress,
  repTargetForFocus,
  phaseRepBand,
  totalJourneyWeeks,
  type JourneySession,
  type PhaseLike,
} from "../journey";
import { buildStrengthWeekPlan, buildTestPhaseWeekPlan } from "../weekPlan";

// Hilfsfunktion: zaehlende Krafteinheit an einem Datum.
function s(
  date: string,
  journeyId: string | null = "j1",
  type = "strength",
  status = "done",
): JourneySession {
  return { date, status, type, journeyId };
}

// Phase ohne Wochenplan: sie verlangt in jeder Woche das normale Pensum.
function ph(id: string, weeks: number): PhaseLike {
  return { id, weeks, weekPlan: null };
}

describe("isoWeekKey", () => {
  it("liefert feste Breite YYYY-Www", () => {
    expect(isoWeekKey("2026-01-05")).toBe("2026-W02");
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
  });

  it("ist lexikografisch chronologisch (fuehrende Null)", () => {
    expect(isoWeekKey("2026-03-02") > isoWeekKey("2026-01-05")).toBe(true);
  });
});

describe("isoWeekNumOf", () => {
  it("zieht die Wochennummer aus dem Schluessel", () => {
    expect(isoWeekNumOf("2026-W31")).toBe(31);
    expect(isoWeekNumOf("kaputt")).toBe(0);
  });
});

describe("phasePlacement", () => {
  const phases = [ph("p1", 2), ph("p2", 5), ph("p3", 1)];

  it("Woche 1 liegt in der ersten Phase", () => {
    expect(phasePlacement(phases, 1)).toEqual({
      phaseIndex: 0,
      phaseId: "p1",
      weekInPhase: 1,
      done: false,
    });
  });

  it("Woche 3 ist die erste Woche der zweiten Phase", () => {
    expect(phasePlacement(phases, 3)).toEqual({
      phaseIndex: 1,
      phaseId: "p2",
      weekInPhase: 1,
      done: false,
    });
  });

  it("ueber alle Wochen hinaus => done auf der letzten Phase", () => {
    const p = phasePlacement(phases, 99);
    expect(p.done).toBe(true);
    expect(p.phaseId).toBe("p3");
  });

  it("ohne Phasen => done, phaseId null", () => {
    const p = phasePlacement([], 1);
    expect(p.done).toBe(true);
    expect(p.phaseId).toBe(null);
  });
});

describe("journeyWeekForDate", () => {
  const freq = 3;

  it("ohne erfuellte Wochen davor ist die Journey-Woche 1", () => {
    const sessions = [s("2026-01-05"), s("2026-01-06")]; // nur 2 in dieser KW
    expect(journeyWeekForDate("2026-01-05", sessions, "j1", freq, [])).toBe(1);
  });

  it("eine erfuellte Vorwoche schiebt die Nummer auf 2", () => {
    const sessions = [
      // KW01 erfuellt (3 Einheiten)
      s("2025-12-29"),
      s("2025-12-30"),
      s("2025-12-31"),
      // laufende KW02
      s("2026-01-05"),
    ];
    expect(journeyWeekForDate("2026-01-05", sessions, "j1", freq, [])).toBe(2);
  });

  it("Yoga und fremde Journeys zaehlen nicht", () => {
    const sessions = [
      s("2025-12-29", "j1", "yoga"),
      s("2025-12-30", "jX"),
      s("2025-12-31"),
    ];
    // nur 1 zaehlende Einheit in KW01 -> nicht erfuellt -> bleibt Woche 1
    expect(journeyWeekForDate("2026-01-05", sessions, "j1", freq, [])).toBe(1);
  });
});

describe("journeyPlacement", () => {
  it("verbindet globale Woche mit der Phasenkarte", () => {
    const journey = {
      id: "j1",
      phases: [ph("p1", 2), ph("p2", 4)],
    };
    // 2 erfuellte Vorwochen -> globale Woche 3 -> zweite Phase, Woche 1
    const sessions = [
      s("2025-12-22"),
      s("2025-12-23"),
      s("2025-12-24"),
      s("2025-12-29"),
      s("2025-12-30"),
      s("2025-12-31"),
      s("2026-01-05"),
    ];
    const p = journeyPlacement(journey, sessions, 3, "2026-01-05");
    expect(p.globalWeek).toBe(3);
    expect(p.phaseId).toBe("p2");
    expect(p.weekInPhase).toBe(1);
  });
});

describe("weekProgress", () => {
  it("zaehlt Einheiten der laufenden KW und meldet Erfuellung", () => {
    const sessions = [s("2026-01-05"), s("2026-01-06"), s("2026-01-07")];
    const wp = weekProgress(sessions, "j1", 3, "2026-01-05", []);
    expect(wp.units).toBe(3);
    expect(wp.target).toBe(3);
    expect(wp.fulfilled).toBe(true);
  });

  it("unter dem Ziel ist nicht erfuellt", () => {
    const sessions = [s("2026-01-05")];
    const wp = weekProgress(sessions, "j1", 3, "2026-01-05", []);
    expect(wp.units).toBe(1);
    expect(wp.fulfilled).toBe(false);
  });
});

describe("repTargetForFocus", () => {
  it("liefert die V1-Baender je Fokus", () => {
    expect(repTargetForFocus("reentry")).toEqual([5, 8]);
    expect(repTargetForFocus("hypertrophy")).toEqual([8, 12]);
    expect(repTargetForFocus("strength")).toEqual([4, 6]);
    expect(repTargetForFocus("power")).toEqual([3, 5]);
    expect(repTargetForFocus("endurance")).toEqual([12, 18]);
    expect(repTargetForFocus("test")).toEqual([2, 4]);
  });

  it("maintenance und Unbekanntes ergeben null", () => {
    expect(repTargetForFocus("maintenance")).toBeNull();
    expect(repTargetForFocus("irgendwas")).toBeNull();
  });
});

describe("phaseRepBand", () => {
  it("nimmt vorrangig die explizit gesetzten Grenzen", () => {
    expect(phaseRepBand(6, 10, "strength")).toEqual([6, 10]);
  });

  it("faellt ohne Grenzen auf den Fokus zurueck", () => {
    expect(phaseRepBand(null, null, "hypertrophy")).toEqual([8, 12]);
    expect(phaseRepBand(8, null, "strength")).toEqual([4, 6]);
  });

  it("ohne Grenzen und ohne passenden Fokus null", () => {
    expect(phaseRepBand(null, null, "maintenance")).toBeNull();
  });
});

describe("totalJourneyWeeks", () => {
  it("summiert die Phasenwochen", () => {
    expect(totalJourneyWeeks([ph("a", 3), ph("b", 4)])).toBe(7);
  });
});

describe("journeyWeekLookup", () => {
  it("liefert dieselbe Wochennummer wie journeyWeekForDate", () => {
    const freq = 3;
    const sessions = [
      s("2025-12-29"),
      s("2025-12-30"),
      s("2025-12-31"),
      s("2026-01-05"),
      s("2026-01-06"),
      s("2026-01-07"),
      s("2026-01-12"),
    ];
    const weekOf = journeyWeekLookup(sessions, "j1", freq, []);
    for (const d of ["2025-12-29", "2026-01-06", "2026-01-13", "2026-01-20"]) {
      expect(weekOf(d)).toBe(journeyWeekForDate(d, sessions, "j1", freq, []));
    }
  });
});

// Abschluss ueber den Kalender (#240): alle geplanten Wochen erfuellt und vorbei.
// Die reine Testwoche erfuellt sich dabei von selbst - sie verlangt nichts.
describe("Journey-Abschluss ueber den Kalender", () => {
  const freq = 3;

  // Kraftphase (2 Wochen) + Testphase (Entlastung, dann reine Testwoche).
  // Zusammen vier geplante Wochen.
  const mitTestwoche = {
    id: "j1",
    phases: [
      { id: "kraft", weeks: 2, weekPlan: buildStrengthWeekPlan(2) },
      { id: "test", weeks: 2, weekPlan: buildTestPhaseWeekPlan(2) },
    ],
  };
  // Dieselben vier Wochen, aber ohne Testphase: jede Woche verlangt Einheiten.
  const ohneTestwoche = {
    id: "j1",
    phases: [
      { id: "kraft", weeks: 2, weekPlan: buildStrengthWeekPlan(2) },
      { id: "kraft2", weeks: 2, weekPlan: buildStrengthWeekPlan(2) },
    ],
  };

  // KW01 bis KW03 regulaer erfuellt: Journey-Woche 1, 2 und die
  // Entlastungswoche. KW04 (19.-25.01.) ist damit die reine Testwoche.
  const bisEntlastung = [
    s("2025-12-29"),
    s("2025-12-30"),
    s("2025-12-31"),
    s("2026-01-05"),
    s("2026-01-06"),
    s("2026-01-07"),
    s("2026-01-12"),
    s("2026-01-13"),
    s("2026-01-14"),
  ];

  it("in der Testwoche steht die Journey noch auf ihrer letzten Woche", () => {
    const p = journeyPlacement(mitTestwoche, bisEntlastung, freq, "2026-01-22");
    expect(p.globalWeek).toBe(4);
    expect(p.done).toBe(false);
    expect(
      journeyEndDate(mitTestwoche, bisEntlastung, freq, "2026-01-22"),
    ).toBeNull();
  });

  it("schliesst am Wochenwechsel ab, ohne dass getestet wurde", () => {
    // In der Testwoche liegt keine einzige Einheit und kein 1RM-Test.
    const p = journeyPlacement(mitTestwoche, bisEntlastung, freq, "2026-01-26");
    expect(p.globalWeek).toBe(5);
    expect(p.done).toBe(true);
  });

  it("nimmt als Enddatum den Sonntag der Testwoche", () => {
    expect(journeyEndDate(mitTestwoche, bisEntlastung, freq, "2026-01-26")).toBe(
      "2026-01-25",
    );
  });

  it("haelt das Enddatum, auch wenn die App erst Wochen spaeter aufgeht", () => {
    expect(journeyEndDate(mitTestwoche, bisEntlastung, freq, "2026-02-16")).toBe(
      "2026-01-25",
    );
  });

  it("die Testwoche gilt als erfuellt, ohne Einheiten zu erfinden", () => {
    const wp = weekProgress(
      bisEntlastung,
      "j1",
      freq,
      "2026-01-22",
      mitTestwoche.phases,
    );
    expect(wp.units).toBe(0);
    expect(wp.fulfilled).toBe(true);
    expect(wp.journeyWeek).toBe(4);
  });

  it("ohne Testwoche wartet die Journey auf die erfuellte letzte Woche", () => {
    // Vierte Woche nur halb gefuellt: die Journey bleibt stehen.
    const halb = [...bisEntlastung, s("2026-01-19")];
    expect(
      journeyPlacement(ohneTestwoche, halb, freq, "2026-01-26").done,
    ).toBe(false);
    expect(journeyEndDate(ohneTestwoche, halb, freq, "2026-01-26")).toBeNull();

    const voll = [...bisEntlastung, s("2026-01-19"), s("2026-01-20"), s("2026-01-21")];
    expect(journeyPlacement(ohneTestwoche, voll, freq, "2026-01-26").done).toBe(
      true,
    );
    expect(journeyEndDate(ohneTestwoche, voll, freq, "2026-01-26")).toBe(
      "2026-01-25",
    );
  });

  it("eine Pause vor der Testwoche schiebt sie mit", () => {
    // Nur die ersten beiden Wochen erfuellt, danach drei leere Wochen: die
    // Entlastungswoche steht noch aus, die Journey rueckt nicht vor.
    const nurZwei = bisEntlastung.slice(0, 6);
    const p = journeyPlacement(mitTestwoche, nurZwei, freq, "2026-02-02");
    expect(p.globalWeek).toBe(3);
    expect(p.done).toBe(false);
  });

  it("ohne geplante Wochen gibt es kein Enddatum", () => {
    expect(
      journeyEndDate({ id: "j1", phases: [] }, bisEntlastung, freq, "2026-01-26"),
    ).toBeNull();
  });

  it("ignoriert Einheiten anderer Journeys", () => {
    const fremd = bisEntlastung.map((x) => ({ ...x, journeyId: "j2" }));
    expect(journeyPlacement(mitTestwoche, fremd, freq, "2026-01-26").done).toBe(
      false,
    );
  });
});
