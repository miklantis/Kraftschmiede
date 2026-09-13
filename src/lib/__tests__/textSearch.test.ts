import { describe, it, expect } from "vitest";
import { matchesQuery } from "@/lib/textSearch";

describe("matchesQuery", () => {
  it("passt bei leerem Begriff immer", () => {
    expect(matchesQuery("Rücken", "")).toBe(true);
    expect(matchesQuery("Rücken", "   ")).toBe(true);
  });

  it("ignoriert Gross-/Kleinschreibung", () => {
    expect(matchesQuery("Push Day", "PUSH")).toBe(true);
    expect(matchesQuery("PUSH DAY", "day")).toBe(true);
  });

  it("findet Teiltreffer mitten im Text", () => {
    expect(matchesQuery("Beine und Rumpf", "und")).toBe(true);
    expect(matchesQuery("Beine und Rumpf", "rumpf")).toBe(true);
  });

  it("findet Umlaute egal wie getippt", () => {
    expect(matchesQuery("Rücken", "rücken")).toBe(true);
    expect(matchesQuery("Rücken", "ruecken")).toBe(true);
    expect(matchesQuery("Rücken", "rucken")).toBe(true);
    expect(matchesQuery("Oberkörper", "oberkorper")).toBe(true);
    expect(matchesQuery("Oberkörper", "oberkoerper")).toBe(true);
  });

  it("findet ausgeschriebene Umlaute im Text auch mit getipptem Umlaut", () => {
    expect(matchesQuery("Ruecken", "rücken")).toBe(true);
    expect(matchesQuery("Ruecken", "ruecken")).toBe(true);
  });

  it("behandelt ss und ß gleich", () => {
    expect(matchesQuery("Fußtraining", "fuss")).toBe(true);
    expect(matchesQuery("Fußtraining", "fuß")).toBe(true);
  });

  it("ignoriert Leerzeichen am Rand des Begriffs", () => {
    expect(matchesQuery("Push Day", "  push  ")).toBe(true);
  });

  it("passt nicht bei anderem Text", () => {
    expect(matchesQuery("Push Day", "pull")).toBe(false);
    expect(matchesQuery("Rücken", "beine")).toBe(false);
  });
});
