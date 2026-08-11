import { describe, it, expect } from "vitest";
import { createMemoryTabellenLeser } from "../tabelleLesen";

// Geprueft wird die Lese-Grundlage selbst: kommt die Abfrage so an, wie der
// Hook sie beschrieben hat (Tabelle, Spalten, Filter, Sortierung, Grenze), und
// wird ein Datenbank-Fehler zu einem Error. Die Hooks darueber bleiben
// ungetestet – dafuer fehlt weiterhin eine Test-Bibliothek fuer React.

const zeitraeume = [
  { id: "a", start_datum: "2026-01-01", created_at: "2026-01-01", typ: "kur" },
  { id: "b", start_datum: "2026-07-01", created_at: "2026-05-01", typ: "urlaub" },
  { id: "c", start_datum: "2026-07-01", created_at: "2026-06-01", typ: "urlaub" },
];

describe("Speicher-Leser", () => {
  it("liefert die Zeilen der angefragten Tabelle", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume });
    const rows = await leser.zeilen<{ id: string }>({ tabelle: "zeitraeume" });
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("liefert eine leere Liste fuer eine unbekannte Tabelle", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume });
    expect(await leser.zeilen({ tabelle: "gibtsnicht" })).toEqual([]);
  });

  it("sortiert mehrstufig, spaetere Stufe entscheidet den Gleichstand", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume });
    const rows = await leser.zeilen<{ id: string }>({
      tabelle: "zeitraeume",
      sortierung: [
        { spalte: "start_datum", absteigend: true },
        { spalte: "created_at", absteigend: true },
      ],
    });
    expect(rows.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("filtert auf Gleichheit", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume });
    const rows = await leser.zeilen<{ id: string }>({
      tabelle: "zeitraeume",
      gleich: { typ: "urlaub" },
    });
    expect(rows.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("begrenzt die Zeilenzahl nach der Sortierung", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume });
    const rows = await leser.zeilen<{ id: string }>({
      tabelle: "zeitraeume",
      sortierung: [{ spalte: "created_at", absteigend: true }],
      grenze: 1,
    });
    expect(rows.map((r) => r.id)).toEqual(["c"]);
  });

  it("liefert bei zeile den ersten Treffer, sonst null", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume });
    const treffer = await leser.zeile<{ id: string }>({
      tabelle: "zeitraeume",
      gleich: { typ: "urlaub" },
    });
    expect(treffer?.id).toBe("b");
    expect(
      await leser.zeile({ tabelle: "zeitraeume", gleich: { typ: "reha" } }),
    ).toBeNull();
  });

  it("protokolliert jede Abfrage unveraendert", async () => {
    const { leser, log } = createMemoryTabellenLeser({ zeitraeume });
    await leser.zeilen({
      tabelle: "zeitraeume",
      spalten: "id, typ",
      sortierung: [{ spalte: "start_datum", absteigend: true }],
    });
    expect(log.abfragen).toEqual([
      {
        tabelle: "zeitraeume",
        spalten: "id, typ",
        sortierung: [{ spalte: "start_datum", absteigend: true }],
      },
    ]);
  });

  it("macht aus einem Datenbank-Fehler einen Error", async () => {
    const { leser } = createMemoryTabellenLeser({ zeitraeume }, "kaputt");
    await expect(leser.zeilen({ tabelle: "zeitraeume" })).rejects.toThrow(
      "kaputt",
    );
    await expect(leser.zeile({ tabelle: "zeitraeume" })).rejects.toThrow(
      "kaputt",
    );
  });
});
