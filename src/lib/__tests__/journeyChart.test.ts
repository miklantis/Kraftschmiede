import { describe, expect, it } from "vitest";
import {
  buildJourneySeries,
  journeyPhaseMarks,
  parseSeriesKeys,
  seriesValueText,
  serializeSeriesKeys,
  toggleSeriesKey,
  JOURNEY_SERIES_KEYS,
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
      { index: 0, name: "Aufbau" },
      { index: 2, name: "Kraft" },
    ]);
  });

  it("schweigt ueber Phasen ohne Namen und Einheiten ohne Phase", () => {
    const history = [
      entry({ phaseId: null }),
      entry({ phaseId: "unbekannt" }),
      entry({ phaseId: "p2" }),
    ];
    expect(journeyPhaseMarks(history, names)).toEqual([
      { index: 2, name: "Kraft" },
    ]);
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
