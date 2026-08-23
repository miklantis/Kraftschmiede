// Die Lastliste einer Phase: Form, Lesen der laufenden Woche und Spanne.
// Bewusst eine Liste und keine Formel (ADR-0018) - hier steht nachpruefbar,
// dass die drei Faelle, an denen die Interpolation scheiterte, gar nicht erst
// entstehen: Ein-Wochen-Phase, ueberlange Phase, doppelte Rechnung je Anzeige.

import { describe, expect, it } from "vitest";
import {
  buildLoadPlanFor,
  buildRebuildRamp,
  hasLoadPlan,
  loadPlanForWeek,
  loadPlanFromShares,
  loadPlanSpan,
  parseLoadPlan,
} from "@/engine";

const block = [
  { week: 1, loadPct: 0.65 },
  { week: 2, loadPct: 0.8 },
  { week: 3, loadPct: 0.95 },
];

describe("parseLoadPlan", () => {
  it("liest eine gueltige Liste", () => {
    expect(parseLoadPlan(block)).toEqual(block);
  });

  it("nimmt eine leere Liste als 'keine Vorgabe'", () => {
    expect(parseLoadPlan([])).toBeNull();
    expect(parseLoadPlan(null)).toBeNull();
    expect(parseLoadPlan(undefined)).toBeNull();
  });

  it("verwirft Halbfertiges, statt damit zu rechnen", () => {
    expect(parseLoadPlan([{ week: 1 }])).toBeNull();
    expect(parseLoadPlan([{ week: 0, loadPct: 0.8 }])).toBeNull();
    expect(parseLoadPlan([{ week: 1, loadPct: 0 }])).toBeNull();
    expect(parseLoadPlan("65 %")).toBeNull();
  });
});

describe("loadPlanForWeek", () => {
  it("gibt den Anteil der laufenden Woche", () => {
    expect(loadPlanForWeek(block, 1)).toBe(0.65);
    expect(loadPlanForWeek(block, 2)).toBe(0.8);
    expect(loadPlanForWeek(block, 3)).toBe(0.95);
  });

  it("haelt die Vorgabe jenseits der Liste", () => {
    // Eine ueberlange Phase bleibt auf dem Zielanteil stehen, statt auf freie
    // Steuerung zurueckzufallen; vor Woche 1 gilt die erste Zeile.
    expect(loadPlanForWeek(block, 0)).toBe(0.65);
    expect(loadPlanForWeek(block, 9)).toBe(0.95);
  });

  it("liest auch eine unsortierte Liste richtig", () => {
    const gemischt = [block[2]!, block[0]!, block[1]!];
    expect(loadPlanForWeek(gemischt, 1)).toBe(0.65);
    expect(loadPlanForWeek(gemischt, 3)).toBe(0.95);
  });

  it("bleibt ohne Liste leer", () => {
    expect(loadPlanForWeek(null, 1)).toBeNull();
    expect(loadPlanForWeek([], 1)).toBeNull();
  });

  it("kommt mit einer Ein-Wochen-Phase klar", () => {
    // Genau der Fall, an dem die Interpolation durch null geteilt haette.
    expect(loadPlanForWeek([{ week: 1, loadPct: 0.65 }], 1)).toBe(0.65);
  });
});

describe("loadPlanSpan", () => {
  it("gibt Start und Ziel", () => {
    expect(loadPlanSpan(block)).toEqual([0.65, 0.95]);
  });

  it("gibt bei gleichbleibender Last zweimal denselben Wert", () => {
    expect(
      loadPlanSpan([
        { week: 1, loadPct: 0.8 },
        { week: 2, loadPct: 0.8 },
      ]),
    ).toEqual([0.8, 0.8]);
  });

  it("bleibt ohne Liste leer", () => {
    expect(loadPlanSpan(null)).toBeNull();
    expect(loadPlanSpan([])).toBeNull();
  });
});

describe("hasLoadPlan", () => {
  it("erkennt die Vorgabe an der Liste, nicht an ihren Werten", () => {
    expect(hasLoadPlan(block)).toBe(true);
    // Eine gleichbleibende volle Last ist auch eine Vorgabe - sie braucht
    // denselben eingefrorenen Bezugspunkt wie eine wandernde.
    expect(hasLoadPlan([{ week: 1, loadPct: 1 }])).toBe(true);
    expect(hasLoadPlan([])).toBe(false);
    expect(hasLoadPlan(null)).toBe(false);
  });
});

// Anteile einer gebauten Liste in ganzen Prozent - so, wie die Tabelle im
// Konzept (Abschnitt 6) sie nennt.
function prozente(plan: ReadonlyArray<{ loadPct: number }>): number[] {
  return plan.map((w) => Math.round(w.loadPct * 100));
}

describe("buildRebuildRamp", () => {
  it("verteilt drei Wochen auf 65 / 80 / 95", () => {
    expect(buildRebuildRamp(3, 0.65, 0.95)).toEqual([
      { week: 1, loadPct: 0.65 },
      { week: 2, loadPct: 0.8 },
      { week: 3, loadPct: 0.95 },
    ]);
  });

  it("trifft die Stufen des Konzepts bei vier bis sechs Wochen", () => {
    expect(prozente(buildRebuildRamp(4, 0.65, 0.95))).toEqual([65, 75, 85, 95]);
    // Fuenf Wochen ergeben halbe Prozent - genau deshalb wird nicht auf ein
    // 5er-Raster gerundet.
    expect(buildRebuildRamp(5, 0.65, 0.95).map((w) => w.loadPct)).toEqual([
      0.65, 0.725, 0.8, 0.875, 0.95,
    ]);
    expect(prozente(buildRebuildRamp(6, 0.65, 0.95))).toEqual([
      65, 71, 77, 83, 89, 95,
    ]);
  });

  it("gibt je Phasenwoche eine Zeile, aufsteigend von Start auf Ziel", () => {
    for (let weeks = 3; weeks <= 6; weeks++) {
      const plan = buildRebuildRamp(weeks, 0.65, 0.95);
      expect(plan, `${weeks} Wochen`).toHaveLength(weeks);
      expect(plan.map((w) => w.week)).toEqual(
        Array.from({ length: weeks }, (_, i) => i + 1),
      );
      expect(plan[0].loadPct).toBe(0.65);
      expect(plan[plan.length - 1].loadPct).toBe(0.95);
      for (let i = 1; i < plan.length; i++) {
        expect(plan[i].loadPct, `${weeks}/${i}`).toBeGreaterThan(
          plan[i - 1].loadPct,
        );
      }
    }
  });

  it("laesst keine Rechenreste in den Anteilen stehen", () => {
    // Ohne Rundung stuende hier 0.7700000000000001 und in der Datenbank
    // dieselbe Zahl.
    expect(buildRebuildRamp(6, 0.65, 0.95)[2].loadPct).toBe(0.77);
  });

  it("traegt bei einer einzelnen Woche den Zielanteil statt zu scheitern", () => {
    // Der Baustein laesst erst drei Wochen zu; die Regel soll auch ausserhalb
    // ihrer Grenzen etwas Sinnvolles liefern statt durch null zu teilen.
    expect(buildRebuildRamp(1, 0.65, 0.95)).toEqual([
      { week: 1, loadPct: 0.95 },
    ]);
  });
});

describe("buildLoadPlanFor", () => {
  it("baut die Liste nur zur bekannten Bauregel", () => {
    expect(buildLoadPlanFor("rebuild_ramp", 3, 0.65, 0.95)).toHaveLength(3);
    expect(buildLoadPlanFor(null, 3, 0.65, 0.95)).toBeNull();
  });

  it("raet nichts aus einer halben Angabe", () => {
    expect(buildLoadPlanFor("rebuild_ramp", 3, null, 0.95)).toBeNull();
    expect(buildLoadPlanFor("rebuild_ramp", 3, 0.65, null)).toBeNull();
  });
});

describe("loadPlanFromShares", () => {
  it("nummeriert getippte Anteile durch", () => {
    expect(loadPlanFromShares([0.65, 0.8])).toEqual([
      { week: 1, loadPct: 0.65 },
      { week: 2, loadPct: 0.8 },
    ]);
  });

  it("macht aus keiner Angabe keine Vorgabe", () => {
    expect(loadPlanFromShares([])).toBeNull();
    expect(loadPlanFromShares(undefined)).toBeNull();
  });
});
