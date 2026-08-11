import { describe, it, expect } from "vitest";
import { createMemoryRestoreStore } from "../restoreStore";
import { writeRestore } from "../restoreWrite";
import {
  BESTANDSREGISTER,
  EINFUEGE_REIHENFOLGE,
  EINZEL_TABELLEN,
  LOESCH_REIHENFOLGE,
} from "../bestandsregister";
import type { RestoreTables } from "../restoreData";
import type { Row } from "../exportData";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff in welcher
// Reihenfolge und mit welchen Zeilen ausgeloest wird. Der Sicherungs-Inhalt
// wird aus dem Bestandsregister aufgebaut, damit keine Tabelle im Test fehlt,
// wenn eine dazukommt.

/** Sicherung mit je einer Zeile pro Tabelle. */
function volleSicherung(): RestoreTables {
  const tables: Record<string, Row[] | Row | null> = {};
  for (const e of BESTANDSREGISTER) {
    tables[e.tabelle] = e.einzelzeile
      ? { id: `${e.tabelle}-1`, user_id: "alt" }
      : [{ id: `${e.tabelle}-1`, user_id: "alt" }];
  }
  return tables as RestoreTables;
}

/** Sicherung ohne jeden Inhalt: alle Listen leer, keine Einzelzeile. */
function leereSicherung(): RestoreTables {
  const tables: Record<string, Row[] | Row | null> = {};
  for (const e of BESTANDSREGISTER) {
    tables[e.tabelle] = e.einzelzeile ? null : [];
  }
  return tables as RestoreTables;
}

describe("writeRestore", () => {
  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryRestoreStore();
    await expect(
      writeRestore(store, null, volleSicherung()),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.ablauf).toHaveLength(0);
  });

  it("leert jede Tabelle des Registers, Kinder vor Eltern", async () => {
    const { store, log } = createMemoryRestoreStore();
    await writeRestore(store, "u1", volleSicherung());
    expect(log.deleted).toEqual([...LOESCH_REIHENFOLGE]);
  });

  it("fuegt Eltern vor Kindern ein", async () => {
    const { store, log } = createMemoryRestoreStore();
    await writeRestore(store, "u1", volleSicherung());
    expect(log.inserted.map((i) => i.table)).toEqual([
      ...EINFUEGE_REIHENFOLGE,
    ]);
  });

  it("loescht erst alles, bevor die erste Zeile eingefuegt wird", async () => {
    const { store, log } = createMemoryRestoreStore();
    await writeRestore(store, "u1", volleSicherung());
    const ersterInsert = log.ablauf.findIndex((s) => s.startsWith("insert:"));
    const letzterDelete = log.ablauf
      .map((s, i) => (s.startsWith("delete:") ? i : -1))
      .reduce((a, b) => Math.max(a, b), -1);
    expect(letzterDelete).toBeLessThan(ersterInsert);
  });

  it("setzt die Nutzer-Kennung je Zeile, id und Fremdschluessel bleiben", async () => {
    const { store, log } = createMemoryRestoreStore();
    const tables = leereSicherung();
    tables.sets = [
      { id: "s1", session_exercise_id: "se1", user_id: "alt", reps: 5 },
    ];
    await writeRestore(store, "u1", tables);
    expect(log.inserted).toEqual([
      {
        table: "sets",
        rows: [
          { id: "s1", session_exercise_id: "se1", user_id: "u1", reps: 5 },
        ],
      },
    ]);
  });

  it("ersetzt die Einstellungen per Upsert statt sie einzufuegen", async () => {
    const { store, log } = createMemoryRestoreStore();
    const tables = leereSicherung();
    tables.settings = { user_id: "alt", einheit: "kg" };
    await writeRestore(store, "u1", tables);
    expect(log.upserted).toEqual([
      { table: "settings", row: { user_id: "u1", einheit: "kg" } },
    ]);
    expect(log.inserted).toHaveLength(0);
    // Einzelzeilen laufen nie ueber die Einfuege-Reihenfolge.
    for (const t of EINZEL_TABELLEN) {
      expect(EINFUEGE_REIHENFOLGE).not.toContain(t);
      expect(LOESCH_REIHENFOLGE).not.toContain(t);
    }
  });

  it("ueberspringt leere Listen und fehlende Einstellungen", async () => {
    const { store, log } = createMemoryRestoreStore();
    await writeRestore(store, "u1", leereSicherung());
    expect(log.deleted).toEqual([...LOESCH_REIHENFOLGE]);
    expect(log.inserted).toHaveLength(0);
    expect(log.upserted).toHaveLength(0);
  });

  it("bricht beim Loeschen mit der Tabelle im Fehlertext ab", async () => {
    const { store, log } = createMemoryRestoreStore({
      deleteTable: "sessions",
      message: "FK verletzt",
    });
    await expect(writeRestore(store, "u1", volleSicherung())).rejects.toThrow(
      "sessions (loeschen): FK verletzt",
    );
    expect(log.inserted).toHaveLength(0);
  });

  it("bricht beim Einfuegen mit der Tabelle im Fehlertext ab", async () => {
    const { store, log } = createMemoryRestoreStore({
      insertTable: "exercises",
      message: "doppelte id",
    });
    await expect(writeRestore(store, "u1", volleSicherung())).rejects.toThrow(
      "exercises (einfuegen): doppelte id",
    );
    // Nach dem Abbruch laeuft kein weiterer Einfuege-Schritt.
    const nachExercises = EINFUEGE_REIHENFOLGE.indexOf("exercises");
    expect(log.inserted.map((i) => i.table)).toEqual(
      EINFUEGE_REIHENFOLGE.slice(0, nachExercises),
    );
    expect(log.upserted).toHaveLength(0);
  });

  it("bricht bei den Einstellungen mit der Tabelle im Fehlertext ab", async () => {
    const { store } = createMemoryRestoreStore({
      upsertTable: "settings",
      message: "kein Recht",
    });
    await expect(writeRestore(store, "u1", volleSicherung())).rejects.toThrow(
      "settings (ersetzen): kein Recht",
    );
  });
});
