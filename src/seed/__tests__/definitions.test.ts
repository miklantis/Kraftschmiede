import { describe, it, expect } from "vitest";
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

describe("Periodisierung der Vorlagen", () => {
  // Rule 1: In Kraftphasen arbeitet nur noch das Gewicht, nicht die Satzzahl.
  it("faehrt Kraft- und Power-Phasen mit konstanter Satzzahl", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        if (p.focus === "strength" || p.focus === "power") {
          expect(`${t.key}/${p.name}: ${p.setsStart}-${p.setsEnd}`).toBe(
            `${t.key}/${p.name}: ${p.setsStart}-${p.setsStart}`,
          );
        }
      }
    }
  });

  // Rule 2: Vor einem Test soll das Volumen sinken, nicht steigen.
  it("laesst das Volumen in Testphasen nicht ansteigen", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        if (p.focus === "test") {
          expect(p.setsEnd).toBeLessThanOrEqual(p.setsStart);
        }
      }
    }
  });

  // Rule 3: Hypertrophie darf rampen, aber ohne Spruenge.
  it("haelt die Satz-Rampe der Hypertrophiephasen flach", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        if (p.focus === "hypertrophy") {
          expect(p.setsEnd - p.setsStart).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  // Rule 4: klassischer 3:1-Zuschnitt - hoechstens vier Aufbauwochen am Stueck.
  it("laesst keinen Block laenger als vier Wochen ohne Entlastung laufen", () => {
    const belastend = ["hypertrophy", "strength", "power", "endurance"];
    for (const t of journeyTemplateSeeds) {
      let amStueck = 0;
      let laengste = 0;
      for (const p of t.phases) {
        for (let w = 1; w <= p.weeks; w++) {
          const entlastung = p.deloadWeek === w || !belastend.includes(p.focus);
          amStueck = entlastung ? 0 : amStueck + 1;
          laengste = Math.max(laengste, amStueck);
        }
      }
      expect(`${t.key}: ${laengste}`).toBe(`${t.key}: ${Math.min(laengste, 4)}`);
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

// Lastrampe der Phasen (Issue #200): Kraft-, Power- und Testphasen geben die
// Last ueber die Wochen vor, Hypertrophie und Kraftausdauer bleiben beim Coach.
describe("journeyTemplateSeeds – Lastrampe", () => {
  const LASTGESTEUERT = ["strength", "power", "test"];

  it("plant die Last nur in Kraft-, Power- und Testphasen", () => {
    for (const t of journeyTemplateSeeds) {
      // "Wiederaufbau nach Fasten" arbeitet mit dem Lastfaktor und bleibt aussen
      // vor - beide Mechanismen duerfen nie an derselben Phase haengen.
      if (t.key === "refeed_rebuild") continue;
      for (const p of t.phases) {
        const plant = p.intensityStart != null && p.intensityEnd != null;
        if (!LASTGESTEUERT.includes(p.focus)) {
          expect(
            plant,
            `${t.key}/${p.name} (${p.focus}) darf keine Lastrampe tragen`,
          ).toBe(false);
        }
      }
    }
  });

  it("laesst Lastfaktor und Lastrampe nie an derselben Phase haengen", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        const plant = p.intensityStart != null && p.intensityEnd != null;
        if (plant) {
          expect(p.loadFactor, `${t.key}/${p.name}`).toBe(1);
        }
      }
    }
  });

  it("laesst die Vorlage 'Wiederaufbau nach Fasten' unberuehrt", () => {
    const refeed = journeyTemplateSeeds.find((t) => t.key === "refeed_rebuild");
    expect(refeed).toBeDefined();
    if (refeed === undefined) return;
    for (const p of refeed.phases) {
      expect(p.intensityStart).toBeNull();
      expect(p.intensityEnd).toBeNull();
    }
  });

  it("steigert die Last ueber die Phase und bleibt im plausiblen Korridor", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        if (p.intensityStart == null || p.intensityEnd == null) continue;
        expect(p.intensityEnd, `${t.key}/${p.name}`).toBeGreaterThanOrEqual(
          p.intensityStart,
        );
        // Unter 70 Prozent ist es keine Kraftphase mehr, ueber 95 Prozent
        // laesst sich kein Satz mit mehreren Wiederholungen mehr sauber fahren.
        expect(p.intensityStart, `${t.key}/${p.name}`).toBeGreaterThanOrEqual(70);
        expect(p.intensityEnd, `${t.key}/${p.name}`).toBeLessThanOrEqual(95);
      }
    }
  });

  it("faehrt engere Wiederholungsbaender schwerer", () => {
    // Je enger und niedriger das Band, desto hoeher die geplante Last - sonst
    // passen Band und Prozentangabe nicht zusammen.
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        if (p.intensityStart == null) continue;
        if (p.repTargetMax <= 4) {
          expect(p.intensityStart, `${t.key}/${p.name}`).toBeGreaterThanOrEqual(85);
        } else if (p.repTargetMax <= 5) {
          expect(p.intensityStart, `${t.key}/${p.name}`).toBeGreaterThanOrEqual(80);
        }
      }
    }
  });

  it("gibt jeder Kraft- und Testphase ausserhalb des Lastfaktors eine Rampe", () => {
    for (const t of journeyTemplateSeeds) {
      if (t.key === "refeed_rebuild") continue;
      for (const p of t.phases) {
        if (!LASTGESTEUERT.includes(p.focus)) continue;
        expect(
          p.intensityStart,
          `${t.key}/${p.name} braucht eine Lastrampe`,
        ).not.toBeNull();
      }
    }
  });
});
