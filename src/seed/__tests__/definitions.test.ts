import { describe, it, expect } from "vitest";
import {
  buildSeedPhase,
  phaseTypeByKey,
  journeyTemplateSeeds,
  phaseTypeSeeds,
} from "@/seed/definitions";
import { buildPhaseFromType } from "@/engine/phaseBuild";
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

  it("gibt jeder Lastliste gueltige Anteile - eine Zeile je Phasenwoche", () => {
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        const plan = buildSeedPhase(p).loadPlan;
        if (plan === null) continue;
        expect(plan.map((w) => w.week)).toEqual(plan.map((_, i) => i + 1));
        expect(plan).toHaveLength(buildSeedPhase(p).weeks);
        for (const w of plan) {
          expect(Number.isFinite(w.loadPct)).toBe(true);
          expect(w.loadPct).toBeGreaterThan(0);
          expect(w.loadPct).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("laesst alle bestehenden Vorlagen ohne Lastvorgabe", () => {
    const bestand = journeyTemplateSeeds.filter(
      (t) => t.key !== "refeed_rebuild",
    );
    // Schutz davor, dass der Filter irgendwann ins Leere greift.
    expect(bestand.length).toBe(journeyTemplateSeeds.length - 1);
    for (const t of bestand) {
      for (const p of t.phases) {
        expect(buildSeedPhase(p).loadPlan).toBeNull();
      }
    }
  });

  it("nennt nur Bausteine, die es gibt", () => {
    const keys = new Set(phaseTypeSeeds.map((t) => t.key));
    for (const t of journeyTemplateSeeds) {
      for (const p of t.phases) {
        expect(keys.has(p.type)).toBe(true);
      }
    }
  });
});

describe("Wochenplan der Vorlagen-Phasen", () => {
  const alle = journeyTemplateSeeds.flatMap((t) => t.phases).map(buildSeedPhase);

  it("gibt jeder Kraft-, Schnellkraft- und Testphase einen Plan ueber alle Wochen", () => {
    const geplant = alle.filter((p) =>
      ["strength", "power", "test"].includes(p.focus),
    );
    expect(geplant.length).toBeGreaterThan(0);
    for (const p of geplant) {
      expect(p.weekPlan).not.toBeNull();
      expect(p.weekPlan).toHaveLength(p.weeks);
      expect(p.planBuilder).not.toBeNull();
    }
  });

  it("laesst alle uebrigen Phasen beim Coach", () => {
    const frei = alle.filter(
      (p) => !["strength", "power", "test"].includes(p.focus),
    );
    for (const p of frei) {
      expect(p.weekPlan).toBeNull();
      expect(p.planBuilder).toBeNull();
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

  it("besteht aus zwei Bausteinen: Wiederaufbau, dann Test/Peak", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    // Beide Phasen tragen den Namen ihres Bausteins - die Eigennamen "Tasten",
    // "Reaktivieren", "Anschluss" und "Standort" sind mit Schritt 7 entfallen.
    const phasen = vorlage.phases.map(buildSeedPhase);
    expect(phasen.map((p) => [p.name, p.focus, p.weeks])).toEqual([
      ["Wiederaufbau", "rebuild", 3],
      ["Test/Peak", "test", 1],
    ]);
  });

  it("faehrt die Rampe 0.65 / 0.80 / 0.95 ueber die ersten drei Wochen", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    // Die Rampe steckt jetzt im Block statt in drei Ein-Wochen-Phasen. Die
    // Testwoche gibt nichts mehr vor: ab dort steuert der Coach wieder normal.
    expect(vorlage.phases.map((p) => buildSeedPhase(p).loadPlan)).toEqual([
      [
        { week: 1, loadPct: 0.65 },
        { week: 2, loadPct: 0.8 },
        { week: 3, loadPct: 0.95 },
      ],
      null,
    ]);
  });

  it("laeuft ueber vier Wochen und steigert vorsichtig", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    const phasen = vorlage.phases.map(buildSeedPhase);
    // Die Beschreibung nennt vier Wochen - drei Aufbauwochen plus Testwoche.
    expect(phasen.reduce((summe, p) => summe + p.weeks, 0)).toBe(4);
    // Ohne careful waere die schonende Steigerung der ersten Wochen die vierte,
    // unbeabsichtigte Abweichung vom bisherigen Stand gewesen.
    expect(phasen.map((p) => p.careful)).toEqual([true, false]);
  });

  it("plant keinen Deload ein - die Journey ist selbst die Rampe", () => {
    expect(vorlage).toBeDefined();
    if (vorlage === undefined) return;
    for (const p of vorlage.phases.map(buildSeedPhase)) {
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

describe("Baustein Wiederaufbau", () => {
  const baustein = phaseTypeByKey("rebuild");

  it("faehrt von 65 auf 95 Prozent - in drei Wochen ueber 80", () => {
    expect(buildPhaseFromType(baustein).loadPlan).toEqual([
      { week: 1, loadPct: 0.65 },
      { week: 2, loadPct: 0.8 },
      { week: 3, loadPct: 0.95 },
    ]);
  });

  it("verteilt die Stufen ueber jede erlaubte Wochenzahl neu", () => {
    const prozente = (weeks: number): number[] =>
      (buildPhaseFromType(baustein, { weeks }).loadPlan ?? []).map((w) =>
        Math.round(w.loadPct * 100),
      );
    expect(prozente(4)).toEqual([65, 75, 85, 95]);
    expect(prozente(6)).toEqual([65, 71, 77, 83, 89, 95]);
  });

  it("laesst mindestens drei Wochen zu - zwei waeren ein Sprung", () => {
    expect(baustein.weeksMin).toBe(3);
    expect(baustein.weeksDefault).toBe(3);
  });

  it("steigert vorsichtig und ohne eigene Wochenliste", () => {
    const phase = buildPhaseFromType(baustein);
    // Der einzige gemischte Baustein: die Last kommt aus der Liste, Saetze und
    // Wiederholungen bleiben beim Coach.
    expect(phase.careful).toBe(true);
    expect(phase.weekPlan).toBeNull();
    expect(phase.planBuilder).toBeNull();
    expect(phase.loadBuilder).toBe("rebuild_ramp");
    // Der Block ist selbst die Entlastung.
    expect(phase.deloadWeek).toBeNull();
  });
});
