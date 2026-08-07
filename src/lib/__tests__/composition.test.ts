import { describe, it, expect } from "vitest";
import { bodyMetricSeries, compChips } from "@/lib/composition";
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
    ecw_kg: null,
    icw_kg: null,
    bmr_kcal: null,
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

  it("zeigt ECW/ICW, wenn vorhanden", () => {
    const chips = compChips(row({ ecw_kg: 14.9, icw_kg: 33.5 }));
    expect(chips).toContain("ECW 14,9 kg");
    expect(chips).toContain("ICW 33,5 kg");
  });

  it("zeigt den BMR-Chip in kcal", () => {
    const chips = compChips(row({ bmr_kcal: 1780 }));
    expect(chips).toContain("BMR 1780 kcal");
  });
});
