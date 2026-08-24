import { describe, expect, it } from "vitest";
import {
  buildPhaseViews,
  buildTemplatePhaseViews,
  totalWeeks,
  type JourneyPhaseInput,
  type PhasePlacementInfo,
} from "../journey";
import {
  buildRebuildRamp,
  buildStrengthWeekPlan,
  buildTestPhaseWeekPlan,
} from "@/engine";

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
    loadPlan: null,
    weekPlan: null,
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

describe("buildPhaseViews \u2013 Lastliste", () => {
  const rampe: JourneyPhaseInput[] = [
    phase({ name: "Tasten", weeks: 1, loadPlan: [{ week: 1, loadPct: 0.65 }] }),
    phase({ name: "Standort", weeks: 1, loadPlan: [{ week: 1, loadPct: 1 }] }),
  ];

  // Ein Block, der ueber drei Wochen von 65 auf 95 Prozent wandert - der Fall,
  // fuer den eine einzelne Zahl je Phase nicht mehr reicht.
  const block: JourneyPhaseInput[] = [
    phase({
      name: "Wiederaufbau",
      weeks: 3,
      loadPlan: [
        { week: 1, loadPct: 0.65 },
        { week: 2, loadPct: 0.8 },
        { week: 3, loadPct: 0.95 },
      ],
    }),
    phase({ name: "Test/Peak", weeks: 1, loadPlan: null }),
  ];

  it("zeigt die vorgegebene Last als Detailzeile an nicht laufenden Phasen", () => {
    const views = buildPhaseViews(rampe, {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[1].detail[3]).toEqual({ k: "Vorgegebene Last", v: "100 %" });
  });

  it("nennt den Anteil der laufenden Phase nur in ihrer Wochentabelle", () => {
    const views = buildPhaseViews(block, {
      phaseIndex: 0,
      weekInPhase: 2,
      done: false,
    });
    // Die Tabelle fuehrt den Anteil je Woche auf - die Detailzeile daneben
    // waere dieselbe Zahl ein zweites Mal (Issue #362).
    expect(views[0].detail.map((d) => d.k)).not.toContain("Vorgegebene Last");
    expect(views[0].weekRows?.[1].targets).toBe("80 %");
    expect(views[0].loadNote).toContain("80 %");
  });

  it("zeigt an nicht laufenden Phasen die Spanne", () => {
    // Phase 2 laeuft: der Block liegt hinter uns und wird als Spanne gezeigt.
    const views = buildPhaseViews(block, {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].detail[3]).toEqual({
      k: "Vorgegebene Last",
      v: "65 \u2192 95 %",
    });
  });

  it("sagt an einer Phase ohne eigene Liste, dass es keine Vorgabe gibt", () => {
    const views = buildPhaseViews(block, {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[1].detail[3]).toEqual({ k: "Vorgegebene Last", v: "keine" });
    expect(views[1].loadNote).toBeNull();
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

  it("laesst Journeys ohne Lastliste unveraendert", () => {
    const views = buildPhaseViews([phase()], {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].detail).toHaveLength(3);
    expect(views[0].loadNote).toBeNull();
  });
});

describe("buildPhaseViews – Wochenplan", () => {
  // Kraftphase ueber 4 Wochen (Leiter 5, 4, 3, 2) plus Kombiwoche - genau der
  // Aufbau, den der Kraftblock einer Journey hat.
  const kraft = phase({
    name: "Maximalkraft",
    focus: "strength",
    weeks: 4,
    setsStart: 4,
    setsEnd: 4,
    deloadWeek: null,
    repTargetMin: 4,
    repTargetMax: 6,
    weekPlan: buildStrengthWeekPlan(4),
  });
  const test = phase({
    name: "Übergang / Test",
    focus: "test",
    weeks: 2,
    setsStart: 3,
    setsEnd: 3,
    deloadWeek: null,
    weekPlan: buildTestPhaseWeekPlan(2),
  });
  const nurTest = phase({
    name: "Standort",
    focus: "test",
    weeks: 1,
    setsStart: 3,
    setsEnd: 3,
    deloadWeek: null,
    weekPlan: buildTestPhaseWeekPlan(1),
  });

  it("zeigt an der laufenden Phase die Wochentabelle", () => {
    const views = buildPhaseViews([kraft, test], {
      phaseIndex: 0,
      weekInPhase: 3,
      done: false,
    });
    const rows = views[0].weekRows!;
    expect(rows.map((r) => r.label)).toEqual([
      "Woche 1",
      "Woche 2",
      "Woche 3",
      "Woche 4",
    ]);
    expect(rows[2].targets).toBe("4 × 3 · RIR 1");
    expect(rows.map((r) => r.state)).toEqual([
      "past",
      "past",
      "current",
      "future",
    ]);
    expect(rows[0].mark).toBe("✓");
    expect(rows[2].mark).toBe("");
    // Kraftphasen tragen keinen Wochentext mehr (#275).
    expect(rows[0].note).toBe("");
  });

  it("zeigt die Tabelle nur an der laufenden Phase", () => {
    const views = buildPhaseViews([kraft, test], {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].weekRows).toBeNull();
  });

  it("zeigt die laufende Testphase als Wochenplan wie jede andere Planphase", () => {
    const views = buildPhaseViews([kraft, test], {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    const rows = views[1].weekRows!;
    expect(rows.map((r) => r.label)).toEqual(["Woche 1", "Woche 2"]);
    expect(rows[0].targets).toBe("2 × 3–5 · RIR 3");
    expect(rows[0].note).toBe("Entlastung mit 60 % vom Arbeitsgewicht");
    // Die Testwoche plant nichts - dort steht der Test statt Zahlen.
    expect(rows[1].targets).toBe("1RM-Test");
    expect(rows[1].note).toBe("Keine Vorgabe, läuft über die Übungsseite");
    // Wie bei allen Planphasen traegt die Tabelle alles (#362).
    expect(views[1].detail).toEqual([]);
  });

  it("zeigt an der laufenden einwoechigen Testphase nur die Testwoche", () => {
    const views = buildPhaseViews([kraft, nurTest], {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    const rows = views[1].weekRows!;
    expect(rows).toHaveLength(1);
    expect(rows[0].targets).toBe("1RM-Test");
  });

  it("fasst eine nicht laufende Testphase als Ablauf zusammen", () => {
    const views = buildPhaseViews([kraft, test, nurTest], {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    // Ohne Tabelle stuenden sonst die Werte der Entlastungswoche da, als
    // gaelten sie fuer die ganze Phase (#364).
    expect(views[1].weekRows).toBeNull();
    expect(views[1].detail).toEqual([
      { k: "Entlastung", v: "2 × 3–5 · RIR 3" },
      { k: "Testwoche", v: "1RM-Test" },
    ]);
    // Eine einwoechige Testphase hat gar keine Entlastung.
    expect(views[2].detail).toEqual([
      { k: "Vorgabe", v: "keine" },
      { k: "Testwoche", v: "1RM-Test" },
    ]);
  });

  it("nimmt die Detailzeilen aus dem Plan statt aus Band und Satz-Rampe", () => {
    const views = buildPhaseViews([kraft, test], {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].detail).toEqual([
      { k: "Wiederholungen", v: "5 → 2 Wdh" },
      { k: "Sätze / Woche", v: "4 Sätze" },
      { k: "Ziel-Anstrengung", v: "RIR 2 → 1" },
    ]);
  });

  it("laesst die Detailzeilen weg, wo die Wochentabelle sie schon traegt", () => {
    const views = buildPhaseViews([kraft, test], {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    });
    // Die laufende Kraftphase zeigt ihre Wochentabelle - die Eckwerte darueber
    // waeren nur deren Zusammenfassung (Issue #362).
    expect(views[0].weekRows).not.toBeNull();
    expect(views[0].detail).toEqual([]);
  });

  it("laesst Phasen ohne Plan unveraendert", () => {
    const views = buildPhaseViews(threePhases, {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views.every((v) => v.weekRows === null)).toBe(true);
    expect(views[1].detail[0].k).toBe("Wiederholungsband");
  });
});

// Zweiter Bauweg derselben Tabelle: Der Wiederaufbau gibt nur die Last vor -
// Saetze und Wiederholungen bleiben beim Coach - und traegt deshalb gar keine
// Wochenliste. Seine Laststufen stehen trotzdem als Wochentabelle da.
describe("buildPhaseViews – Wochentabelle aus der Lastliste", () => {
  const wiederaufbau = phase({
    name: "Wiederaufbau",
    focus: "rebuild",
    weeks: 3,
    setsStart: 2,
    setsEnd: 4,
    deloadWeek: null,
    repTargetMin: 6,
    repTargetMax: 10,
    loadPlan: buildRebuildRamp(3, 0.65, 0.95),
    weekPlan: null,
  });

  it("zeigt an der laufenden Phase je Woche ihren Lastanteil", () => {
    const views = buildPhaseViews([wiederaufbau], {
      phaseIndex: 0,
      weekInPhase: 2,
      done: false,
    });
    const rows = views[0].weekRows!;
    expect(rows.map((r) => r.label)).toEqual(["Woche 1", "Woche 2", "Woche 3"]);
    expect(rows.map((r) => r.targets)).toEqual(["65 %", "80 %", "95 %"]);
    expect(rows.map((r) => r.state)).toEqual(["past", "current", "future"]);
    expect(rows[0].mark).toBe("✓");
    expect(rows[1].mark).toBe("");
    // Derselbe Satz an jeder Zeile waere nur Rauschen - die Leiter spricht fuer
    // sich.
    expect(rows.every((r) => r.note === "")).toBe(true);
  });

  it("gibt jeder Phasenwoche eine Zeile, auch wenn die Liste kuerzer ist", () => {
    const views = buildPhaseViews(
      [
        phase({
          ...wiederaufbau,
          weeks: 4,
          loadPlan: buildRebuildRamp(3, 0.65, 0.95),
        }),
      ],
      { phaseIndex: 0, weekInPhase: 1, done: false },
    );
    const rows = views[0].weekRows!;
    expect(rows).toHaveLength(4);
    // Hinter der Liste haelt die Vorgabe auf ihrem letzten Wert.
    expect(rows[3].targets).toBe("95 %");
  });

  it("zeigt die Tabelle nur an der laufenden Phase", () => {
    const views = buildPhaseViews([wiederaufbau, phase()], {
      phaseIndex: 1,
      weekInPhase: 1,
      done: false,
    });
    expect(views[0].weekRows).toBeNull();
    // In der Vorschau laeuft keine Woche - dort bleibt die Tabelle ebenfalls weg.
    expect(buildTemplatePhaseViews([wiederaufbau])[0].weekRows).toBeNull();
  });

  it("laesst neben der Lasttabelle nur die Zeilen stehen, die sie nicht traegt", () => {
    const views = buildPhaseViews([wiederaufbau], {
      phaseIndex: 0,
      weekInPhase: 2,
      done: false,
    });
    // Die Lasttabelle zeigt nur das Gewicht - Band, Satz-Rampe und Deload
    // bleiben deshalb stehen, die Lastzeile faellt weg (Issue #362).
    expect(views[0].detail.map((d) => d.k)).toEqual([
      "Wiederholungsband",
      "Satz-Rampe / Woche",
      "Deload",
    ]);
    expect(views[0].loadNote).toContain("80 %");
    // Ohne Tabelle - hier die Vorschau - steht die Spanne wie bisher da.
    expect(buildTemplatePhaseViews([wiederaufbau])[0].detail).toContainEqual({
      k: "Vorgegebene Last",
      v: "65 → 95 %",
    });
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
      phase({ loadPlan: [{ week: 1, loadPct: 0.65 }] }),
      phase({ loadPlan: [{ week: 1, loadPct: 1 }] }),
    ]);
    expect(views[0].detail).toHaveLength(4);
    expect(views[0].detail[3]).toEqual({ k: "Vorgegebene Last", v: "65 %" });
    expect(views[1].detail).toHaveLength(4);
  });

  it("zeigt in der Vorschau die Spanne, weil es keine laufende Woche gibt", () => {
    const views = buildTemplatePhaseViews([
      phase({
        weeks: 3,
        loadPlan: [
          { week: 1, loadPct: 0.65 },
          { week: 2, loadPct: 0.8 },
          { week: 3, loadPct: 0.95 },
        ],
      }),
    ]);
    expect(views[0].detail[3]).toEqual({
      k: "Vorgegebene Last",
      v: "65 \u2192 95 %",
    });
  });
});

describe("totalWeeks", () => {
  it("summiert die Wochen aller Phasen", () => {
    expect(totalWeeks(threePhases)).toBe(11);
    expect(totalWeeks([])).toBe(0);
  });
});
