import { describe, it, expect } from "vitest";
import { createMemoryHistoryStore } from "../historyStore";
import {
  writeFinishStrength,
  writeFinishSkill,
  writeEditSession,
} from "../historyWrite";
import type { FinishPayload } from "../finishMutation";
import type { FinishSkillPayload } from "../finishSkillMutation";
import type { EditPayload } from "../editSession";

// Minimal gueltige Zeilen – Inhalt ist fuer den Schreibpfad durchgereicht, der
// Speicher protokolliert nur. Es geht um Reihenfolge, Bedingungen und Patches.

function finishPayload(over: Partial<FinishPayload> = {}): FinishPayload {
  return {
    sessionRow: { id: "s1", user_id: "u1", date: "2026-06-20", type: "strength" },
    exerciseRows: [{ id: "se1", user_id: "u1", session_id: "s1" }],
    setRows: [
      { id: "set1", user_id: "u1", session_exercise_id: "se1", kind: "work" },
    ],
    exercisePatches: [
      { id: "ex1", work_weight: 100, rm: 120, rm_as_of: "2026-06-20" },
    ],
    ...over,
  };
}

describe("writeFinishStrength", () => {
  it("fuegt Einheit, Uebungen und Saetze ein und zieht den Katalog nach", async () => {
    const { store, log } = createMemoryHistoryStore();
    await writeFinishStrength(store, finishPayload());
    expect(log.sessions).toHaveLength(1);
    expect(log.sessionExercises).toHaveLength(1);
    expect(log.sets).toHaveLength(1);
    expect(log.exercisePatches).toEqual([
      {
        id: "ex1",
        patch: { work_weight: 100, rm: 120, rm_as_of: "2026-06-20", rm_stale: false },
      },
    ]);
  });

  it("ueberspringt leere Uebungs- und Satz-Listen", async () => {
    const { store, log } = createMemoryHistoryStore();
    await writeFinishStrength(
      store,
      finishPayload({ exerciseRows: [], setRows: [] }),
    );
    expect(log.sessions).toHaveLength(1);
    expect(log.sessionExercises).toHaveLength(0);
    expect(log.sets).toHaveLength(0);
  });

  it("setzt bei einem Patch ohne 1RM nur das Arbeitsgewicht (kein rm_stale)", async () => {
    const { store, log } = createMemoryHistoryStore();
    await writeFinishStrength(
      store,
      finishPayload({ exercisePatches: [{ id: "ex1", work_weight: 90 }] }),
    );
    expect(log.exercisePatches[0].patch).toEqual({ work_weight: 90 });
  });
});

describe("writeFinishSkill", () => {
  it("fuegt ein und zieht den bestehenden Skill-Fortschritt nach", async () => {
    const { store, log } = createMemoryHistoryStore();
    const payload: FinishSkillPayload = {
      sessionRow: { id: "s1", user_id: "u1", date: "2026-06-20", type: "skill" },
      exerciseRows: [{ id: "se1", user_id: "u1", session_id: "s1" }],
      setRows: [
        { id: "set1", user_id: "u1", session_exercise_id: "se1", kind: "work" },
      ],
      progressWrite: {
        id: "p1",
        isNew: false,
        currentPhase: 2,
        consecutiveCount: 1,
        mastered: false,
      },
    };
    await writeFinishSkill(store, payload);
    expect(log.sessions).toHaveLength(1);
    expect(log.skillProgress).toEqual([payload.progressWrite]);
  });

  it("legt die Fortschritts-Zeile an, wenn noch keine existiert", async () => {
    const { store, log } = createMemoryHistoryStore();
    const payload: FinishSkillPayload = {
      sessionRow: { id: "s1", user_id: "u1", date: "2026-06-20", type: "skill" },
      exerciseRows: [],
      setRows: [],
      progressWrite: {
        id: "p-new",
        isNew: true,
        userId: "u1",
        skillId: "sk1",
        currentPhase: 0,
        consecutiveCount: 1,
        mastered: false,
      },
    };
    await writeFinishSkill(store, payload);
    expect(log.skillProgress).toEqual([payload.progressWrite]);
  });
});

describe("writeEditSession", () => {
  function editPayload(over: Partial<EditPayload> = {}): EditPayload {
    return {
      sessionId: "s1",
      durationSec: 2700,
      exercises: [
        {
          sessionExerciseId: "se1",
          tested1RM: 120,
          workSetRows: [
            { id: "set1", user_id: "u1", session_exercise_id: "se1", kind: "work" },
          ],
        },
      ],
      exercisePatches: [{ id: "ex1", work_weight: 105 }],
      ...over,
    };
  }

  it("ersetzt je Uebung die Arbeitssaetze und setzt tested_1rm", async () => {
    const { store, log } = createMemoryHistoryStore();
    await writeEditSession(store, editPayload());
    expect(log.replacedWorkSets).toEqual([
      {
        sessionExerciseId: "se1",
        rows: [{ id: "set1", user_id: "u1", session_exercise_id: "se1", kind: "work" }],
      },
    ]);
    expect(log.tested1RM).toEqual([{ sessionExerciseId: "se1", value: 120 }]);
    expect(log.sessionPatches).toEqual([
      { id: "s1", patch: { duration_sec: 2700 } },
    ]);
  });

  it("laesst die Einheit-Felder unberuehrt, wenn nichts gesetzt ist", async () => {
    const { store, log } = createMemoryHistoryStore();
    await writeEditSession(
      store,
      editPayload({ durationSec: null, exercises: [], exercisePatches: [] }),
    );
    expect(log.sessionPatches).toHaveLength(0);
  });

  it("schreibt Yoga-Felder (Minuten + Notiz) als Einheit-Patch", async () => {
    const { store, log } = createMemoryHistoryStore();
    await writeEditSession(
      store,
      editPayload({
        durationSec: null,
        minutes: 75,
        notes: "ruhig",
        exercises: [],
        exercisePatches: [],
      }),
    );
    expect(log.sessionPatches).toEqual([
      { id: "s1", patch: { minutes: 75, notes: "ruhig" } },
    ]);
  });
});
