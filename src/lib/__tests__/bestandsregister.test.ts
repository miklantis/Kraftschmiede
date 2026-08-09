import { describe, it, expect } from "vitest";
import { z } from "zod";
import * as schemas from "@/schemas";
import {
  BESTANDSREGISTER,
  EINFUEGE_REIHENFOLGE,
  LOESCH_REIHENFOLGE,
  type BestandsEintrag,
} from "@/lib/bestandsregister";
import {
  buildExport,
  serializeExport,
  type RawExportData,
  type Row,
} from "@/lib/exportData";
import { parseRestore } from "@/lib/restoreData";

// Das Register ist die einzige Stelle, an der die Tabellen des Bestands stehen.
// Diese Tests sind die Gegenprobe: Register gegen die Zod-Schemas, die
// abgeleiteten Reihenfolgen gegen die Fremdschluessel-Tiefe und ein Rundlauf
// Export -> Wiederherstellen ohne Datenbank.

describe("Bestandsregister – Deckung mit den Schemas", () => {
  it("verweist je Tabelle auf ein vorhandenes Row-Schema", () => {
    const barrel = schemas as unknown as Record<string, unknown>;
    for (const e of BESTANDSREGISTER) {
      expect(barrel[e.schema], `${e.tabelle} -> ${e.schema}`).toBeInstanceOf(
        z.ZodObject,
      );
    }
  });

  it("laesst kein Row-Schema aus src/schemas unberuecksichtigt", () => {
    const ausSchemas = Object.keys(schemas)
      .filter((name) => name.endsWith("Row"))
      .sort();
    const ausRegister = BESTANDSREGISTER.map((e) => e.schema).sort();
    // Faellt eine neue Tabelle im Register aus, schlaegt genau dieser Test an.
    expect(ausRegister).toEqual(ausSchemas);
  });

  it("fuehrt jede Tabelle und jeden Export-Schluessel nur einmal", () => {
    const tabellen = BESTANDSREGISTER.map((e) => e.tabelle);
    const keys = BESTANDSREGISTER.map((e) => e.key);
    expect(new Set(tabellen).size).toBe(tabellen.length);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("Bestandsregister – abgeleitete Reihenfolgen", () => {
  it("fuegt Eltern vor Kindern ein (Tiefe steigt monoton)", () => {
    const tiefen = EINFUEGE_REIHENFOLGE.map(
      (t) =>
        (BESTANDSREGISTER as readonly BestandsEintrag[]).find(
          (e) => e.tabelle === t,
        )?.tiefe ?? -1,
    );
    const sortiert = [...tiefen].sort((a, b) => a - b);
    expect(tiefen).toEqual(sortiert);
  });

  it("loescht in exakt umgekehrter Reihenfolge", () => {
    expect([...LOESCH_REIHENFOLGE].reverse()).toEqual([
      ...EINFUEGE_REIHENFOLGE,
    ]);
  });

  it("enthaelt alle Listen-Tabellen, aber nicht settings", () => {
    const erwartet = BESTANDSREGISTER.filter((e) => !e.einzelzeile).map(
      (e) => e.tabelle,
    );
    expect([...EINFUEGE_REIHENFOLGE].sort()).toEqual([...erwartet].sort());
    expect(EINFUEGE_REIHENFOLGE).not.toContain("settings");
    expect(LOESCH_REIHENFOLGE).not.toContain("settings");
  });
});

// Je Tabelle genau eine Zeile, erkennbar an "marke". Die drei Tabellen rund um
// die Einheiten brauchen zusaetzlich ihre Verknuepfung, damit der Export sie
// schachteln kann.
function zeile(tabelle: string): Row {
  const basis: Row = { id: `${tabelle}-1`, marke: tabelle };
  if (tabelle === "sessions") return { ...basis, date: "2026-06-01" };
  if (tabelle === "session_exercises")
    return { ...basis, session_id: "sessions-1", position: 1 };
  if (tabelle === "sets")
    return { ...basis, session_exercise_id: "session_exercises-1", position: 1 };
  return basis;
}

function rohBestand(): RawExportData {
  const roh: Record<string, Row[] | Row | null> = {};
  for (const e of BESTANDSREGISTER) {
    roh[e.key] = e.einzelzeile ? zeile(e.tabelle) : [zeile(e.tabelle)];
  }
  return roh as RawExportData;
}

describe("Rundlauf Export -> Wiederherstellen", () => {
  it("bringt jede Tabelle des Registers unveraendert zurueck", () => {
    const text = serializeExport(buildExport(rohBestand(), new Date("2026-06-01T10:00:00Z")));
    const { tables } = parseRestore(text);

    for (const e of BESTANDSREGISTER) {
      if (e.einzelzeile) {
        const einzel = tables[e.tabelle as "settings"];
        expect(einzel?.marke, e.tabelle).toBe(e.tabelle);
        continue;
      }
      const rows = (tables as unknown as Record<string, Row[]>)[e.tabelle];
      expect(rows, `${e.tabelle} fehlt nach dem Rundlauf`).toHaveLength(1);
      expect(rows[0]?.marke, e.tabelle).toBe(e.tabelle);
      expect(rows[0]?.id, e.tabelle).toBe(`${e.tabelle}-1`);
    }
  });

  it("verliert die Verknuepfung der Einheiten nicht", () => {
    const text = serializeExport(buildExport(rohBestand()));
    const { tables, preview } = parseRestore(text);
    expect(tables.session_exercises[0]?.session_id).toBe("sessions-1");
    expect(tables.sets[0]?.session_exercise_id).toBe("session_exercises-1");
    expect(preview.sessions).toBe(1);
    expect(preview.sets).toBe(1);
  });
});
