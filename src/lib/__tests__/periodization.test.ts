import { describe, expect, it } from "vitest";
import { buildPeriodization } from "@/lib/periodization";
import type { JourneyPhaseInput } from "@/lib/journey";

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

  it("setzt die Phasen-Baender ueber ihre Wochenspanne", () => {
    const d = buildPeriodization(phases, 1);
    expect(d.bands).toEqual([
      { name: "Aufbau", start: 0, end: 3 },
      { name: "Kraft", start: 4, end: 6 },
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

  it("liefert bei leerer Journey ein sicheres, leeres Modell", () => {
    const d = buildPeriodization([], 1);
    expect(d.weeks).toEqual([]);
    expect(d.bands).toEqual([]);
    expect(d.curG).toBe(0);
    expect(d.vMin).toBe(0);
    expect(d.vMax).toBe(1);
  });
});
