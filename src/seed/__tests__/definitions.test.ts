import { describe, it, expect } from "vitest";
import { buildWeekPlan } from "@/engine/weekPlan";
import { journeyTemplateSeeds, phaseTypeSeeds } from "@/seed/definitions";
import { phaseTypeInsert } from "@/schemas";

// Die Bausteine sind ab hier die Quelle fuer die Werte einer Phase. Diese Tests
// halten die Zusagen des Konzepts (Abschnitte 3 bis 5) an genau der Stelle fest,
// an der die Werte gepflegt werden - dieselben Regeln stehen als CHECK in
// supabase/migrations/0043_bausteine_phasentypen.sql.

describe("Bausteine im Seed", () => {
  const NUTZER = "00000000-0000-4000-8000-000000000000";

  it("fuehrt acht Bausteine mit eindeutigen Schluesseln", () => {
    expect(phaseTypeSeeds).toHaveLength(8);
    const keys = phaseTypeSeeds.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("rebuild");
  });

  it("ergibt je Baustein eine gueltige Schreib-Form", () => {
    for (const b of phaseTypeSeeds) {
      const zeile = {
        user_id: NUTZER,
        key: b.key,
        name: b.name,
        summary: b.summary,
        control: b.control,
        plan_builder: b.planBuilder,
        load_builder: b.loadBuilder,
        careful: b.careful,
        weeks_min: b.weeksMin,
        weeks_max: b.weeksMax,
        weeks_default: b.weeksDefault,
        sets_start_default: b.setsStartDefault,
        sets_end_default: b.setsEndDefault,
        sets_max: b.setsMax,
        sets_locked: b.setsLocked,
        rep_min_default: b.repMinDefault,
        rep_max_default: b.repMaxDefault,
        rep_bound_min: b.repBoundMin,
        rep_bound_max: b.repBoundMax,
        rep_band_locked: b.repBandLocked,
        deload_allowed: b.deloadAllowed,
        deload_default: b.deloadDefault,
        load_start_default: b.loadStartDefault,
        load_end_default: b.loadEndDefault,
        placement_hint: b.placementHint,
      };
      expect(phaseTypeInsert.safeParse(zeile).success, b.key).toBe(true);
    }
  });

  it("laesst Steuerweg, Sperren und Bauregel zusammenpassen", () => {
    for (const b of phaseTypeSeeds) {
      // Wer ueber einen Plan laeuft, hat eine Wochenlisten-Bauregel - und umgekehrt.
      expect(b.control === "plan", b.key).toBe(b.planBuilder !== null);
      // Gesperrte Saetze kommen aus der Wochenliste, sonst gibt es keine.
      expect(b.setsLocked, b.key).toBe(b.planBuilder !== null);
      // Ein Band ruht nur dort, wo eine Wochenliste die Wiederholungen vorgibt.
      if (b.repBandLocked) expect(b.planBuilder, b.key).not.toBeNull();
      // Wer eine Lastliste baut, hat Start- und Zielwert - und umgekehrt.
      expect(b.loadStartDefault !== null, b.key).toBe(b.loadBuilder !== null);
      expect(b.loadEndDefault !== null, b.key).toBe(b.loadBuilder !== null);
    }
  });

  it("haelt jeden Vorgabewert innerhalb seiner eigenen Grenzen", () => {
    for (const b of phaseTypeSeeds) {
      expect(b.weeksMin, b.key).toBeGreaterThanOrEqual(1);
      expect(b.weeksDefault, b.key).toBeGreaterThanOrEqual(b.weeksMin);
      expect(b.weeksDefault, b.key).toBeLessThanOrEqual(b.weeksMax);

      expect(b.setsStartDefault, b.key).toBeGreaterThanOrEqual(1);
      expect(b.setsEndDefault, b.key).toBeGreaterThanOrEqual(1);
      expect(b.setsMax, b.key).toBeGreaterThanOrEqual(
        Math.max(b.setsStartDefault, b.setsEndDefault),
      );

      // Band paarig, und der Korridor schliesst es ein.
      expect(b.repMinDefault === null, b.key).toBe(b.repMaxDefault === null);
      expect(b.repBoundMin === null, b.key).toBe(b.repBoundMax === null);
      if (b.repMinDefault !== null && b.repMaxDefault !== null) {
        expect(b.repMinDefault, b.key).toBeLessThanOrEqual(b.repMaxDefault);
        if (b.repBoundMin !== null && b.repBoundMax !== null) {
          expect(b.repBoundMin, b.key).toBeLessThanOrEqual(b.repMinDefault);
          expect(b.repBoundMax, b.key).toBeGreaterThanOrEqual(b.repMaxDefault);
        }
      } else {
        // Ohne Band gibt es auch keinen Korridor.
        expect(b.repBoundMin, b.key).toBeNull();
      }

      if (b.loadStartDefault !== null && b.loadEndDefault !== null) {
        expect(b.loadStartDefault, b.key).toBeGreaterThan(0);
        expect(b.loadStartDefault, b.key).toBeLessThanOrEqual(b.loadEndDefault);
        expect(b.loadEndDefault, b.key).toBeLessThanOrEqual(1);
      }
    }
  });

  it("legt keine Entlastungswoche in die letzte Phasenwoche", () => {
    for (const b of phaseTypeSeeds) {
      if (b.deloadDefault === null) continue;
      // Vorgabe nur, wo eine Entlastung ueberhaupt erlaubt ist.
      expect(b.deloadAllowed, b.key).toBe(true);
      expect(b.deloadDefault, b.key).toBeGreaterThanOrEqual(1);
      // Am Ende wuerde die Entlastung verpuffen: die Phase endet auf einer
      // Absenkung, statt danach wieder Anlauf zu nehmen.
      expect(b.deloadDefault, b.key).toBeLessThan(b.weeksDefault);
    }
  });

  it("gibt genau dem Wiedereinstieg und dem Wiederaufbau die Vorsicht mit", () => {
    const vorsichtig = phaseTypeSeeds
      .filter((b) => b.careful)
      .map((b) => b.key)
      .sort();
    expect(vorsichtig).toEqual(["rebuild", "reentry"]);
  });
});

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
