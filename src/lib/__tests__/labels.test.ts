import { describe, it, expect } from "vitest";
import { dauerLabel, skillTargetLabel } from "@/lib/labels";

describe("dauerLabel", () => {
  it("zeigt kurze Haltezeiten in Sekunden", () => {
    expect(dauerLabel(30)).toBe("30 Sek.");
    expect(dauerLabel(60)).toBe("60 Sek.");
    expect(dauerLabel(119)).toBe("119 Sek.");
  });

  it("zeigt ab zwei Minuten in Minuten", () => {
    expect(dauerLabel(120)).toBe("2 Min.");
    expect(dauerLabel(300)).toBe("5 Min.");
    expect(dauerLabel(600)).toBe("10 Min.");
    expect(dauerLabel(900)).toBe("15 Min.");
  });

  it("haengt bei krummen Werten die Sekunden an", () => {
    expect(dauerLabel(150)).toBe("2:30 Min.");
    expect(dauerLabel(605)).toBe("10:05 Min.");
  });

  it("liefert die kurze Form fuer die Live-Ansicht", () => {
    expect(dauerLabel(45, true)).toBe("45 s");
    expect(dauerLabel(900, true)).toBe("15 min");
    expect(dauerLabel(150, true)).toBe("2:30 min");
  });

  it("faengt Nachkommastellen und negative Werte ab", () => {
    expect(dauerLabel(59.6)).toBe("60 Sek.");
    expect(dauerLabel(-5)).toBe("0 Sek.");
  });
});

describe("skillTargetLabel", () => {
  it("beschriftet Wiederholungen", () => {
    expect(skillTargetLabel(8, "reps")).toBe("8 Wdh.");
    expect(skillTargetLabel(8, "reps", true)).toBe("8 Wdh");
  });

  it("beschriftet Haltezeiten", () => {
    expect(skillTargetLabel(30, "duration")).toBe("30 Sek.");
    expect(skillTargetLabel(900, "duration")).toBe("15 Min.");
  });

  it("gibt bei unbekannter Metrik nur den Wert zurueck", () => {
    expect(skillTargetLabel(5, null)).toBe("5");
  });
});
