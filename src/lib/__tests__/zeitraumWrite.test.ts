import { describe, it, expect } from "vitest";
import { createMemoryZeitraumStore } from "../zeitraumStore";
import { writeZeitraumAction } from "../zeitraumWrite";
import type { ZeitraumFelder } from "../zeitraumWrite";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff mit welchen
// Feldern ausgeloest wird.

function felder(over: Partial<ZeitraumFelder> = {}): ZeitraumFelder {
  return {
    typ: "urlaub",
    startDatum: "2026-07-01",
    endDatum: "2026-07-14",
    name: "Sommer",
    notiz: "kein Training",
    ...over,
  };
}

describe("writeZeitraumAction", () => {
  it("legt einen Zeitraum mit Nutzer-Kennung an", async () => {
    const { store, log } = createMemoryZeitraumStore();
    await writeZeitraumAction(store, "u1", { type: "add", felder: felder() });
    expect(log.inserted).toEqual([
      {
        user_id: "u1",
        typ: "urlaub",
        start_datum: "2026-07-01",
        end_datum: "2026-07-14",
        name: "Sommer",
        notiz: "kein Training",
      },
    ]);
    expect(log.patches).toHaveLength(0);
    expect(log.deleted).toHaveLength(0);
  });

  it("legt einen laufenden Zeitraum ohne Enddatum an", async () => {
    const { store, log } = createMemoryZeitraumStore();
    await writeZeitraumAction(store, "u1", {
      type: "add",
      felder: felder({ endDatum: null, name: null, notiz: null }),
    });
    expect(log.inserted[0]).toMatchObject({
      end_datum: null,
      name: null,
      notiz: null,
    });
  });

  it("aendert einen Zeitraum ohne die Nutzer-Kennung mitzuschreiben", async () => {
    const { store, log } = createMemoryZeitraumStore();
    await writeZeitraumAction(store, "u1", {
      type: "update",
      id: "z1",
      felder: felder({ typ: "krankheit", endDatum: null }),
    });
    expect(log.patches).toEqual([
      {
        id: "z1",
        patch: {
          typ: "krankheit",
          start_datum: "2026-07-01",
          end_datum: null,
          name: "Sommer",
          notiz: "kein Training",
        },
      },
    ]);
    expect(log.inserted).toHaveLength(0);
  });

  it("loescht einen Zeitraum", async () => {
    const { store, log } = createMemoryZeitraumStore();
    await writeZeitraumAction(store, "u1", { type: "delete", id: "z1" });
    expect(log.deleted).toEqual(["z1"]);
    expect(log.inserted).toHaveLength(0);
    expect(log.patches).toHaveLength(0);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryZeitraumStore();
    await expect(
      writeZeitraumAction(store, null, { type: "add", felder: felder() }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.inserted).toHaveLength(0);
  });
});
