import { describe, it, expect } from "vitest";
import { createMemoryCompositionStore } from "../compositionStore";
import {
  writeCompositionAction,
  writeCompositionMilestoneAction,
} from "../compositionWrite";
import type { CompositionFelder } from "../compositionWrite";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff mit welchen
// Feldern ausgeloest wird. Messungen und Meilensteine teilen sich einen Store,
// deshalb wird nebenbei mitgeprueft, dass der jeweils andere Bereich unberuehrt
// bleibt.

function felder(over: Partial<CompositionFelder> = {}): CompositionFelder {
  return {
    date: "2026-08-01",
    weight: 82.4,
    body_fat_kg: 12.1,
    body_fat_pct: 14.7,
    skeletal_muscle_kg: 40.2,
    muscle_mass_kg: 66.8,
    tbw_kg: 48.9,
    ecw_kg: 18.3,
    icw_kg: 30.6,
    phase_angle: 6.4,
    visceral_fat: 5,
    bmr_kcal: 1830,
    ...over,
  };
}

describe("writeCompositionAction", () => {
  it("legt eine Messung mit Nutzer-Kennung und allen Werten an", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionAction(store, "u1", { type: "add", felder: felder() });
    expect(log.messungInserted).toEqual([
      {
        user_id: "u1",
        date: "2026-08-01",
        weight: 82.4,
        body_fat_kg: 12.1,
        body_fat_pct: 14.7,
        skeletal_muscle_kg: 40.2,
        muscle_mass_kg: 66.8,
        tbw_kg: 48.9,
        ecw_kg: 18.3,
        icw_kg: 30.6,
        phase_angle: 6.4,
        visceral_fat: 5,
        bmr_kcal: 1830,
      },
    ]);
    expect(log.messungPatches).toHaveLength(0);
    expect(log.messungDeleted).toHaveLength(0);
    expect(log.meilensteinInserted).toHaveLength(0);
  });

  it("legt eine Messung mit nur einem gefuellten Wert an", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionAction(store, "u1", {
      type: "add",
      felder: {
        date: "2026-08-02",
        weight: 81,
        body_fat_kg: null,
        body_fat_pct: null,
        skeletal_muscle_kg: null,
        muscle_mass_kg: null,
        tbw_kg: null,
        ecw_kg: null,
        icw_kg: null,
        phase_angle: null,
        visceral_fat: null,
        bmr_kcal: null,
      },
    });
    expect(log.messungInserted[0]).toMatchObject({
      user_id: "u1",
      date: "2026-08-02",
      weight: 81,
      body_fat_kg: null,
      bmr_kcal: null,
    });
  });

  it("aendert eine Messung ohne die Nutzer-Kennung mitzuschreiben", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionAction(store, "u1", {
      type: "update",
      id: "m1",
      felder: felder({ date: "2026-08-03", weight: 83.1 }),
    });
    expect(log.messungPatches).toHaveLength(1);
    expect(log.messungPatches[0].id).toBe("m1");
    expect(log.messungPatches[0].patch).toMatchObject({
      date: "2026-08-03",
      weight: 83.1,
    });
    expect(log.messungPatches[0].patch).not.toHaveProperty("user_id");
    expect(log.messungInserted).toHaveLength(0);
  });

  it("schreibt ein leer geraeumtes Feld als null zurueck", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionAction(store, "u1", {
      type: "update",
      id: "m1",
      felder: felder({ visceral_fat: null, phase_angle: null }),
    });
    expect(log.messungPatches[0].patch).toMatchObject({
      visceral_fat: null,
      phase_angle: null,
      weight: 82.4,
    });
  });

  it("loescht eine Messung", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionAction(store, "u1", { type: "delete", id: "m9" });
    expect(log.messungDeleted).toEqual(["m9"]);
    expect(log.folge).toEqual(["deleteMessung"]);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryCompositionStore();
    await expect(
      writeCompositionAction(store, null, { type: "add", felder: felder() }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});

describe("writeCompositionMilestoneAction", () => {
  it("legt einen Meilenstein mit Metrik und Nutzer-Kennung an", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionMilestoneAction(store, "u1", {
      type: "add",
      metric: "fat",
      name: "unter 12 Prozent",
      target: 12,
    });
    expect(log.meilensteinInserted).toEqual([
      { user_id: "u1", metric: "fat", name: "unter 12 Prozent", target: 12 },
    ]);
    expect(log.messungInserted).toHaveLength(0);
  });

  it("aendert nur Name und Zielwert, nie Metrik oder Nutzer-Kennung", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionMilestoneAction(store, "u1", {
      type: "update",
      id: "s1",
      name: "unter 11 Prozent",
      target: 11,
    });
    expect(log.meilensteinPatches).toEqual([
      { id: "s1", patch: { name: "unter 11 Prozent", target: 11 } },
    ]);
  });

  it("loescht einen Meilenstein", async () => {
    const { store, log } = createMemoryCompositionStore();
    await writeCompositionMilestoneAction(store, "u1", {
      type: "delete",
      id: "s2",
    });
    expect(log.meilensteinDeleted).toEqual(["s2"]);
    expect(log.folge).toEqual(["deleteMeilenstein"]);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryCompositionStore();
    await expect(
      writeCompositionMilestoneAction(store, null, {
        type: "add",
        metric: "weight",
        name: "80 kg",
        target: 80,
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});
