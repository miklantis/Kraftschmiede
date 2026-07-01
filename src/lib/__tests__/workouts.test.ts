import { describe, it, expect } from "vitest";
import {
  isJourneyCapable,
  workoutSummary,
  buildWorkoutList,
  buildWorkoutDetail,
  buildJourneyAssignment,
  filterCopyableAssignments,
  selectRecommendationTemplates,
  type WorkoutInput,
} from "@/lib/workouts";

const lookup = {
  squat: { name: "Kniebeuge", profile: "strength" },
  plank: { name: "Plank", profile: "core" },
  pushup: { name: "Liegestütz", profile: "bodyweight" },
};

function wk(partial: Partial<WorkoutInput>): WorkoutInput {
  return {
    id: "w1",
    name: "Test",
    active: true,
    exercises: [],
    ...partial,
  };
}

describe("isJourneyCapable", () => {
  it("ist journey-faehig mit mindestens einer strength-Uebung", () => {
    const w = wk({
      exercises: [
        { exerciseId: "plank", role: "core", position: 0 },
        { exerciseId: "squat", role: "primary", position: 1 },
      ],
    });
    expect(isJourneyCapable(w, lookup)).toBe(true);
  });

  it("ist nicht journey-faehig ohne strength-Uebung", () => {
    const w = wk({
      exercises: [
        { exerciseId: "plank", role: "core", position: 0 },
        { exerciseId: "pushup", role: "secondary", position: 1 },
      ],
    });
    expect(isJourneyCapable(w, lookup)).toBe(false);
  });
});

describe("workoutSummary", () => {
  it("listet Uebungen in Reihenfolge und laesst Unbekannte aus", () => {
    const w = wk({
      exercises: [
        { exerciseId: "squat", role: "primary", position: 1 },
        { exerciseId: "fehlt", role: "secondary", position: 0 },
        { exerciseId: "plank", role: "core", position: 2 },
      ],
    });
    expect(workoutSummary(w, lookup)).toBe("Kniebeuge · Plank");
  });
});

describe("buildWorkoutList", () => {
  it("nimmt nur aktive Workouts auf", () => {
    const list = buildWorkoutList(
      [
        wk({ id: "a", name: "Aktiv", active: true }),
        wk({ id: "b", name: "Archiv", active: false }),
      ],
      lookup,
    );
    expect(list.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("buildWorkoutDetail", () => {
  it("gruppiert nach Rolle in fester Reihenfolge, leere Gruppen entfallen", () => {
    const w = wk({
      exercises: [
        { exerciseId: "plank", role: "core", position: 2 },
        { exerciseId: "squat", role: "primary", position: 0 },
      ],
    });
    const d = buildWorkoutDetail(w, lookup);
    expect(d.groups.map((g) => g.role)).toEqual(["primary", "core"]);
    expect(d.groups[0].exercises).toEqual(["Kniebeuge"]);
    expect(d.journeyCapable).toBe(true);
  });
});

describe("buildJourneyAssignment", () => {
  const strengthWk = (id: string, name: string, active = true): WorkoutInput =>
    wk({
      id,
      name,
      active,
      exercises: [{ exerciseId: "squat", role: "primary", position: 0 }],
    });

  it("nimmt nur aktive und journey-faehige Workouts auf", () => {
    const rows = buildJourneyAssignment(
      [
        strengthWk("a", "Kraft aktiv"),
        strengthWk("b", "Kraft archiv", false),
        wk({
          id: "c",
          name: "Nur Core",
          exercises: [{ exerciseId: "plank", role: "core", position: 0 }],
        }),
      ],
      lookup,
      new Set<string>(),
    );
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("markiert zugewiesene Workouts", () => {
    const rows = buildJourneyAssignment(
      [strengthWk("a", "A"), strengthWk("b", "B")],
      lookup,
      new Set(["b"]),
    );
    expect(rows.find((r) => r.id === "a")?.assigned).toBe(false);
    expect(rows.find((r) => r.id === "b")?.assigned).toBe(true);
  });

  it("behaelt die Reihenfolge der Eingabe", () => {
    const rows = buildJourneyAssignment(
      [strengthWk("x", "X"), strengthWk("y", "Y"), strengthWk("z", "Z")],
      lookup,
      new Set<string>(),
    );
    expect(rows.map((r) => r.id)).toEqual(["x", "y", "z"]);
  });
});

describe("filterCopyableAssignments", () => {
  const strengthWk = (id: string, active = true): WorkoutInput =>
    wk({
      id,
      name: id,
      active,
      exercises: [{ exerciseId: "squat", role: "primary", position: 0 }],
    });

  it("uebernimmt nur weiterhin zuweisbare (aktiv + journey-faehig) Zuweisungen", () => {
    const workouts = [
      strengthWk("a"),
      strengthWk("b", false), // inzwischen archiviert
      wk({
        id: "c",
        name: "c",
        exercises: [{ exerciseId: "plank", role: "core", position: 0 }],
      }), // nicht mehr journey-faehig
    ];
    const copyable = filterCopyableAssignments(
      workouts,
      lookup,
      new Set(["a", "b", "c"]),
    );
    expect(copyable).toEqual(["a"]);
  });

  it("laesst nicht zugewiesene Workouts aus", () => {
    const copyable = filterCopyableAssignments(
      [strengthWk("a"), strengthWk("b")],
      lookup,
      new Set(["a"]),
    );
    expect(copyable).toEqual(["a"]);
  });
});

describe("selectRecommendationTemplates", () => {
  const strengthWk = (id: string, active = true): WorkoutInput =>
    wk({
      id,
      name: id,
      active,
      exercises: [{ exerciseId: "squat", role: "primary", position: 0 }],
    });
  // reines Koerpergewicht/Core -> nicht journey-faehig
  const coreWk = (id: string, active = true): WorkoutInput =>
    wk({
      id,
      name: id,
      active,
      exercises: [{ exerciseId: "plank", role: "core", position: 0 }],
    });

  it("ohne aktive Journey: ganze Bibliothek, nur aktive, kein Hinweis", () => {
    const sel = selectRecommendationTemplates(
      [strengthWk("a"), coreWk("b"), strengthWk("c", false)],
      lookup,
      false,
      new Set(),
    );
    expect(sel.ids).toEqual(["a", "b"]);
    expect(sel.libraryFallback).toBe(false);
  });

  it("aktive Journey mit Zuweisung: nur die zugewiesenen, journey-faehigen", () => {
    const sel = selectRecommendationTemplates(
      [strengthWk("a"), strengthWk("b"), strengthWk("c")],
      lookup,
      true,
      new Set(["a", "c"]),
    );
    expect(sel.ids).toEqual(["a", "c"]);
    expect(sel.libraryFallback).toBe(false);
  });

  it("aktive Journey, leere Zuweisung: Rueckfall auf Bibliothek mit Hinweis", () => {
    const sel = selectRecommendationTemplates(
      [strengthWk("a"), strengthWk("b")],
      lookup,
      true,
      new Set(),
    );
    expect(sel.ids).toEqual(["a", "b"]);
    expect(sel.libraryFallback).toBe(true);
  });

  it("aktive Journey, zugewiesenes Workout nicht mehr journey-faehig: Rueckfall", () => {
    // "a" ist zugewiesen, aber nur noch Core -> nicht nutzbar -> Rueckfall.
    const sel = selectRecommendationTemplates(
      [coreWk("a"), strengthWk("b")],
      lookup,
      true,
      new Set(["a"]),
    );
    expect(sel.ids).toEqual(["a", "b"]);
    expect(sel.libraryFallback).toBe(true);
  });

  it("aktive Journey, zugewiesenes Workout archiviert: Rueckfall", () => {
    const sel = selectRecommendationTemplates(
      [strengthWk("a", false), strengthWk("b")],
      lookup,
      true,
      new Set(["a"]),
    );
    expect(sel.ids).toEqual(["b"]);
    expect(sel.libraryFallback).toBe(true);
  });
});
