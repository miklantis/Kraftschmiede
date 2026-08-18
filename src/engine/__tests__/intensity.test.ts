// Intensitaetsrampe der Phase: die geplante Last in Prozent des 1RM ueber die
// Phasenwochen. Massstab ist das Lehrbuch-Vorbild aus Issue #200 (Bompa,
// Kapitel 10): vier Wochen, 77,5 / 80 / 82,5 Prozent, Entlastung bei rund 70.

import { describe, expect, it } from "vitest";
import {
  intensityForWeek,
  loadShareForWeek,
  plansLoad,
  rampIntensity,
} from "../intensity";

const KRAFT = {
  intensityStart: 77.5,
  intensityEnd: 82.5,
  weeks: 4,
  deloadWeek: 4,
};

describe("intensityForWeek", () => {
  it("trifft das Lehrbuch-Vorbild: 77,5 / 80 / 82,5 und Entlastung bei rund 70", () => {
    expect(intensityForWeek(KRAFT, 0)).toBeCloseTo(77.5, 5);
    expect(intensityForWeek(KRAFT, 1)).toBeCloseTo(80, 5);
    expect(intensityForWeek(KRAFT, 2)).toBeCloseTo(82.5, 5);
    expect(intensityForWeek(KRAFT, 3)).toBeCloseTo(70.125, 5);
  });

  it("erreicht den Endwert auch dann, wenn die Phase mit der Entlastung endet", () => {
    // Genau hier unterscheidet sich die Rampe von rampSets: wuerde ueber alle
    // vier Wochen interpoliert, kaeme in Woche 3 nur 80,8 statt 82,5 heraus.
    expect(intensityForWeek(KRAFT, 2)).toBeCloseTo(82.5, 5);
  });

  it("laesst die Rampe nach einer Entlastung mitten in der Phase weiterlaufen", () => {
    const phase = {
      intensityStart: 70,
      intensityEnd: 80,
      weeks: 5,
      deloadWeek: 3,
    };
    expect(intensityForWeek(phase, 0)).toBeCloseTo(70, 5);
    expect(intensityForWeek(phase, 1)).toBeCloseTo(73.3333, 3);
    expect(intensityForWeek(phase, 2)).toBeCloseTo(73.3333 * 0.85, 3);
    expect(intensityForWeek(phase, 3)).toBeCloseTo(76.6667, 3);
    expect(intensityForWeek(phase, 4)).toBeCloseTo(80, 5);
  });

  it("gibt bei einer Phase ohne Entlastung die glatte Rampe zurueck", () => {
    const phase = {
      intensityStart: 80,
      intensityEnd: 90,
      weeks: 3,
      deloadWeek: null,
    };
    expect(intensityForWeek(phase, 0)).toBeCloseTo(80, 5);
    expect(intensityForWeek(phase, 1)).toBeCloseTo(85, 5);
    expect(intensityForWeek(phase, 2)).toBeCloseTo(90, 5);
  });

  it("liefert in einer Ein-Wochen-Phase den Endwert", () => {
    const phase = {
      intensityStart: 90,
      intensityEnd: 95,
      weeks: 1,
      deloadWeek: null,
    };
    expect(intensityForWeek(phase, 0)).toBeCloseTo(95, 5);
  });

  it("bleibt in den Grenzen der Phase, auch bei zu grossem Wochenindex", () => {
    expect(intensityForWeek(KRAFT, 99)).toBeCloseTo(70.125, 5);
    expect(intensityForWeek(KRAFT, -3)).toBeCloseTo(77.5, 5);
  });

  it("gibt null zurueck, wenn die Phase die Last nicht plant", () => {
    expect(
      intensityForWeek(
        { intensityStart: null, intensityEnd: null, weeks: 4, deloadWeek: null },
        0,
      ),
    ).toBeNull();
    expect(
      intensityForWeek(
        { intensityStart: 80, intensityEnd: null, weeks: 4, deloadWeek: null },
        0,
      ),
    ).toBeNull();
    expect(
      intensityForWeek(
        { intensityStart: 0, intensityEnd: 80, weeks: 4, deloadWeek: null },
        0,
      ),
    ).toBeNull();
  });
});

describe("loadShareForWeek", () => {
  it("startet bei 1 und waechst mit der Rampe", () => {
    expect(loadShareForWeek(KRAFT, 0)).toBeCloseTo(1, 5);
    expect(loadShareForWeek(KRAFT, 1)).toBeCloseTo(80 / 77.5, 5);
    expect(loadShareForWeek(KRAFT, 2)).toBeCloseTo(82.5 / 77.5, 5);
  });

  it("faellt in der Entlastungswoche unter 1", () => {
    const share = loadShareForWeek(KRAFT, 3);
    expect(share).not.toBeNull();
    expect(share as number).toBeLessThan(1);
    expect(share).toBeCloseTo(70.125 / 77.5, 5);
  });

  it("gibt null zurueck, wenn die Phase die Last nicht plant", () => {
    expect(
      loadShareForWeek(
        { intensityStart: null, intensityEnd: null, weeks: 4, deloadWeek: null },
        0,
      ),
    ).toBeNull();
  });
});

describe("rampIntensity", () => {
  it("interpoliert ueber die Aufbauwochen, nicht ueber alle Wochen", () => {
    expect(rampIntensity(77.5, 82.5, 2, 4, 4)).toBeCloseTo(82.5, 5);
    expect(rampIntensity(77.5, 82.5, 2, 4, null)).toBeCloseTo(80.8333, 3);
  });
});

describe("plansLoad", () => {
  it("erkennt Phasen mit und ohne Lastplanung", () => {
    expect(plansLoad(KRAFT)).toBe(true);
    expect(
      plansLoad({ intensityStart: null, intensityEnd: null, weeks: 4 }),
    ).toBe(false);
    expect(plansLoad({ intensityStart: 80, intensityEnd: null, weeks: 4 })).toBe(
      false,
    );
  });
});
