import { describe, it, expect } from "vitest";
import { createMemoryErfassungStore } from "../erfassungStore";
import { writeErfassungAction } from "../erfassungWrite";
import type { BefindenFelder } from "../erfassungWrite";
import type { SkillProgressRow } from "@/schemas";

// Der Speicher protokolliert nur – geprueft wird, welcher Handgriff mit welchen
// Feldern ausgeloest wird. Das heutige Datum kommt als Parameter herein.

const HEUTE = "2026-08-11";

function felder(over: Partial<BefindenFelder> = {}): BefindenFelder {
  return {
    legs: 2,
    upper_body: 1,
    overall: 3,
    readiness: 4,
    pain_flag: false,
    notes: "gut geschlafen",
    ...over,
  };
}

function fortschritt(over: Partial<SkillProgressRow> = {}): SkillProgressRow {
  return {
    id: "p1",
    user_id: "u1",
    skill_id: "s1",
    active: true,
    current_phase: 3,
    counter: 2,
    mastered: false,
    log: [{ date: "2026-08-01", phase: 3, result: "completed" }],
    ...over,
  };
}

describe("writeErfassungAction – Befinden", () => {
  it("schreibt das Befinden auf das heutige Datum, mit leerem Schmerz-Vermerk", async () => {
    const { store, log } = createMemoryErfassungStore();
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "befinden",
      felder: felder(),
    });
    expect(log.befinden).toEqual([
      {
        user_id: "u1",
        date: HEUTE,
        legs: 2,
        upper_body: 1,
        overall: 3,
        readiness: 4,
        pain_flag: false,
        pain_note: "",
        notes: "gut geschlafen",
      },
    ]);
  });

  it("schreibt ohne angemeldeten Nutzer nichts", async () => {
    const { store, log } = createMemoryErfassungStore();
    await expect(
      writeErfassungAction(store, null, HEUTE, {
        type: "befinden",
        felder: felder(),
      }),
    ).rejects.toThrow("Nicht angemeldet.");
    expect(log.befinden).toHaveLength(0);
  });
});

describe("writeErfassungAction – Einheiten", () => {
  it("legt eine Yoga-Einheit als abgeschlossen an", async () => {
    const { store, log } = createMemoryErfassungStore();
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "addYoga",
      datum: "2026-08-09",
      minuten: 45,
    });
    expect(log.einheitenInsert).toEqual([
      {
        user_id: "u1",
        date: "2026-08-09",
        type: "yoga",
        status: "done",
        minutes: 45,
        notes: "",
      },
    ]);
  });

  it("loescht eine Einheit ueber ihre Id", async () => {
    const { store, log } = createMemoryErfassungStore();
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "deleteEinheit",
      id: "e1",
    });
    expect(log.einheitenDeleted).toEqual(["e1"]);
    expect(log.einheitenInsert).toHaveLength(0);
  });
});

describe("writeErfassungAction – Skill-Fortschritt", () => {
  it("setzt beim Zurueckstufen eine Phase zurueck und den Zaehler auf 0", async () => {
    const { store, log } = createMemoryErfassungStore({ s1: fortschritt() });
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "skillRegress",
      skillId: "s1",
    });
    expect(log.skillPatches).toEqual([
      {
        id: "p1",
        patch: {
          current_phase: 2,
          counter: 0,
          mastered: false,
          log: [
            { date: "2026-08-01", phase: 3, result: "completed" },
            { date: HEUTE, type: "regress", from: 3, to: 2 },
          ],
        },
      },
    ]);
  });

  it("bleibt beim Zurueckstufen in Phase 0 stehen", async () => {
    const { store, log } = createMemoryErfassungStore({
      s1: fortschritt({ current_phase: 0 }),
    });
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "skillRegress",
      skillId: "s1",
    });
    expect(log.skillPatches[0].patch.current_phase).toBe(0);
  });

  it("setzt beim Zuruecksetzen auf Phase 0 und hebt gemeistert auf", async () => {
    const { store, log } = createMemoryErfassungStore({
      s1: fortschritt({ current_phase: 5, mastered: true }),
    });
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "skillReset",
      skillId: "s1",
    });
    expect(log.skillPatches[0].patch).toMatchObject({
      current_phase: 0,
      counter: 0,
      mastered: false,
    });
    expect(log.skillPatches[0].patch.log.at(-1)).toEqual({
      date: HEUTE,
      type: "reset",
      from: 5,
    });
  });

  it("laesst einen Skill ohne Fortschritt unberuehrt", async () => {
    const { store, log } = createMemoryErfassungStore();
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "skillRegress",
      skillId: "s1",
    });
    await writeErfassungAction(store, "u1", HEUTE, {
      type: "skillReset",
      skillId: "s1",
    });
    expect(log.skillPatches).toHaveLength(0);
  });
});
