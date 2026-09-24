// Gleichlauf der Tagestexte des Fastenbegleiters: Neue Konten bekommen sie ueber
// den Seed, Bestandskonten ueber Migration 0066. Beide Seiten muessen denselben
// Wortlaut tragen, sonst sehen zwei Konten am selben Fastentag Verschiedenes.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { fastenTagSeeds } from "@/seed/fastenTage";

const migration = readFileSync(
  fileURLToPath(
    new URL("../../../supabase/migrations/0066_fasten_tage.sql", import.meta.url),
  ),
  "utf8",
);

// So steht ein Text als SQL-Literal in der Migration.
const sql = (s: string): string => "'" + s.replace(/'/g, "''") + "'";

describe("Tagestexte des Fastenbegleiters", () => {
  it("deckt die Fastentage 1 bis 21 lueckenlos und ohne Doppelte ab", () => {
    expect(fastenTagSeeds.map((t) => t.tag)).toEqual(
      Array.from({ length: 21 }, (_, i) => i + 1),
    );
  });

  it("hat an jedem Tag Titel, Texte und Stichpunkte", () => {
    for (const t of fastenTagSeeds) {
      expect(t.titel.trim(), `Tag ${t.tag}`).not.toBe("");
      expect(t.koerper.trim(), `Tag ${t.tag}`).not.toBe("");
      expect(t.gefuehl.trim(), `Tag ${t.tag}`).not.toBe("");
      expect(t.wichtig.length, `Tag ${t.tag}`).toBeGreaterThan(0);
    }
  });

  it("steht mit demselben Wortlaut in Migration 0066", () => {
    for (const t of fastenTagSeeds) {
      const zeile =
        `(${t.tag}, ${sql(t.titel)},\n   ${sql(t.koerper)},\n   ${sql(t.gefuehl)},\n` +
        `   array[${t.wichtig.map(sql).join(",\n         ")}])`;
      expect(migration, `Tag ${t.tag}`).toContain(zeile);
    }
  });
});
