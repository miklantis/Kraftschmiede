import { describe, it, expect } from "vitest";
import {
  soreDaysSince,
  soreRegionValues,
  soreInfoLine,
  soreColor,
  soreButtonColors,
  readyButtonColors,
  bodyLogChips,
  KATER_HEX,
} from "@/lib/body";
import { regionsForSection } from "@/lib/muscles";

describe("soreDaysSince", () => {
  it("zaehlt ganze Tage und nie negativ", () => {
    expect(soreDaysSince("2026-06-20", "2026-06-23")).toBe(3);
    expect(soreDaysSince("2026-06-23", "2026-06-23")).toBe(0);
    expect(soreDaysSince("2026-06-25", "2026-06-23")).toBe(0); // Zukunft -> 0
    expect(soreDaysSince(null, "2026-06-23")).toBe(null);
  });
});

describe("soreRegionValues", () => {
  it("ohne Quelle null", () => {
    expect(soreRegionValues(null, "2026-06-23")).toBe(null);
  });

  it("verfaellt -1 pro Tag und aggregiert je Sektion (Maximum)", () => {
    const src = { date: "2026-06-21", overall: 1, upper_body: 3, legs: 0 };
    const vals = soreRegionValues(src, "2026-06-23")!; // 2 Tage spaeter
    // overall 1 - 2 = 0 (Basis), upper 3 - 2 = 1, legs 0 - 2 = 0
    const ober = regionsForSection("oberkoerper");
    const unter = regionsForSection("unterkoerper");
    for (const r of ober) expect(vals[r]).toBe(1);
    for (const r of unter) expect(vals[r]).toBe(0);
  });

  it("overall ist Basis aller Regionen", () => {
    const vals = soreRegionValues(
      { date: "2026-06-23", overall: 2, upper_body: 0, legs: 0 },
      "2026-06-23",
    )!;
    // overall 2 ueberall; Sektionen mit 0 ueberschreiben nicht (Maximum)
    expect(Object.values(vals).every((v) => v === 2)).toBe(true);
  });
});

describe("soreInfoLine", () => {
  it("formuliert heute/gestern/vor X Tagen", () => {
    expect(soreInfoLine({ date: "2026-06-23" }, "2026-06-23")).toContain("heute");
    expect(soreInfoLine({ date: "2026-06-22" }, "2026-06-23")).toContain("gestern");
    expect(soreInfoLine({ date: "2026-06-20" }, "2026-06-23")).toContain(
      "vor 3 Tagen",
    );
    expect(soreInfoLine(null, "2026-06-23")).toBe("Noch kein Kater erfasst.");
  });
});

describe("Farb-Helfer", () => {
  it("soreColor clamped 1..3", () => {
    expect(soreColor(0)).toBe(KATER_HEX[1]);
    expect(soreColor(2)).toBe(KATER_HEX[2]);
    expect(soreColor(9)).toBe(KATER_HEX[3]);
  });
  it("soreButtonColors gefuellt vs dezent", () => {
    expect(soreButtonColors(0, true)).toEqual({
      bg: KATER_HEX[0],
      fg: "var(--primary-foreground)",
    });
    expect(soreButtonColors(3, false).fg).toBe(KATER_HEX[3]);
  });
  it("readyButtonColors gefuellt vs dezent", () => {
    expect(readyButtonColors(5, true).fg).toBe("var(--primary-foreground)");
    expect(readyButtonColors(1, false).bg).toContain("var(--rating-");
  });
});

describe("bodyLogChips", () => {
  it("baut Kater-/Readiness-Chips, Schmerz nur bei Flag", () => {
    expect(bodyLogChips({ legs: 1, upper_body: 2, overall: 0, readiness: 4 })).toEqual([
      "Beine 1",
      "OK 2",
      "Ges 0",
      "Rdy 4",
    ]);
    expect(
      bodyLogChips({ pain_flag: true, readiness: 3 }),
    ).toContain("Schmerz");
  });
});
