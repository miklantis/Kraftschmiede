import { describe, it, expect } from "vitest";
import { createMemoryExerciseStore } from "../exerciseStore";
import {
  writeMilestoneAction,
  writeRmTestAction,
  writeExerciseEdit,
} from "../exerciseWrite";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff mit welchen
// Feldern ausgeloest wird. Beim 1RM-Test zaehlt zusaetzlich die Reihenfolge
// (erst Test, dann Katalog), deshalb wird dort `folge` mitgeprueft. Meilensteine,
// Tests und Katalog teilen sich einen Store, also wird nebenbei mitgeprueft,
// dass die jeweils anderen Bereiche unberuehrt bleiben.

describe("writeMilestoneAction", () => {
  it("legt einen Meilenstein mit Nutzer-Kennung und Uebung an", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeMilestoneAction(store, "u1", {
      type: "add",
      exerciseId: "ex1",
      name: "Bank 100",
      targetRm: 100,
    });
    expect(log.meilensteinInserted).toEqual([
      {
        user_id: "u1",
        exercise_id: "ex1",
        name: "Bank 100",
        target_rm: 100,
      },
    ]);
    expect(log.uebungPatches).toHaveLength(0);
    expect(log.rmTestInserted).toHaveLength(0);
  });

  it("aendert nur Name und Zielwert, ohne Nutzer-Kennung und Uebung", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeMilestoneAction(store, "u1", {
      type: "update",
      id: "m1",
      name: "Bank 110",
      targetRm: 110,
    });
    expect(log.meilensteinPatches).toEqual([
      { id: "m1", patch: { name: "Bank 110", target_rm: 110 } },
    ]);
    expect(log.meilensteinInserted).toHaveLength(0);
  });

  it("loescht einen Meilenstein", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeMilestoneAction(store, "u1", { type: "delete", id: "m1" });
    expect(log.meilensteinDeleted).toEqual(["m1"]);
    expect(log.meilensteinPatches).toHaveLength(0);
  });

  it("stempelt das Erreichen-Datum ueber den eigenen Handgriff", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeMilestoneAction(store, "u1", {
      type: "markAchieved",
      id: "m1",
      date: "2026-08-10",
    });
    expect(log.meilensteinAchieved).toEqual([
      { id: "m1", date: "2026-08-10" },
    ]);
    // Kein gewoehnliches Aendern: der Guard "nur solange leer" haengt am
    // eigenen Handgriff.
    expect(log.meilensteinPatches).toHaveLength(0);
  });

  it("schreibt nichts ohne angemeldeten Nutzer", async () => {
    const { store, log } = createMemoryExerciseStore();
    await expect(
      writeMilestoneAction(store, null, {
        type: "add",
        exerciseId: "ex1",
        name: "Bank 100",
        targetRm: 100,
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});

describe("writeRmTestAction", () => {
  it("schreibt erst den Test, dann den Rekord der Uebung", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeRmTestAction(store, "u1", {
      type: "add",
      exerciseId: "ex1",
      date: "2026-08-10",
      weight: 90,
      reps: 3,
      estRm: 99,
      previousRm: 95,
      notiz: "fiel schwer",
    });
    expect(log.folge).toEqual(["insertRmTest", "updateUebung"]);
    expect(log.rmTestInserted).toEqual([
      {
        user_id: "u1",
        exercise_id: "ex1",
        date: "2026-08-10",
        weight: 90,
        reps: 3,
        est_rm: 99,
        previous_rm: 95,
        notiz: "fiel schwer",
      },
    ]);
    expect(log.uebungPatches).toEqual([
      {
        id: "ex1",
        patch: { rm: 99, rm_as_of: "2026-08-10", rm_stale: false },
      },
    ]);
  });

  it("setzt den Rekord auch nach unten und merkt den Vorwert als null", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeRmTestAction(store, "u1", {
      type: "add",
      exerciseId: "ex1",
      date: "2026-08-10",
      weight: 70,
      reps: 5,
      estRm: 80,
      previousRm: null,
      notiz: "",
    });
    expect(log.rmTestInserted[0]?.previous_rm).toBeNull();
    expect(log.uebungPatches).toEqual([
      {
        id: "ex1",
        patch: { rm: 80, rm_as_of: "2026-08-10", rm_stale: false },
      },
    ]);
  });

  it("schreibt eine nachtraegliche Notiz ohne den Katalog anzufassen", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeRmTestAction(store, "u1", {
      type: "updateNote",
      id: "t1",
      notiz: "Schmerzen links",
    });
    expect(log.folge).toEqual(["updateRmTest"]);
    expect(log.rmTestPatches).toEqual([
      { id: "t1", patch: { notiz: "Schmerzen links" } },
    ]);
    expect(log.uebungPatches).toEqual([]);
  });

  it("nimmt beim Loeschen des juengsten Tests den Rekord zurueck", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeRmTestAction(store, "u1", {
      type: "delete",
      id: "t1",
      exerciseId: "ex1",
      restore: { rm: 95, asOf: "2026-06-01" },
    });
    expect(log.folge).toEqual(["deleteRmTest", "updateUebung"]);
    expect(log.rmTestDeleted).toEqual(["t1"]);
    expect(log.uebungPatches).toEqual([
      {
        id: "ex1",
        patch: { rm: 95, rm_as_of: "2026-06-01", rm_stale: false },
      },
    ]);
  });

  it("markiert die Uebung als beleglos, wenn es keinen Vorwert gibt", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeRmTestAction(store, "u1", {
      type: "delete",
      id: "t1",
      exerciseId: "ex1",
      restore: { rm: null, asOf: null },
    });
    expect(log.uebungPatches).toEqual([
      { id: "ex1", patch: { rm: null, rm_as_of: null, rm_stale: true } },
    ]);
  });

  it("laesst den Rekord unberuehrt, wenn ein aelterer Test geloescht wird", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeRmTestAction(store, "u1", {
      type: "delete",
      id: "t2",
      exerciseId: "ex1",
      restore: null,
    });
    expect(log.folge).toEqual(["deleteRmTest"]);
    expect(log.uebungPatches).toHaveLength(0);
  });

  it("schreibt nichts ohne angemeldeten Nutzer", async () => {
    const { store, log } = createMemoryExerciseStore();
    await expect(
      writeRmTestAction(store, null, {
        type: "delete",
        id: "t1",
        exerciseId: "ex1",
        restore: null,
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});

describe("writeExerciseEdit", () => {
  it("schreibt genau die gesetzten Felder", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeExerciseEdit(store, "u1", "ex1", {
      work_weight: 62.5,
      rep_range_min: 6,
      rep_range_max: 10,
    });
    expect(log.uebungPatches).toEqual([
      {
        id: "ex1",
        patch: {
          work_weight: 62.5,
          rep_range_min: 6,
          rep_range_max: 10,
        },
      },
    ]);
  });

  it("laesst das Repband weg, wenn es gesperrt war", async () => {
    const { store, log } = createMemoryExerciseStore();
    await writeExerciseEdit(store, "u1", "ex1", {
      work_weight: 62.5,
    });
    expect(log.uebungPatches).toEqual([
      { id: "ex1", patch: { work_weight: 62.5 } },
    ]);
  });

  it("schreibt nichts ohne angemeldeten Nutzer", async () => {
    const { store, log } = createMemoryExerciseStore();
    await expect(
      writeExerciseEdit(store, null, "ex1", {
        work_weight: 62.5,
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.folge).toHaveLength(0);
  });
});
