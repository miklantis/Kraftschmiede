// Die Lastliste einer Phase: Form, Lesen der laufenden Woche und Spanne.
// Bewusst eine Liste und keine Formel (ADR-0018) - hier steht nachpruefbar,
// dass die drei Faelle, an denen die Interpolation scheiterte, gar nicht erst
// entstehen: Ein-Wochen-Phase, ueberlange Phase, doppelte Rechnung je Anzeige.

import { describe, expect, it } from "vitest";
import {
  hasLoadPlan,
  loadPlanForWeek,
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
