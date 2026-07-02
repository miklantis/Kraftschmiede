import { describe, it, expect } from "vitest";
import {
  addExercise,
  canSaveDraft,
  draftJourneyCapable,
  nameStatus,
  reorderExercise,
  removeExercise,
  trimmedName,
  type WorkoutDraft,
} from "../workoutEditor";

const profiles: Record<string, string | undefined> = {
  a: "strength",
  b: "core",
  c: "bodyweight",
  d: "strength",
};

function draft(exerciseIds: string[]): WorkoutDraft {
  return {
    name: "Test",
    exercises: exerciseIds.map((id) => ({ exerciseId: id })),
  };
}

describe("draftJourneyCapable", () => {
  it("ist wahr, sobald eine strength-Uebung enthalten ist", () => {
    expect(draftJourneyCapable(draft(["b", "a"]), profiles)).toBe(true);
  });
  it("ist falsch ohne strength-Uebung", () => {
    expect(draftJourneyCapable(draft(["b", "c"]), profiles)).toBe(false);
  });
  it("ist falsch bei leerem Entwurf", () => {
    expect(draftJourneyCapable(draft([]), profiles)).toBe(false);
  });
});

describe("nameStatus", () => {
  const others = new Set(["Push A", "Pull B"]);
  it("meldet leer bei nur Leerzeichen", () => {
    expect(nameStatus("   ", others)).toBe("empty");
  });
  it("meldet Konflikt bei belegtem Namen", () => {
    expect(nameStatus(" Push A ", others)).toBe("duplicate");
  });
  it("akzeptiert freien Namen", () => {
    expect(nameStatus("Push C", others)).toBe("ok");
  });
});

describe("trimmedName", () => {
  it("entfernt Rand-Leerzeichen", () => {
    expect(trimmedName("  Legs  ")).toBe("Legs");
  });
});

describe("canSaveDraft", () => {
  it("nur mit gueltigem Namen und mindestens einer Uebung", () => {
    expect(canSaveDraft(draft(["a"]), "ok")).toBe(true);
    expect(canSaveDraft(draft([]), "ok")).toBe(false);
    expect(canSaveDraft(draft(["a"]), "duplicate")).toBe(false);
    expect(canSaveDraft(draft(["a"]), "empty")).toBe(false);
  });
});

describe("addExercise", () => {
  it("haengt an", () => {
    let d: WorkoutDraft = { name: "x", exercises: [] };
    d = addExercise(d, "a");
    d = addExercise(d, "b");
    expect(d.exercises).toEqual([{ exerciseId: "a" }, { exerciseId: "b" }]);
  });
  it("fuegt eine bereits enthaltene Uebung nicht doppelt hinzu", () => {
    const d = addExercise(draft(["a"]), "a");
    expect(d.exercises).toHaveLength(1);
  });
});

describe("removeExercise", () => {
  it("entfernt die Uebung", () => {
    const d = removeExercise(draft(["a", "b"]), "a");
    expect(d.exercises.map((e) => e.exerciseId)).toEqual(["b"]);
  });
});

describe("reorderExercise", () => {
  it("verschiebt an eine spaetere Position", () => {
    const d = reorderExercise(draft(["a", "b", "c"]), 0, 2);
    expect(d.exercises.map((e) => e.exerciseId)).toEqual(["b", "c", "a"]);
  });
  it("verschiebt an eine fruehere Position", () => {
    const d = reorderExercise(draft(["a", "b", "c"]), 2, 0);
    expect(d.exercises.map((e) => e.exerciseId)).toEqual(["c", "a", "b"]);
  });
  it("laesst den Entwurf bei gleicher Position unveraendert", () => {
    const start = draft(["a", "b", "c"]);
    expect(reorderExercise(start, 1, 1).exercises).toEqual(start.exercises);
  });
  it("klemmt Ziele ausserhalb der Grenzen an den Rand", () => {
    expect(
      reorderExercise(draft(["a", "b", "c"]), 0, 9).exercises.map(
        (e) => e.exerciseId,
      ),
    ).toEqual(["b", "c", "a"]);
    expect(
      reorderExercise(draft(["a", "b", "c"]), 2, -5).exercises.map(
        (e) => e.exerciseId,
      ),
    ).toEqual(["c", "a", "b"]);
  });
  it("laesst den Entwurf bei ungueltiger Quelle unveraendert", () => {
    const start = draft(["a", "b"]);
    expect(reorderExercise(start, 5, 0).exercises).toEqual(start.exercises);
  });
});
