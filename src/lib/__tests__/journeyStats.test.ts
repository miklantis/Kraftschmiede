import { describe, expect, it } from "vitest";
import { buildJourneyStats } from "@/lib/journeyStats";
import { exChangePct, type ExHistoryEntry } from "@/lib/exerciseHistory";

// Minimaler Verlaufseintrag; nur die Felder, die die Statistikzeile liest.
function entry(overrides: Partial<ExHistoryEntry> = {}): ExHistoryEntry {
  return {
    date: "2026-01-05",
    journeyId: "j1",
    journeyWeek: 1,
    phaseId: "p1",
    topW: 80,
    reps: 15,
    vol: 1200,
    sec: 0,
    score: 3,
    est1RM: 96,
    record1RM: 96,
    dev: false,
    sets: [
      { weight: 80, reps: 5, durationSec: null, score: 3 },
      { weight: 80, reps: 5, durationSec: null, score: 3 },
      { weight: 80, reps: 5, durationSec: null, score: 3 },
    ],
    ...overrides,
  };
}

describe("exChangePct", () => {
  it("misst vom ersten bis zum letzten Wert der uebergebenen Liste", () => {
    const h = [
      entry({ date: "2026-01-05", est1RM: 100 }),
      entry({ date: "2026-01-12", est1RM: 105 }),
      entry({ date: "2026-01-19", est1RM: 110 }),
    ];
    expect(exChangePct(h)).toBe("+10%");
  });

  it("zeigt auch einen Rueckgang und schweigt bei zu wenig Daten", () => {
    expect(
      exChangePct([entry({ est1RM: 100 }), entry({ est1RM: 95 })]),
    ).toBe("-5%");
    expect(exChangePct([entry({ est1RM: 100 })])).toBeNull();
    expect(exChangePct([])).toBeNull();
  });
});

describe("buildJourneyStats", () => {
  it("nennt bestes Set, Veraenderung seit Start und Einheiten", () => {
    const h = [
      entry({ date: "2026-01-05", topW: 80, est1RM: 100 }),
      entry({
        date: "2026-01-12",
        topW: 85,
        est1RM: 110,
        sets: [{ weight: 85, reps: 5, durationSec: null, score: 3 }],
      }),
    ];
    expect(buildJourneyStats(h)).toEqual([
      { value: "85×5", label: "bestes Set" },
      { value: "+10%", label: "seit Start", accent: true },
      { value: "2", label: "Einheiten" },
    ]);
  });

  it("laesst die Veraenderung weg, wo es kein geschaetztes 1RM gibt", () => {
    const h = [
      entry({
        topW: 0,
        sec: 40,
        est1RM: null,
        sets: [{ weight: null, reps: null, durationSec: 40, score: 3 }],
      }),
      entry({
        topW: 0,
        sec: 55,
        est1RM: null,
        sets: [{ weight: null, reps: null, durationSec: 55, score: 3 }],
      }),
    ];
    expect(buildJourneyStats(h)).toEqual([
      { value: "55 s", label: "bester Halt" },
      { value: "2", label: "Einheiten" },
    ]);
  });

  it("nimmt ohne Gewicht und ohne Haltezeit die beste Wiederholungszahl", () => {
    const h = [
      entry({
        topW: 0,
        est1RM: null,
        sets: [
          { weight: null, reps: 8, durationSec: null, score: 3 },
          { weight: null, reps: 8, durationSec: null, score: 3 },
        ],
      }),
      entry({
        topW: 0,
        est1RM: null,
        sets: [{ weight: null, reps: 12, durationSec: null, score: 3 }],
      }),
    ];
    expect(buildJourneyStats(h)).toEqual([
      { value: "12", label: "beste Wdh" },
      { value: "2", label: "Einheiten" },
    ]);
  });

  it("zaehlt die einzelne Einheit im Singular", () => {
    const stats = buildJourneyStats([entry()]);
    expect(stats[stats.length - 1]).toEqual({ value: "1", label: "Einheit" });
  });

  it("bleibt ohne Verlauf bei der blanken Zahl", () => {
    expect(buildJourneyStats([])).toEqual([
      { value: "0", label: "Einheiten" },
    ]);
  });
});
