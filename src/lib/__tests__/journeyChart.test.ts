import { describe, expect, it } from "vitest";
import {
  buildJourneySeries,
  journeyChartDates,
  journeyPhaseMarks,
  journeyTestPoints,
  parseSeriesKeys,
  seriesValueText,
  serializeSeriesKeys,
  testValueText,
  toggleSeriesKey,
  JOURNEY_SERIES_KEYS,
  type JourneyRmTestInput,
} from "@/lib/journeyChart";
import { repsPerSet, type ExHistoryEntry } from "@/lib/exerciseHistory";

// Minimaler Verlaufseintrag; nur die Felder, die der Chart liest.
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
    sets: [
      { weight: 80, reps: 8, durationSec: null, score: 3 },
      { weight: 80, reps: 8, durationSec: null, score: 3 },
      { weight: 80, reps: 8, durationSec: null, score: 3 },
    ],
    ...overrides,
  };
}

describe("repsPerSet", () => {
  it("nennt bei geraden Saetzen die Wiederholungen je Satz, nicht die Summe", () => {
    expect(repsPerSet(entry())).toBe(8);
  });

  it("nimmt bei einem abgebrochenen Satz die haeufigste Zahl", () => {
    const e = entry({
      sets: [
        { weight: 80, reps: 8, durationSec: null, score: 3 },
        { weight: 80, reps: 8, durationSec: null, score: 4 },
        { weight: 80, reps: 5, durationSec: null, score: 5 },
      ],
    });
    expect(repsPerSet(e)).toBe(8);
  });

  it("nimmt bei Gleichstand die hoehere Zahl", () => {
    const e = entry({
      sets: [
        { weight: 80, reps: 10, durationSec: null, score: 3 },
        { weight: 80, reps: 6, durationSec: null, score: 4 },
      ],
    });
    expect(repsPerSet(e)).toBe(10);
  });

  it("liefert ohne Wiederholungen null (reine Haltezeit)", () => {
    const e = entry({
      sets: [{ weight: null, reps: null, durationSec: 45, score: null }],
    });
    expect(repsPerSet(e)).toBeNull();
  });
});

describe("buildJourneySeries", () => {
  it("baut je Serie einen Punkt pro Einheit", () => {
    const history = [
      entry({ date: "2026-01-05", topW: 80, est1RM: 96, score: 3 }),
      entry({ date: "2026-01-12", topW: 82.5, est1RM: 99, score: 4 }),
    ];
    const series = buildJourneySeries(history, "reps");
    expect(series.map((s) => s.key)).toEqual([
      "weight",
      "reps",
      "score",
      "trend",
    ]);
    expect(series[0].points).toEqual([
      { date: "2026-01-05", value: 80 },
      { date: "2026-01-12", value: 82.5 },
    ]);
    expect(series[1].points.map((p) => p.value)).toEqual([8, 8]);
  });

  it("zeichnet bei Haltezeit-Uebungen die Sekunden statt Wiederholungen", () => {
    const history = [
      entry({
        topW: 0,
        sec: 40,
        est1RM: null,
        sets: [{ weight: null, reps: null, durationSec: 40, score: 3 }],
      }),
    ];
    const series = buildJourneySeries(history, "duration");
    expect(series.map((s) => s.key)).toEqual(["reps", "score"]);
    expect(series[0].label).toBe("Haltezeit");
    expect(series[0].unit).toBe("seconds");
    expect(series[0].points[0].value).toBe(40);
  });

  it("laesst Serien ohne einen einzigen Wert weg", () => {
    const history = [entry({ score: null, est1RM: null })];
    const series = buildJourneySeries(history, "reps");
    expect(series.map((s) => s.key)).toEqual(["weight", "reps"]);
  });

  // Der Fall, der die profilbasierte Regel gekippt hat (#290): drei der vier
  // Core-Uebungen im Katalog tragen ein Arbeitsgewicht.
  it("gibt einer Core-Uebung mit Gewicht ihre Gewichts- und Trendlinie", () => {
    const history = [
      entry({
        topW: 16,
        est1RM: 22.7,
        sets: [
          { weight: 16, reps: 15, durationSec: null, score: 3 },
          { weight: 16, reps: 15, durationSec: null, score: 4 },
        ],
      }),
    ];
    const series = buildJourneySeries(history, null);
    expect(series.map((s) => s.key)).toEqual([
      "weight",
      "reps",
      "score",
      "trend",
    ]);
    expect(series[0].points[0].value).toBe(16);
  });

  it("zieht ohne Gewicht keine Nulllinie fuer Gewicht und Trend", () => {
    const history = [
      entry({
        topW: 0,
        est1RM: 0,
        sets: [{ weight: null, reps: 12, durationSec: null, score: 3 }],
      }),
    ];
    const series = buildJourneySeries(history, "reps");
    expect(series.map((s) => s.key)).toEqual(["reps", "score"]);
  });
});

describe("seriesValueText", () => {
  it("schreibt Gewichte mit Einheit und den Trend mit seinem Wort", () => {
    expect(
      seriesValueText({ key: "weight", unit: "weight" }, 82.5, "kg"),
    ).toBe("82.5 kg");
    expect(seriesValueText({ key: "trend", unit: "weight" }, 96, "kg")).toBe(
      "Trend 96 kg",
    );
  });

  it("schreibt Wiederholungen, Haltezeit und Score in ihrer Form", () => {
    expect(seriesValueText({ key: "reps", unit: "reps" }, 8, "kg")).toBe(
      "8 Wdh",
    );
    expect(seriesValueText({ key: "reps", unit: "seconds" }, 45, "kg")).toBe(
      "45 s",
    );
    expect(seriesValueText({ key: "score", unit: "score" }, 3.5, "kg")).toBe(
      "Ø 3,5",
    );
  });
});

describe("journeyPhaseMarks", () => {
  const names = { p1: "Aufbau", p2: "Kraft" };

  it("markiert den Einstieg und jeden Phasenwechsel", () => {
    const history = [
      entry({ date: "2026-01-05", phaseId: "p1" }),
      entry({ date: "2026-01-12", phaseId: "p1" }),
      entry({ date: "2026-02-02", phaseId: "p2" }),
    ];
    expect(journeyPhaseMarks(history, names)).toEqual([
      { date: "2026-01-05", name: "Aufbau" },
      { date: "2026-02-02", name: "Kraft" },
    ]);
  });

  it("schweigt ueber Phasen ohne Namen und Einheiten ohne Phase", () => {
    const history = [
      entry({ date: "2026-01-05", phaseId: null }),
      entry({ date: "2026-01-12", phaseId: "unbekannt" }),
      entry({ date: "2026-01-19", phaseId: "p2" }),
    ];
    expect(journeyPhaseMarks(history, names)).toEqual([
      { date: "2026-01-19", name: "Kraft" },
    ]);
  });
});

// Ein bewusster 1RM-Test, wie er aus rm_tests hereinkommt.
function test(
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
    test({ date: "2026-02-16" }),
    test({ date: "2025-12-20", weight: 95, estRm: 103 }),
    test({ exerciseId: "bankdruecken", date: "2026-02-16" }),
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

describe("buildJourneySeries mit 1RM-Test", () => {
  const history = [
    entry({ date: "2026-01-05", est1RM: 96 }),
    entry({ date: "2026-01-12", est1RM: 100 }),
  ];
  const tests = [
    { date: "2026-01-26", weight: 100, reps: 3, estRm: 109 },
  ];

  it("setzt den gemessenen Wert als eigenen Punkt auf die Trendlinie", () => {
    const trend = buildJourneySeries(history, "reps", tests).find(
      (s) => s.key === "trend",
    );
    expect(trend?.points).toEqual([
      { date: "2026-01-05", value: 96 },
      { date: "2026-01-12", value: 100 },
      { date: "2026-01-26", value: 109, test: true },
    ]);
  });

  it("laesst Gewicht, Wiederholungen und Score unberuehrt", () => {
    const out = buildJourneySeries(history, "reps", tests);
    for (const key of ["weight", "reps", "score"] as const) {
      const s = out.find((x) => x.key === key);
      expect(s?.points.map((p) => p.date)).toEqual([
        "2026-01-05",
        "2026-01-12",
      ]);
    }
  });

  it("nimmt am Testtag den gemessenen Wert statt der Schaetzung der Einheit", () => {
    const amGleichenTag = [
      ...history,
      entry({ date: "2026-01-26", est1RM: 102 }),
    ];
    const trend = buildJourneySeries(amGleichenTag, "reps", tests).find(
      (s) => s.key === "trend",
    );
    expect(trend?.points.filter((p) => p.date === "2026-01-26")).toEqual([
      { date: "2026-01-26", value: 109, test: true },
    ]);
  });
});

describe("journeyChartDates", () => {
  it("fuehrt Einheiten und Tests zu einer Tagesliste zusammen", () => {
    const history = [
      entry({ date: "2026-01-05" }),
      entry({ date: "2026-01-05" }),
      entry({ date: "2026-01-12" }),
    ];
    const out = journeyChartDates(history, [
      { date: "2026-01-26", weight: 100, reps: 3, estRm: 109 },
      { date: "2026-01-12", weight: 90, reps: 5, estRm: 101 },
    ]);
    expect(out).toEqual(["2026-01-05", "2026-01-12", "2026-01-26"]);
  });
});

describe("testValueText", () => {
  it("nennt das getestete Set", () => {
    expect(
      testValueText({ date: "2026-01-26", weight: 100, reps: 3, estRm: 109 }, "kg"),
    ).toBe("Test 100 kg × 3");
  });
});

describe("Serien-Schalter (geraete-lokal)", () => {
  it("hat ohne gemerkten Stand alle Serien an", () => {
    expect(parseSeriesKeys(null)).toEqual([...JOURNEY_SERIES_KEYS]);
    expect(parseSeriesKeys("kaputt")).toEqual([...JOURNEY_SERIES_KEYS]);
  });

  it("haelt einen gemerkten Stand, auch den leeren", () => {
    expect(parseSeriesKeys(serializeSeriesKeys(["reps", "score"]))).toEqual([
      "reps",
      "score",
    ]);
    expect(parseSeriesKeys(serializeSeriesKeys([]))).toEqual([]);
  });

  it("wirft unbekannte Eintraege weg und haelt die feste Reihenfolge", () => {
    expect(parseSeriesKeys(JSON.stringify(["trend", "quatsch", "weight"]))).toEqual(
      ["weight", "trend"],
    );
  });

  it("schaltet einzeln um, ohne die Reihenfolge zu drehen", () => {
    expect(toggleSeriesKey(["weight", "reps", "score", "trend"], "score")).toEqual(
      ["weight", "reps", "trend"],
    );
    expect(toggleSeriesKey(["trend"], "weight")).toEqual(["weight", "trend"]);
  });
});
