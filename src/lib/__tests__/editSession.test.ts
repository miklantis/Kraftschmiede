import { describe, it, expect } from "vitest";
import { buildEditPayload, type EditContext } from "../editSession";
import { withSetValue } from "../liveEntries";
import type { LiveEntry } from "../liveSession";

// Deterministische IDs fuer stabile Vergleiche.
function idGen() {
  let n = 0;
  return () => "id" + ++n;
}

function ctx(over: Partial<EditContext> = {}): EditContext {
  return {
    sessionId: "sess1",
    durationSec: 2700,
    userId: "u1",
    rmFormula: "mean",
    date: "2026-06-20",
    exercises: [
      {
        sessionExerciseId: "se1",
        exerciseId: "ex1",
        sets: [
          { reps: 5, weight: 100, score: 3, targetReps: 5, targetWeight: 100, adjusted: false, adjustNote: "" },
          { reps: 5, weight: 100, score: 3, targetReps: 5, targetWeight: 100, adjusted: false, adjustNote: "" },
        ],
      },
    ],
    isYoungest: () => true,
    tracksRm: () => true,
    currentRm: () => null,
    newId: idGen(),
    ...over,
  };
}

describe("buildEditPayload", () => {
  it("schreibt die Arbeitssaetze als neue work-Saetze mit Positionen", () => {
    const p = buildEditPayload(ctx());
    expect(p.exercises).toHaveLength(1);
    const rows = p.exercises[0].workSetRows;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "work" && r.done === true)).toBe(true);
    expect(rows.map((r) => r.position)).toEqual([0, 1]);
    expect(rows[0].reps).toBe(5);
    expect(rows[0].weight).toBe(100);
  });

  it("reicht die Dauer durch", () => {
    expect(buildEditPayload(ctx({ durationSec: 1800 })).durationSec).toBe(1800);
    expect(buildEditPayload(ctx({ durationSec: null })).durationSec).toBeNull();
  });

  it("berechnet ein 1RM und schreibt es bei juengster Einheit in den Katalog", () => {
    const p = buildEditPayload(ctx());
    expect(p.exercises[0].tested1RM).not.toBeNull();
    expect(p.exercisePatches).toHaveLength(1);
    const patch = p.exercisePatches[0];
    expect(patch.id).toBe("ex1");
    expect(patch.work_weight).toBe(100);
    expect(patch.rm).not.toBeNull();
    expect(patch.rm_as_of).toBe("2026-06-20");
  });

  it("schreibt den Katalog NICHT fort, wenn es eine juengere Einheit gibt", () => {
    const p = buildEditPayload(ctx({ isYoungest: () => false }));
    // Verlaufseintrag wird trotzdem korrigiert (tested_1rm gesetzt) ...
    expect(p.exercises[0].tested1RM).not.toBeNull();
    // ... aber kein Coach-Patch.
    expect(p.exercisePatches).toHaveLength(0);
  });

  it("setzt rm nicht bei Uebungen ohne 1RM-Tracking (Koerpergewicht)", () => {
    const p = buildEditPayload(ctx({ tracksRm: () => false }));
    expect(p.exercisePatches).toHaveLength(1);
    expect(p.exercisePatches[0].work_weight).toBe(100);
    expect(p.exercisePatches[0].rm).toBeUndefined();
  });
});

describe("Korrektur im Verlauf ueber die Live-Satzlogik", () => {
  // Das Bearbeiten-Panel formt die Saetze nicht mehr selbst um, sondern schickt
  // sie durch dieselbe Satz-Logik wie das Live-Training (#114). Geprueft wird
  // die Naht: was withSetValue erzeugt, muss buildEditPayload unveraendert in
  // die Satz-Zeile tragen. Die Regel selbst deckt liveEntries.test.ts ab.
  const entry = (): LiveEntry => ({
    exerciseId: "ex1",
    exerciseName: "Kniebeuge",
    equipment: "bodyweight",
    tag: "",
    barId: null,
    barName: null,
    barWeight: null,
    warmupSets: [],
    note: "",
    sets: [
      {
        reps: 5,
        weight: 100,
        score: 3,
        targetReps: 5,
        targetWeight: 100,
        done: false,
        failed: false,
        adjusted: false,
        adjustNote: "",
      },
    ],
  });

  function zeileNachKorrektur(gewicht: number) {
    const entries = withSetValue([entry()], 0, 0, "weight", gewicht, false);
    const p = buildEditPayload(
      ctx({
        exercises: [
          {
            sessionExerciseId: "se1",
            exerciseId: "ex1",
            sets: entries[0].sets,
          },
        ],
      }),
    );
    return p.exercises[0].workSetRows[0];
  }

  it("vermerkt ein vom Ziel abweichendes Gewicht als angepasst", () => {
    const row = zeileNachKorrektur(90);
    expect(row.weight).toBe(90);
    expect(row.adjusted).toBe(true);
    expect(row.adjust_note).toBe("Gewicht angepasst");
    // Unter dem Zielgewicht gilt das Ziel als verfehlt – live wie im Verlauf.
    expect(row.met).toBe(false);
  });

  it("laesst einen Satz auf dem Zielgewicht unangetastet", () => {
    const row = zeileNachKorrektur(100);
    expect(row.adjusted).toBe(false);
    expect(row.adjust_note).toBe("");
    expect(row.met).toBe(true);
  });

  it("uebernimmt die Bewertung 5, ohne den Satz als gescheitert zu schreiben", () => {
    // Bewusste Festlegung aus #114: die Korrektur kennt kein Versagen.
    const entries = withSetValue([entry()], 0, 0, "score", 5, false);
    const p = buildEditPayload(
      ctx({
        exercises: [
          {
            sessionExerciseId: "se1",
            exerciseId: "ex1",
            sets: entries[0].sets,
          },
        ],
      }),
    );
    const row = p.exercises[0].workSetRows[0];
    expect(row.score).toBe(5);
    expect(row.failed).toBe(false);
  });
});

import { buildSkillEditPayload, type SkillEditContext } from "../editSession";

function skillCtx(over: Partial<SkillEditContext> = {}): SkillEditContext {
  return {
    sessionId: "sess1",
    durationSec: 1200,
    userId: "u1",
    exercises: [
      { sessionExerciseId: "se1", metric: "duration", target: 10, values: [12, 8] },
      { sessionExerciseId: "se2", metric: "reps", target: 5, values: [6] },
    ],
    newId: idGen(),
    ...over,
  };
}

describe("buildSkillEditPayload", () => {
  it("schreibt Dauer-Saetze in duration_sec und Wdh-Saetze in reps", () => {
    const p = buildSkillEditPayload(skillCtx());
    const dur = p.exercises[0].workSetRows;
    expect(dur[0].duration_sec).toBe(12);
    expect(dur[0].reps).toBeNull();
    const rep = p.exercises[1].workSetRows;
    expect(rep[0].reps).toBe(6);
    expect(rep[0].duration_sec).toBeNull();
  });

  it("bestimmt met gegen das Phasen-Ziel", () => {
    const p = buildSkillEditPayload(skillCtx());
    const dur = p.exercises[0].workSetRows;
    expect(dur[0].met).toBe(true); // 12 >= 10
    expect(dur[1].met).toBe(false); // 8 < 10
  });

  it("ruehrt Coach/Katalog und 1RM nicht an", () => {
    const p = buildSkillEditPayload(skillCtx());
    expect(p.exercisePatches).toHaveLength(0);
    expect(p.exercises.every((e) => e.tested1RM === null)).toBe(true);
  });

  it("reicht die Dauer durch", () => {
    expect(buildSkillEditPayload(skillCtx({ durationSec: null })).durationSec).toBeNull();
  });
});

import { buildYogaEditPayload } from "../editSession";

describe("buildYogaEditPayload", () => {
  it("schreibt Minuten und Notiz, ohne Saetze/Coach", () => {
    const p = buildYogaEditPayload({ sessionId: "y1", minutes: 75, notes: "ruhig" });
    expect(p.sessionId).toBe("y1");
    expect(p.minutes).toBe(75);
    expect(p.notes).toBe("ruhig");
    expect(p.durationSec).toBeNull(); // Yoga nutzt minutes, nicht duration_sec
    expect(p.exercises).toHaveLength(0);
    expect(p.exercisePatches).toHaveLength(0);
  });

  it("erlaubt eine leere Notiz", () => {
    const p = buildYogaEditPayload({ sessionId: "y1", minutes: 60, notes: "" });
    expect(p.notes).toBe("");
  });
});

describe("buildEditPayload – Rekord-Regel beim 1RM", () => {
  it("laesst einen hoeheren bestehenden Rekord unberuehrt", () => {
    const p = buildEditPayload(ctx({ currentRm: () => 200 }));
    const patch = p.exercisePatches[0];
    expect(patch.work_weight).toBe(100);
    expect(patch.rm).toBeUndefined();
    expect(patch.rm_as_of).toBeUndefined();
  });

  it("hebt den Rekord an, wenn wenige Wiederholungen ihn schlagen", () => {
    const p = buildEditPayload(ctx({ currentRm: () => 50 }));
    const patch = p.exercisePatches[0];
    expect(patch.rm ?? 0).toBeGreaterThan(50);
    expect(patch.rm_as_of).toBe("2026-06-20");
  });

  it("hebt bei vielen Wiederholungen nicht an", () => {
    const p = buildEditPayload(
      ctx({
        currentRm: () => 90,
        exercises: [
          {
            sessionExerciseId: "se1",
            exerciseId: "ex1",
            sets: [
              { reps: 12, weight: 70, score: 3, targetReps: 12, targetWeight: 70, adjusted: false, adjustNote: "" },
            ],
          },
        ],
      }),
    );
    expect(p.exercisePatches[0].rm).toBeUndefined();
  });
});
