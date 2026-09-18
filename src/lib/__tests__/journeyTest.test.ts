import { describe, expect, it } from "vitest";
import {
  buildJourneyTestView,
  journeyTestPoints,
  type JourneyRmTestInput,
  type JourneyTestPoint,
} from "@/lib/journeyTest";
import type { ExHistoryEntry } from "@/lib/exerciseHistory";

// Minimaler Verlaufseintrag; nur die Felder, die die Testansicht liest.
function entry(overrides: Partial<ExHistoryEntry> = {}): ExHistoryEntry {
  return {
    date: "2026-01-05",
    journeyId: "j1",
    journeyWeek: 1,
    phaseId: "p1",
    topW: 80,
    reps: 24,
    vol: 1920,
    sec: 0,
    score: 3,
    est1RM: 96,
    record1RM: 96,
    dev: false,
    sets: [{ weight: 80, reps: 8, durationSec: null, score: 3 }],
    ...overrides,
  };
}

// Ein bewusster 1RM-Test, wie er aus rm_tests hereinkommt.
function rmTest(
  overrides: Partial<JourneyRmTestInput> = {},
): JourneyRmTestInput {
  return {
    exerciseId: "kniebeuge",
    date: "2026-02-16",
    weight: 100,
    reps: 3,
    estRm: 109,
    ...overrides,
  };
}

describe("journeyTestPoints", () => {
  const alle = [
    rmTest({ date: "2026-02-16" }),
    rmTest({ date: "2025-12-20", weight: 95, estRm: 103 }),
    rmTest({ exerciseId: "bankdruecken", date: "2026-02-16" }),
  ];

  it("nimmt nur die Tests dieser Uebung aus dem Zeitraum der Journey", () => {
    const out = journeyTestPoints(alle, "kniebeuge", "2026-01-01", "2026-03-31");
    expect(out).toEqual([
      { date: "2026-02-16", weight: 100, reps: 3, estRm: 109 },
    ]);
  });

  it("laesst das Ende der laufenden Journey offen", () => {
    const out = journeyTestPoints(alle, "kniebeuge", "2025-01-01", null);
    expect(out.map((t) => t.date)).toEqual(["2025-12-20", "2026-02-16"]);
  });

  it("ordnet ohne Startdatum nichts zu", () => {
    expect(journeyTestPoints(alle, "kniebeuge", null, null)).toEqual([]);
  });
});

describe("buildJourneyTestView", () => {
  const history = [
    entry({ date: "2026-01-05", est1RM: 96 }),
    entry({ date: "2026-01-12", est1RM: 100 }),
  ];
  const tests: JourneyTestPoint[] = [
    { date: "2026-02-16", weight: 100, reps: 3, estRm: 109 },
  ];

  it("nennt das gemessene Set und das 1RM daraus", () => {
    const view = buildJourneyTestView(tests, history, "kg");
    expect(view.result).toEqual({
      date: "2026-02-16",
      setText: "100 kg × 3",
      rmText: "109 kg",
    });
  });

  it("rechnet die Entwicklung vom ersten Schaetzwert auf den gemessenen Wert", () => {
    const view = buildJourneyTestView(tests, history, "kg");
    expect(view.progress).toEqual({
      fromText: "96 kg",
      toText: "109 kg",
      pctText: "+14%",
    });
  });

  it("nimmt den letzten Test, wenn mehrere in der Journey liegen", () => {
    const zwei: JourneyTestPoint[] = [
      { date: "2026-01-19", weight: 90, reps: 5, estRm: 101 },
      ...tests,
    ];
    expect(buildJourneyTestView(zwei, history, "kg").result?.rmText).toBe(
      "109 kg",
    );
  });

  it("bleibt ohne Test leer und zeigt dann die Entwicklung der Schaetzung", () => {
    const view = buildJourneyTestView([], history, "kg");
    expect(view.result).toBeNull();
    expect(view.progress).toEqual({
      fromText: "96 kg",
      toText: "100 kg",
      pctText: "+4%",
    });
  });

  it("zeigt aus einer einzigen Einheit ohne Test keine Entwicklung", () => {
    const view = buildJourneyTestView([], [history[0]], "kg");
    expect(view.progress).toBeNull();
  });

  it("kommt ohne geschaetztes 1RM aus (Haltezeit, Koerpergewicht)", () => {
    const ohne = [entry({ est1RM: null }), entry({ date: "2026-01-12", est1RM: null })];
    const view = buildJourneyTestView([], ohne, "kg");
    expect(view.result).toBeNull();
    expect(view.progress).toBeNull();
  });

  it("zeigt das Testergebnis auch ohne Verlaufsschaetzung", () => {
    const view = buildJourneyTestView(tests, [entry({ est1RM: null })], "kg");
    expect(view.result?.setText).toBe("100 kg × 3");
    expect(view.progress).toBeNull();
  });
});
