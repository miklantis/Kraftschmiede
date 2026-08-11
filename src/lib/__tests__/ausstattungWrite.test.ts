import { describe, it, expect } from "vitest";
import { createMemoryAusstattungStore } from "../ausstattungStore";
import { writeAusstattungAction } from "../ausstattungWrite";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff mit welchen
// Feldern ausgeloest wird.

describe("writeAusstattungAction – Inventar", () => {
  it("legt eine Scheibe mit Nutzer-Kennung an", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await writeAusstattungAction(store, "u1", {
      type: "addScheibe",
      gewicht: 2.5,
    });
    expect(log.scheibenInsert).toEqual([{ user_id: "u1", weight: 2.5 }]);
    expect(log.scheibenDeleted).toHaveLength(0);
  });

  it("legt Kettlebell und Kurzhantel jeweils in ihrer eigenen Liste an", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await writeAusstattungAction(store, "u1", {
      type: "addKettlebell",
      gewicht: 16,
    });
    await writeAusstattungAction(store, "u1", {
      type: "addKurzhantel",
      gewicht: 12.5,
    });
    expect(log.kettlebellsInsert).toEqual([{ user_id: "u1", weight: 16 }]);
    expect(log.kurzhantelnInsert).toEqual([{ user_id: "u1", weight: 12.5 }]);
    expect(log.scheibenInsert).toHaveLength(0);
  });

  it("loescht ueber die Id und schreibt sonst nichts", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await writeAusstattungAction(store, "u1", {
      type: "deleteScheibe",
      id: "s1",
    });
    await writeAusstattungAction(store, "u1", {
      type: "deleteKettlebell",
      id: "k1",
    });
    await writeAusstattungAction(store, "u1", {
      type: "deleteKurzhantel",
      id: "d1",
    });
    expect(log.scheibenDeleted).toEqual(["s1"]);
    expect(log.kettlebellsDeleted).toEqual(["k1"]);
    expect(log.kurzhantelnDeleted).toEqual(["d1"]);
    expect(log.scheibenInsert).toHaveLength(0);
  });

  it("legt das Equipment-Tor um", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await writeAusstattungAction(store, "u1", {
      type: "toggleEquipment",
      key: "rings",
      aktiv: true,
    });
    expect(log.equipment).toEqual([{ key: "rings", aktiv: true }]);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await expect(
      writeAusstattungAction(store, null, { type: "addScheibe", gewicht: 5 }),
    ).rejects.toThrow("Nicht angemeldet.");
    await expect(
      writeAusstattungAction(store, null, {
        type: "deleteScheibe",
        id: "s1",
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.scheibenInsert).toHaveLength(0);
    expect(log.scheibenDeleted).toHaveLength(0);
  });
});

describe("writeAusstattungAction – Einstellungen", () => {
  it("aendert die eine Zeile des Nutzers, statt eine zweite anzulegen", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await writeAusstattungAction(store, "u1", {
      type: "updateEinstellungen",
      patch: { rm_formula: "epley" },
    });
    await writeAusstattungAction(store, "u1", {
      type: "updateEinstellungen",
      patch: { weight_step: 1.25 },
    });
    expect(log.einstellungen).toEqual([
      { userId: "u1", patch: { rm_formula: "epley" } },
      { userId: "u1", patch: { weight_step: 1.25 } },
    ]);
  });

  it("reicht das jsonb-Feld als vollstaendiges Objekt durch", async () => {
    const { store, log } = createMemoryAusstattungStore();
    const timers = {
      setRestSec: 90,
      exerciseRestSec: 120,
      autoStart: true,
      sound: false,
      vibrate: true,
    };
    await writeAusstattungAction(store, "u1", {
      type: "updateEinstellungen",
      patch: { timers },
    });
    expect(log.einstellungen[0].patch).toEqual({ timers });
  });

  it("aendert ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryAusstattungStore();
    await expect(
      writeAusstattungAction(store, null, {
        type: "updateEinstellungen",
        patch: { unit: "kg" },
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.einstellungen).toHaveLength(0);
  });
});
