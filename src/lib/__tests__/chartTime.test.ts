import { describe, it, expect } from "vitest";
import { timeSlots } from "@/lib/chartTime";

describe("timeSlots", () => {
  it("rechnet Tagesabstaende zum aeltesten Datum", () => {
    expect(timeSlots(["2026-01-01", "2026-01-08", "2026-02-01"])).toEqual([
      0, 7, 31,
    ]);
  });

  it("laesst Pausen als groesseren Abstand stehen", () => {
    // Zwei Einheiten in einer Woche, dann drei Wochen Pause.
    const s = timeSlots(["2026-01-05", "2026-01-07", "2026-01-28"]) as number[];
    expect(s[1] - s[0]).toBe(2);
    expect(s[2] - s[1]).toBe(21);
  });

  it("faellt auf gleichmaessige Verteilung zurueck", () => {
    expect(timeSlots([])).toBeNull();
    expect(timeSlots(["2026-01-01"])).toBeNull();
    // alles am selben Tag
    expect(timeSlots(["2026-01-01", "2026-01-01"])).toBeNull();
    // unlesbares Datum
    expect(timeSlots(["2026-01-01", ""])).toBeNull();
  });
});
