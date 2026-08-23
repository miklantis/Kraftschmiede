// Der Abgleichstest (Konzept-Bausteine-Datenstruktur, Abschnitt 12).
//
// Solange die Rechnung im Code steht und die Werte in der Datenbank, bleibt eine
// Naht: Die Bausteine-Tabelle sagt "dieser Baustein laeuft ueber die Bauregel
// Kraftleiter" - ob es diese Bauregel gibt und was sie tut, weiss sie nicht.
// Dieser Test schliesst die Naht und schlaegt fehl, sobald eine Seite vergessen
// wird.
//
// Die beiden wichtigsten Punkte sind die letzten: Die Vorlagen, die der Seed aus
// den Bausteinen erzeugt, muessen Feld fuer Feld dem entsprechen, was heute in
// der Datenbank steht. Damit wird aus "das sollte nichts aendern" ein "das
// aendert nachweislich nichts".

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  LOAD_BUILDERS,
  PLAN_BUILDERS,
  buildPhaseFromType,
  cappedDeloadWeek,
} from "@/engine";
import {
  buildSeedPhase,
  journeyTemplateSeeds,
  phaseTypeSeeds,
  seedPhaseLoadFactor,
} from "@/seed/definitions";
import { focusEnum, phaseTypeKeyEnum } from "@/schemas";

function migration(datei: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../supabase/migrations/${datei}`, import.meta.url)),
    "utf8",
  );
}

/** Erste `check (<spalte> in ('a','b',...))`-Liste einer Migration. */
function checkListe(sql: string, spalte: string): string[] {
  const treffer = new RegExp(
    `check\\s*\\(\\s*${spalte}\\s+in\\s*\\(([^)]*)\\)`,
    "i",
  ).exec(sql);
  if (treffer === null) throw new Error(`Keine CHECK-Liste fuer ${spalte}`);
  return [...treffer[1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

describe("Abgleich 1: die Schluessel stehen ueberall gleich", () => {
  const seedKeys = phaseTypeSeeds.map((b) => b.key).sort();

  it("deckt sich mit dem Zod-Enum der Baustein-Schluessel", () => {
    expect(seedKeys).toEqual([...phaseTypeKeyEnum.options].sort());
  });

  it("deckt sich mit der CHECK-Liste der Bausteine-Tabelle", () => {
    const sql = migration("0043_bausteine_phasentypen.sql");
    expect(checkListe(sql, "key").sort()).toEqual(seedKeys);
  });

  it("deckt sich bis auf den Wiederaufbau mit den Fokus-Werten der Phasen", () => {
    // `rebuild` existiert bis Schritt 4 nur als Baustein; als Phasen-Fokus kommt
    // er dort dazu, dann fallen beide Listen zusammen.
    const sql = migration("0001_initial_schema.sql");
    const check = checkListe(sql, "focus").sort();
    expect(check).toEqual([...focusEnum.options].sort());
    expect(seedKeys).toEqual([...check, "rebuild"].sort());
  });
});

describe("Abgleich 2: jede genannte Bauregel gibt es auch", () => {
  it("nennt nur Wochenlisten-Bauregeln, die der Code kennt", () => {
    for (const b of phaseTypeSeeds) {
      if (b.planBuilder === null) continue;
      expect(PLAN_BUILDERS as readonly string[], b.key).toContain(b.planBuilder);
    }
  });

  it("nennt nur Lastlisten-Bauregeln, die der Code kennt", () => {
    for (const b of phaseTypeSeeds) {
      if (b.loadBuilder === null) continue;
      expect(LOAD_BUILDERS as readonly string[], b.key).toContain(b.loadBuilder);
    }
  });

  it("laesst keine Bauregel im Code ohne Baustein zurueck", () => {
    const genutztePlaene = new Set(
      phaseTypeSeeds.map((b) => b.planBuilder).filter((v) => v !== null),
    );
    for (const builder of PLAN_BUILDERS) {
      expect(genutztePlaene, builder).toContain(builder);
    }
    const genutzteLasten = new Set(
      phaseTypeSeeds.map((b) => b.loadBuilder).filter((v) => v !== null),
    );
    for (const builder of LOAD_BUILDERS) {
      expect(genutzteLasten, builder).toContain(builder);
    }
  });
});

describe("Abgleich 4: die Grenzen halten ueber jede erlaubte Wochenzahl", () => {
  it("legt bei keiner erlaubten Wochenzahl eine Entlastung ans Phasenende", () => {
    for (const b of phaseTypeSeeds) {
      for (let weeks = b.weeksMin; weeks <= b.weeksMax; weeks++) {
        const phase = buildPhaseFromType(b, { weeks });
        if (phase.deloadWeek === null) continue;
        expect(phase.deloadWeek, `${b.key}/${weeks}`).toBeGreaterThanOrEqual(1);
        // Nie die letzte Woche: sonst endet die Phase auf einer Absenkung.
        expect(phase.deloadWeek, `${b.key}/${weeks}`).toBeLessThan(weeks);
      }
    }
  });

  it("nimmt eine zu spaete Entlastung auf die vorletzte Woche zurueck", () => {
    // Hypertrophie startet mit Entlastung in Woche 4; auf drei Wochen gestellt
    // rutscht sie auf Woche 2, unter drei Wochen entfaellt sie ganz.
    expect(cappedDeloadWeek(4, 5)).toBe(4);
    expect(cappedDeloadWeek(4, 3)).toBe(2);
    expect(cappedDeloadWeek(4, 2)).toBeNull();
    expect(cappedDeloadWeek(null, 6)).toBeNull();
  });

  it("gibt jeder gebauten Phase eine Wochenzahl im erlaubten Bereich", () => {
    for (const b of phaseTypeSeeds) {
      const phase = buildPhaseFromType(b);
      expect(phase.weeks, b.key).toBeGreaterThanOrEqual(b.weeksMin);
      expect(phase.weeks, b.key).toBeLessThanOrEqual(b.weeksMax);
    }
  });
});

describe("Abgleich 5: die Bauart deckt sich mit der Liste", () => {
  const alle = journeyTemplateSeeds.flatMap((t) => t.phases).map(buildSeedPhase);

  it("gibt genau den Phasen mit Wochenliste einen plan_builder", () => {
    for (const p of alle) {
      expect(p.planBuilder !== null, p.name).toBe(p.weekPlan !== null);
    }
  });

  it("baut ueber jede erlaubte Wochenzahl dieselbe Deckung", () => {
    for (const b of phaseTypeSeeds) {
      for (let weeks = b.weeksMin; weeks <= b.weeksMax; weeks++) {
        const phase = buildPhaseFromType(b, { weeks });
        expect(phase.planBuilder !== null, `${b.key}/${weeks}`).toBe(
          phase.weekPlan !== null,
        );
        // Die Liste ist so lang wie die Phase - sonst faellt sie hinten ab.
        if (phase.weekPlan !== null) {
          expect(phase.weekPlan, `${b.key}/${weeks}`).toHaveLength(weeks);
        }
      }
    }
  });
});

// Abgleich 6 und 7: der Bestand, Feld fuer Feld.
//
// Was hier steht, ist der Stand der Live-Datenbank vom 22.08.2026 - dieselben
// Werte tragen die Vorlage "Wiedereinstieg & Aufbau" und die daraus gestartete
// laufende Journey. Die einzige gewollte Abweichung ist der Name der letzten
// Phase: "Uebergang / Test" heisst kuenftig ueberall "Test/Peak" (Migration
// 0045). Verschiebt sich sonst irgendetwas, faellt dieser Test um.
interface Bestand {
  name: string;
  focus: string;
  weeks: number;
  setsStart: number;
  setsEnd: number;
  deloadWeek: number | null;
  repTargetMin: number | null;
  repTargetMax: number | null;
  loadFactor: number;
  hatPlan: boolean;
  planBuilder: string | null;
  careful: boolean;
}

const BESTAND: Record<string, Bestand[]> = {
  reentry_build: [
    { name: "Wiedereinstieg", focus: "reentry", weeks: 2, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 5, repTargetMax: 8, loadFactor: 1, hatPlan: false, planBuilder: null, careful: true },
    { name: "Hypertrophie", focus: "hypertrophy", weeks: 5, setsStart: 2, setsEnd: 6, deloadWeek: 4, repTargetMin: 8, repTargetMax: 12, loadFactor: 1, hatPlan: false, planBuilder: null, careful: false },
    { name: "Maximalkraft", focus: "strength", weeks: 5, setsStart: 4, setsEnd: 4, deloadWeek: null, repTargetMin: 4, repTargetMax: 6, loadFactor: 1, hatPlan: true, planBuilder: "strength_ladder", careful: false },
    { name: "Test/Peak", focus: "test", weeks: 2, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 2, repTargetMax: 4, loadFactor: 1, hatPlan: true, planBuilder: "test", careful: false },
  ],
  refeed_rebuild: [
    { name: "Tasten", focus: "reentry", weeks: 1, setsStart: 2, setsEnd: 2, deloadWeek: null, repTargetMin: 8, repTargetMax: 10, loadFactor: 0.65, hatPlan: false, planBuilder: null, careful: true },
    { name: "Reaktivieren", focus: "reentry", weeks: 1, setsStart: 3, setsEnd: 3, deloadWeek: null, repTargetMin: 6, repTargetMax: 10, loadFactor: 0.8, hatPlan: false, planBuilder: null, careful: true },
    { name: "Anschluss", focus: "hypertrophy", weeks: 1, setsStart: 3, setsEnd: 4, deloadWeek: null, repTargetMin: 6, repTargetMax: 10, loadFactor: 0.95, hatPlan: false, planBuilder: null, careful: false },
    { name: "Standort", focus: "test", weeks: 1, setsStart: 2, setsEnd: 3, deloadWeek: null, repTargetMin: 3, repTargetMax: 6, loadFactor: 1, hatPlan: true, planBuilder: "test", careful: false },
  ],
};

describe("Abgleich 6: der neue Seed verschiebt nichts", () => {
  it("erzeugt genau die Vorlagen, die es heute gibt", () => {
    expect(journeyTemplateSeeds.map((t) => t.key).sort()).toEqual(
      Object.keys(BESTAND).sort(),
    );
  });

  for (const t of journeyTemplateSeeds) {
    it(`trifft "${t.name}" Feld fuer Feld`, () => {
      const erwartet = BESTAND[t.key]!;
      const gebaut = t.phases.map((p) => {
        const b = buildSeedPhase(p);
        return {
          name: b.name,
          focus: b.focus,
          weeks: b.weeks,
          setsStart: b.setsStart,
          setsEnd: b.setsEnd,
          deloadWeek: b.deloadWeek,
          repTargetMin: b.repTargetMin,
          repTargetMax: b.repTargetMax,
          loadFactor: seedPhaseLoadFactor(p),
          hatPlan: b.weekPlan !== null,
          planBuilder: b.planBuilder,
          careful: b.careful,
        };
      });
      expect(gebaut).toEqual(erwartet);
    });
  }
});

describe("Abgleich 7: die laufende Journey bleibt unberuehrt", () => {
  // Die laufende Journey "Rueckkehr 2026" stammt aus "Wiedereinstieg & Aufbau"
  // und traegt ihre Werte als Kopie. Deckt sich der Seed mit dem Bestand, gilt
  // das auch fuer sie - bis auf den Phasennamen, den Migration 0045 nachzieht.
  const phasen = journeyTemplateSeeds
    .find((t) => t.key === "reentry_build")!
    .phases.map(buildSeedPhase);

  it("laesst nur den Wiedereinstieg vorsichtig steigern", () => {
    expect(phasen.filter((p) => p.careful).map((p) => p.name)).toEqual([
      "Wiedereinstieg",
    ]);
  });

  it("gibt der Testphase eine Kraftphase als Anker davor", () => {
    const test = phasen.findIndex((p) => p.planBuilder === "test");
    const kraft = phasen.findIndex((p) => p.planBuilder === "strength_ladder");
    expect(kraft).toBeGreaterThanOrEqual(0);
    expect(kraft).toBeLessThan(test);
  });

  it("benennt die letzte Phase nach ihrem Baustein", () => {
    expect(phasen.at(-1)?.name).toBe("Test/Peak");
  });
});
