import { describe, expect, it } from "vitest";
import {
  buildPhaseViews,
  buildTemplatePhaseViews,
  totalWeeks,
  type JourneyPhaseInput,
  type PhasePlacementInfo,
} from "../journey";

function phase(over: Partial<JourneyPhaseInput> = {}): JourneyPhaseInput {
  return {
    name: "Hypertrophie",
    focus: "hypertrophy",
    weeks: 5,
    setsStart: 2,
    setsEnd: 6,
    deloadWeek: 4,
    repTargetMin: 8,
    repTargetMax: 12,
    loadFactor: 1,
    ...over,
  };
}

const threePhases: JourneyPhaseInput[] = [
  phase({ name: "Wiedereinstieg", focus: "reentry", weeks: 2, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 5, repTargetMax: 8 }),
  phase({ name: "Hypertrophie", focus: "hypertrophy", weeks: 5 }),
  phase({ name: "Maximalkraft", focus: "strength", weeks: 4, setsStart: 3, setsEnd: 5, deloadWeek: null, repTargetMin: 4, repTargetMax: 6 }),
];

describe("buildPhaseViews", () => {
  it("markiert vergangene, aktuelle und kuenftige Phasen", () => {
    const placement: PhasePlacementInfo = {
      phaseIndex: 1,
      weekInPhase: 3,
      done: false,
    };
    const views = buildPhaseViews(threePhases, placement);
    expect(views.map((v) => v.state)).toEqual(["past", "current", "future"]);
    expect(views[0].mark).toBe("\u2713");
    expect(views[1].mark).toBe("");
    expect(views[1].isCurrent).toBe(true);
  });

  it("zeigt fuer die aktuelle Phase die Woche, sonst die Wochenzahl", () => {
    const views = buildPhaseViews(threePhases, {
      phaseIndex: 1,
      weekInPhase: 3,
      done: false,
    });
    expect(views[1].meta).toBe("Woche 3 / 5");
    expect(views[0].meta).toBe("2 Wochen");
    expect(views[2].meta).toBe("4 Wochen");
  });

  it("nutzt den Singular bei einer Woche", () => {
    const views = buildPhaseViews([phase({ weeks: 1 })], {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].meta).toBe("1 Woche");
  });

  it("bei done sind alle Phasen vergangen", () => {
    const views = buildPhaseViews(threePhases, {
      phaseIndex: 2,
      weekInPhase: 4,
      done: true,
    });
    expect(views.every((v) => v.state === "past")).toBe(true);
    expect(views.some((v) => v.isCurrent)).toBe(false);
  });

  it("baut die Detailzeilen aus Band, Satz-Rampe und Deload", () => {
    const views = buildPhaseViews([phase()], {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].detail).toEqual([
      { k: "Wiederholungsband", v: "8\u201312 Wdh" },
      { k: "Satz-Rampe / Woche", v: "2 \u2192 6 S\u00e4tze" },
      { k: "Deload", v: "Woche 4" },
    ]);
  });

  it("zeigt keine Satz-Rampe, wenn Start und Ende gleich sind, und keinen Deload", () => {
    const views = buildPhaseViews(
      [phase({ setsStart: 3, setsEnd: 3, deloadWeek: null, repTargetMin: null, repTargetMax: null })],
      { phaseIndex: 0, weekInPhase: 1, done: false },
    );
    expect(views[0].detail[0].v).toBe("? Wdh");
    expect(views[0].detail[1].k).toBe("S\u00e4tze / Woche");
    expect(views[0].detail[1].v).toBe("3 S\u00e4tze");
    expect(views[0].detail[2].v).toBe("keiner");
  });
});

describe("buildPhaseViews \u2013 Lastfaktor", () => {
  const rampe: JourneyPhaseInput[] = [
    phase({ name: "Tasten", weeks: 1, loadFactor: 0.65 }),
    phase({ name: "Standort", weeks: 1, loadFactor: 1 }),
  ];

  it("zeigt die vorgegebene Last als Detailzeile an jeder Phase", () => {
    const views = buildPhaseViews(rampe, {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].detail[3]).toEqual({ k: "Vorgegebene Last", v: "65 %" });
    expect(views[1].detail[3]).toEqual({ k: "Vorgegebene Last", v: "100 %" });
  });

  it("erklaert die Vorgabe nur an der laufenden Phase", () => {
    const views = buildPhaseViews(rampe, {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].loadNote).toContain("65 %");
    expect(views[1].loadNote).toBeNull();
  });

  it("sagt in der letzten Phase, dass die Vorgabe endet", () => {
    const views = buildPhaseViews(rampe, {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views[1].loadNote).toContain("endet");
  });

  it("laesst Journeys ohne Lastfaktor unveraendert", () => {
    const views = buildPhaseViews([phase()], {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].detail).toHaveLength(3);
    expect(views[0].loadNote).toBeNull();
  });
});

describe("buildTemplatePhaseViews", () => {
  it("stellt alle Phasen neutral dar, ohne aktuelle oder vergangene", () => {
    const views = buildTemplatePhaseViews(threePhases);
    expect(views.map((v) => v.state)).toEqual([
      "preview",
      "preview",
      "preview",
    ]);
    expect(views.every((v) => !v.isCurrent)).toBe(true);
    expect(views.every((v) => v.mark === "")).toBe(true);
    expect(views.every((v) => v.loadNote === null)).toBe(true);
  });

  it("zeigt je Phase die Dauer als Meta-Zeile", () => {
    const views = buildTemplatePhaseViews([
      phase({ weeks: 1 }),
      phase({ weeks: 4 }),
    ]);
    expect(views[0].meta).toBe("1 Woche");
    expect(views[1].meta).toBe("4 Wochen");
  });

  it("liefert dieselben Detailzeilen wie die Journey-Ansicht", () => {
    const views = buildTemplatePhaseViews([phase()]);
    expect(views[0].detail).toEqual(
      buildPhaseViews([phase()], {
        phaseIndex: 0,
        weekInPhase: 1,
        done: false,
      })[0].detail,
    );
  });

  it("ergaenzt die Lastzeile, wenn die Vorlage die Last vorgibt", () => {
    const views = buildTemplatePhaseViews([
      phase({ loadFactor: 0.65 }),
      phase({ loadFactor: 1 }),
    ]);
    expect(views[0].detail).toHaveLength(4);
    expect(views[0].detail[3]).toEqual({ k: "Vorgegebene Last", v: "65 %" });
    expect(views[1].detail).toHaveLength(4);
  });
});

describe("totalWeeks", () => {
  it("summiert die Wochen aller Phasen", () => {
    expect(totalWeeks(threePhases)).toBe(11);
    expect(totalWeeks([])).toBe(0);
  });
});
