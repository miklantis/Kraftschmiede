import { describe, expect, it } from "vitest";
import { buildPeriodization } from "@/lib/periodization";
import type { JourneyPhaseInput } from "@/lib/journey";
import { buildComboWeekPlan, buildStrengthWeekPlan } from "@/engine";

// Zwei Phasen mit bekannten Eckdaten, damit Volumen (Satz-Rampe + Deload),
// Intensitaet (aus der Wiederholungsspanne) und die Baender exakt pruefbar sind.
function phase(overrides: Partial<JourneyPhaseInput>): JourneyPhaseInput {
  return {
    name: "Phase",
    focus: "hypertrophy",
    weeks: 4,
    setsStart: 2,
    setsEnd: 5,
    deloadWeek: null,
    repTargetMin: 8,
    repTargetMax: 12,
    loadFactor: 1,
    weekPlan: null,
    ...overrides,
  };
}

describe("buildPeriodization", () => {
  const phases: JourneyPhaseInput[] = [
    phase({
      name: "Aufbau",
      weeks: 4,
      setsStart: 2,
      setsEnd: 5,
      deloadWeek: 4,
      repTargetMin: 8,
      repTargetMax: 12,
    }),
    phase({
      name: "Kraft",
      weeks: 3,
      setsStart: 3,
      setsEnd: 4,
      deloadWeek: null,
      repTargetMin: 3,
      repTargetMax: 5,
    }),
  ];

  it("zaehlt alle Wochen ueber beide Phasen durch", () => {
    const d = buildPeriodization(phases, 1);
    expect(d.weeks.map((w) => w.g)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("rampt das Volumen und bricht in der Deload-Woche ein", () => {
    const d = buildPeriodization(phases, 1);
    // Phase 1: 2 -> 3 -> 4, Deload (Woche 4) auf 3 (-25 % von 4); Phase 2: 3 -> 4 -> 4
    expect(d.weeks.map((w) => w.vol)).toEqual([2, 3, 4, 3, 3, 4, 4]);
    expect(d.vMin).toBe(2);
    expect(d.vMax).toBe(4);
  });

  it("markiert genau die Deload-Woche", () => {
    const d = buildPeriodization(phases, 1);
    expect(d.weeks.map((w) => w.deload)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it("leitet die Intensitaet aus der Wiederholungsspanne ab", () => {
    const d = buildPeriodization(phases, 1);
    // Phase 1: Mitte 10 -> 0.1; Phase 2: Mitte 4 -> 0.25
    expect(d.weeks.map((w) => w.intens)).toEqual([
      0.1, 0.1, 0.1, 0.1, 0.25, 0.25, 0.25,
    ]);
    expect(d.iMin).toBeCloseTo(0.1);
    expect(d.iMax).toBeCloseTo(0.25);
  });

  it("senkt die Intensitaet einer Phase mit vorgegebener Last", () => {
    // Gleiches Repband, aber nur 65 % der alten Last: die Kurve darf hier nicht
    // so hoch liegen wie in der Phase mit voller Last.
    const d = buildPeriodization(
      [
        phase({ name: "Tasten", weeks: 1, repTargetMin: 8, repTargetMax: 12, loadFactor: 0.65 }),
        phase({ name: "Standort", weeks: 1, repTargetMin: 8, repTargetMax: 12, loadFactor: 1 }),
      ],
      1,
    );
    expect(d.weeks[0].intens).toBeCloseTo(0.065);
    expect(d.weeks[1].intens).toBeCloseTo(0.1);
  });

  it("beschriftet Baender mit vorgegebener Last", () => {
    const d = buildPeriodization(
      [
        phase({ name: "Tasten", weeks: 1, loadFactor: 0.65 }),
        phase({ name: "Standort", weeks: 1, loadFactor: 1 }),
      ],
      1,
    );
    expect(d.bands[0].loadLabel).toBe("65 %");
    expect(d.bands[1].loadLabel).toBeNull();
  });

  it("setzt die Phasen-Baender ueber ihre Wochenspanne", () => {
    const d = buildPeriodization(phases, 1);
    expect(d.bands).toEqual([
      { name: "Aufbau", start: 0, end: 3, loadLabel: null },
      { name: "Kraft", start: 4, end: 6, loadLabel: null },
    ]);
  });

  it("klemmt die aktuelle Gesamtwoche auf gueltige Indizes", () => {
    expect(buildPeriodization(phases, 5).curG).toBe(4); // 1-basiert 5 -> Index 4
    expect(buildPeriodization(phases, 1).curG).toBe(0);
    expect(buildPeriodization(phases, 0).curG).toBe(0); // unter 1 -> 0
    expect(buildPeriodization(phases, 99).curG).toBe(6); // ueber das Ende -> letzte
  });

  it("nimmt bei fehlender Wiederholungsspanne ein Mittel von 8", () => {
    const d = buildPeriodization(
      [phase({ weeks: 1, repTargetMin: null, repTargetMax: null })],
      1,
    );
    expect(d.weeks[0].intens).toBeCloseTo(1 / 8);
  });

  it("vergibt einen Ersatznamen fuer Baender ohne Namen", () => {
    const d = buildPeriodization([phase({ name: "", weeks: 2 })], 1);
    expect(d.bands[0].name).toBe("Phase 1");
  });

  // Issue #225, Schritt 6: Phasen mit Wochenplan rechnen wochengenau.
  describe("Phasen mit Wochenplan", () => {
    const kraftUndKombi: JourneyPhaseInput[] = [
      phase({
        name: "Maximalkraft",
        focus: "strength",
        weeks: 4,
        setsStart: 3,
        setsEnd: 5,
        deloadWeek: null,
        repTargetMin: 4,
        repTargetMax: 6,
        weekPlan: buildStrengthWeekPlan(4),
      }),
      phase({
        name: "Test",
        focus: "test",
        weeks: 1,
        setsStart: 3,
        setsEnd: 3,
        deloadWeek: null,
        weekPlan: buildComboWeekPlan(1),
      }),
    ];

    it("laesst die Intensitaet mit der Wiederholungsleiter steigen", () => {
      const d = buildPeriodization(kraftUndKombi, 1);
      // Leiter 5, 4, 3, 2 -> 1/5, 1/4, 1/3, 1/2; danach die Kombiwoche mit
      // 60 % auf Mitte 4 -> 0,15.
      expect(d.weeks.map((w) => w.intens)).toEqual([
        0.2, 0.25, 1 / 3, 0.5, 0.15,
      ]);
      expect(d.iMin).toBeCloseTo(0.15);
      expect(d.iMax).toBeCloseTo(0.5);
    });

    it("nimmt das Volumen aus den Saetzen des Plans statt aus der Satz-Rampe", () => {
      const d = buildPeriodization(kraftUndKombi, 1);
      expect(d.weeks.map((w) => w.vol)).toEqual([4, 4, 4, 4, 3]);
    });

    it("markiert die Kombiwoche als Entlastung", () => {
      const d = buildPeriodization(kraftUndKombi, 1);
      expect(d.weeks.map((w) => w.deload)).toEqual([
        false,
        false,
        false,
        false,
        true,
      ]);
    });

    it("rechnet Phasen ohne Plan daneben unveraendert", () => {
      const gemischt: JourneyPhaseInput[] = [
        phase({ name: "Aufbau", weeks: 2, setsStart: 2, setsEnd: 5 }),
        kraftUndKombi[0]!,
      ];
      const d = buildPeriodization(gemischt, 1);
      // Aufbau wie bisher (Rampe 2 -> 5 ueber 2 Wochen, Mitte 10 -> 0,1).
      expect(d.weeks.slice(0, 2).map((w) => w.vol)).toEqual([2, 5]);
      expect(d.weeks.slice(0, 2).map((w) => w.intens)).toEqual([0.1, 0.1]);
    });
  });

  it("liefert bei leerer Journey ein sicheres, leeres Modell", () => {
    const d = buildPeriodization([], 1);
    expect(d.weeks).toEqual([]);
    expect(d.bands).toEqual([]);
    expect(d.curG).toBe(0);
    expect(d.vMin).toBe(0);
    expect(d.vMax).toBe(1);
  });
});
