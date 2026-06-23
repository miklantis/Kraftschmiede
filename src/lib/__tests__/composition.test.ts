import { describe, it, expect } from "vitest";
import {
  bodyMetricSeries,
  compChips,
  normalizeCompositionRows,
  parseCompositionText,
} from "@/lib/composition";
import type { CompositionRow } from "@/schemas";

function row(p: Partial<CompositionRow>): CompositionRow {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    user_id: "00000000-0000-0000-0000-000000000000",
    date: "2026-06-01",
    weight: null,
    body_fat_kg: null,
    body_fat_pct: null,
    skeletal_muscle_kg: null,
    tbw_kg: null,
    phase_angle: null,
    visceral_fat: null,
    ...p,
  };
}

describe("bodyMetricSeries", () => {
  it("sortiert alt->neu und laesst null-Werte weg", () => {
    const rows = [
      row({ date: "2026-06-03", weight: 80 }),
      row({ date: "2026-06-01", weight: 79 }),
      row({ date: "2026-06-02", weight: null }),
    ];
    const s = bodyMetricSeries(rows, "weight");
    expect(s.vals).toEqual([79, 80]);
    expect(s.unit).toBe("kg");
  });

  it("liest die richtige Spalte je Metrik", () => {
    const rows = [row({ date: "2026-06-01", phase_angle: 6.2 })];
    expect(bodyMetricSeries(rows, "phase").vals).toEqual([6.2]);
    expect(bodyMetricSeries(rows, "weight").vals).toEqual([]);
  });
});

describe("compChips", () => {
  it("zeigt nur vorhandene Felder, Fett bevorzugt Prozent", () => {
    const chips = compChips(
      row({ weight: 79.8, body_fat_pct: 19.7, body_fat_kg: 15.7, skeletal_muscle_kg: 38.9 }),
    );
    expect(chips).toContain("79,8 kg");
    expect(chips.some((c) => c.startsWith("Fett") && c.includes("%"))).toBe(true);
    expect(chips.some((c) => c.startsWith("Fett") && c.includes("kg"))).toBe(false);
  });
});

describe("normalizeCompositionRows", () => {
  it("liest camelCase aus { composition: [...] } und ignoriert Zusatzfelder", () => {
    const rows = normalizeCompositionRows({
      composition: [
        {
          id: "comp_20260615",
          source: "inbody",
          heightCm: 185,
          age: 47,
          date: "2026-06-15",
          weight: 79.8,
          bodyFatPct: 19.7,
          skeletalMuscleKg: 38.9,
          tbwKg: 48.4,
          phaseAngle: 6.2,
          visceralFat: 8,
        },
      ],
    });
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      date: "2026-06-15",
      weight: 79.8,
      body_fat_pct: 19.7,
      skeletal_muscle_kg: 38.9,
      tbw_kg: 48.4,
      phase_angle: 6.2,
      visceral_fat: 8,
    });
  });

  it("akzeptiert ein reines Array und snake_case", () => {
    const rows = normalizeCompositionRows([
      { date: "2026-06-15", body_fat_kg: 15.7 },
    ]);
    expect(rows[0].body_fat_kg).toBe(15.7);
  });

  it("verwirft Eintraege ohne gueltiges ISO-Datum", () => {
    expect(normalizeCompositionRows([{ weight: 80 }]).length).toBe(0);
    expect(normalizeCompositionRows([{ date: "15.06.2026", weight: 80 }]).length).toBe(0);
  });

  it("wandelt Komma-Dezimaltrenner", () => {
    const rows = normalizeCompositionRows([{ date: "2026-06-15", weight: "79,8" }]);
    expect(rows[0].weight).toBe(79.8);
  });
});

describe("parseCompositionText", () => {
  it("wirft bei kaputtem JSON", () => {
    expect(() => parseCompositionText("{ nope")).toThrow();
  });
  it("wirft, wenn keine Messung erkannt wurde", () => {
    expect(() => parseCompositionText("[]")).toThrow();
  });
  it("liefert Zeilen bei gueltigem JSON", () => {
    const rows = parseCompositionText('{"composition":[{"date":"2026-06-15","weight":80}]}');
    expect(rows[0].weight).toBe(80);
  });
});
