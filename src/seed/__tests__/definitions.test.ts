import { describe, it, expect } from "vitest";
import { buildWeekPlan } from "@/engine/weekPlan";
import { journeyTemplateSeeds } from "@/seed/definitions";

describe("Journey-Vorlagen im Seed", () => {
  it("vergibt jeden Vorlagen-Schluessel nur einmal", () => {
    const keys = journeyTemplateSeeds.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gibt jeder Phase einen gueltigen Lastfaktor", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        expect(Number.isFinite(p.loadFactor)).toBe(true);
        expect(p.loadFactor).toBeGreaterThan(0);
        expect(p.loadFactor).toBeLessThanOrEqual(1);
      }
    }
  });

  it("laesst alle bestehenden Vorlagen auf Lastfaktor 1.0", () => {
    const bestand = journeyTemplateSeeds.filter(
      (t) => t.key !== "refeed_rebuild",
    );
    // Schutz davor, dass der Filter irgendwann ins Leere greift.
    expect(bestand.length).toBe(journeyTemplateSeeds.length - 1);
    for (const t of bestand) {
      for (const p of t.phases) {
        expect(p.loadFactor).toBe(1);
      }
    }
  });
});

describe("Wochenplan der Vorlagen-Phasen", () => {
  const alle = journeyTemplateSeeds.flatMap((t) => t.phases);

  it("gibt jeder Kraft-, Schnellkraft- und Testphase einen Plan ueber alle Wochen", () => {
    const geplant = alle.filter((p) =>
      ["strength", "power", "test"].includes(p.focus),
    );
    expect(geplant.length).toBeGreaterThan(0);
    for (const p of geplant) {
      const plan = buildWeekPlan(p.focus, p.weeks);
      expect(plan).not.toBeNull();
      expect(plan).toHaveLength(p.weeks);
    }
  });

  it("laesst alle uebrigen Phasen beim Coach", () => {
    const frei = alle.filter(
      (p) => !["strength", "power", "test"].includes(p.focus),
    );
    for (const p of frei) {
      expect(buildWeekPlan(p.focus, p.weeks)).toBeNull();
    }
  });

  it("faehrt Kraftphasen ohne Entlastungswoche - die steckt in der Kombiwoche", () => {
    const kraft = alle.filter((p) => p.focus === "strength");
    expect(kraft.length).toBeGreaterThan(0);
    for (const p of kraft) {
      expect(p.deloadWeek).toBeNull();
      expect(p.setsStart).toBe(4);
      expect(p.setsEnd).toBe(4);
    }
  });
});

describe('Vorlage "Wiederaufbau nach Fasten"', () => {
  const vorlage = journeyTemplateSeeds.find((t) => t.key === "refeed_rebuild");

  it("steht direkt hinter dem Wiedereinstieg", () => {
    const i = journeyTemplateSeeds.findIndex((t) => t.key === "refeed_rebuild");
    const j = journeyTemplateSeeds.findIndex((t) => t.key === "reentry_build");
    expect(i).toBe(j + 1);
  });

  it("faehrt die Rampe 0.65 / 0.80 / 0.95 / 1.00 ueber vier Wochen", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    expect(vorlage.phases.map((p) => p.loadFactor)).toEqual([
      0.65, 0.8, 0.95, 1,
    ]);
    expect(vorlage.phases.map((p) => p.weeks)).toEqual([1, 1, 1, 1]);
  });

  it("plant keinen Deload ein - die Journey ist selbst die Rampe", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    for (const p of vorlage.phases) {
      expect(p.deloadWeek).toBeNull();
    }
  });

  it("benennt den Verhaltensunterschied in der Beschreibung", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    // Der Nutzer waehlt die Vorlage anhand dieser Texte: dass die Journey das
    // Gewicht vorgibt, muss dort stehen und nicht zwischen den Zeilen.
    expect(vorlage.summary).toContain("65");
    expect(vorlage.summary).toContain("80");
    expect(vorlage.summary).toContain("95");
    expect(vorlage.summary.length).toBeGreaterThan(200);
  });
});
