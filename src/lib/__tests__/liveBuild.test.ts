import { describe, expect, it } from "vitest";
import { buildLiveEntries } from "../liveBuild";
import type { LiveBuildExercise, LiveBuildInput } from "../liveBuild";

const squat: LiveBuildExercise = {
  id: "squat",
  key: "squat",
  name: "Kniebeuge",
  profile: "strength",
  equipment: "barbell",
  repRange: [8, 12],
  workWeight: 60,
  targetScore: 3,
  barId: "bar1",
  rm: 120,
  muscleGroups: ["Beine"],
};
const plank: LiveBuildExercise = {
  id: "plank",
  key: "plank",
  name: "Plank",
  profile: "core",
  equipment: "bodyweight",
  repRange: [12, 20],
  workWeight: 0,
  targetScore: 3,
  barId: null,
  rm: null,
  muscleGroups: ["Core"],
};

const PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];

function input(overrides: Partial<LiveBuildInput> = {}): LiveBuildInput {
  return {
    exerciseIds: ["squat", "plank"],
    exercisesById: { squat, plank },
    phaseFocus: { focus: "hypertrophy" },
    phaseRepTarget: null,
    volumePhase: { setsStart: 3, setsEnd: 3, weeks: 4, deloadWeek: null },
    weekInPhase: 0,
    recoveryGreen: true,
    lastEntryByExercise: {},
    bars: [{ id: "bar1", name: "Olympia", weight: 20 }],
    plates: PLATES,
    unit: "kg",
    ...overrides,
  };
}

describe("buildLiveEntries", () => {
  it("legt das allgemeine Aufwaermen mit einem Cardio-Satz an", () => {
    const r = buildLiveEntries(input());
    expect(r.generalWarmup.sets).toEqual([
      { minutes: 7, mode: "bike", done: false },
    ]);
  });

  it("baut eine Kraftuebung mit Stange, Tag, Aufwaermen und Arbeitssaetzen", () => {
    const r = buildLiveEntries(input());
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    expect(sq.equipment).toBe("barbell");
    expect(sq.barName).toBe("Olympia");
    expect(sq.barWeight).toBe(20);
    expect(sq.tag).toBe("1RM 120 kg");
    // Satzzahl aus der Phasenrampe (3), Wdh = oberes Phasen-Repband (hypertrophy 8..12).
    expect(sq.sets).toHaveLength(3);
    expect(sq.sets[0]?.weight).toBe(60);
    expect(sq.sets[0]?.targetReps).toBe(12);
    expect(sq.sets[0]?.score).toBe(3);
    // Aufwaermrampe beginnt mit der leeren Stange.
    expect(sq.warmupSets.length).toBeGreaterThan(0);
    expect(sq.warmupSets[0]?.weight).toBe(20);
  });

  it("baut Core fix mit 3 Saetzen, ohne Stange und ohne Aufwaermen", () => {
    const r = buildLiveEntries(input());
    const pl = r.entries.find((e) => e.exerciseId === "plank")!;
    expect(pl.equipment).toBe("bodyweight");
    expect(pl.barName).toBeNull();
    expect(pl.barWeight).toBeNull();
    expect(pl.warmupSets).toEqual([]);
    expect(pl.sets).toHaveLength(3);
    expect(pl.tag).toBe("Core");
  });

  it("ueberspringt unbekannte Uebungs-Ids", () => {
    const r = buildLiveEntries(input({ exerciseIds: ["squat", "fehlt"] }));
    expect(r.entries.map((e) => e.exerciseId)).toEqual(["squat"]);
  });

  it("waehlt fuer eine leichte Uebung eine leichtere Stange und sinkt unter die schwerste", () => {
    // Curl: zuletzt verfehlt (Versagen, harter Score) -> der Coach will senken.
    // Inventar hat die 20er VORNE (wie beim Bug ausloesenden Nutzer); trotzdem soll
    // die Vorbelegung auf der 12,5er landen, nicht an der 20er kleben.
    const curl: LiveBuildExercise = {
      id: "curl",
      key: "curl",
      name: "Curl",
      profile: "strength",
      equipment: "barbell",
      repRange: [12, 20],
      workWeight: 20,
      targetScore: 3,
      barId: null,
      rm: null,
      muscleGroups: ["Arme"],
    };
    const r = buildLiveEntries(
      input({
        exerciseIds: ["curl"],
        exercisesById: { curl },
        bars: [
          { id: "b20", name: "Olympia", weight: 20 },
          { id: "b125", name: "12,5er", weight: 12.5 },
          { id: "b10", name: "10er", weight: 10 },
        ],
        lastEntryByExercise: {
          curl: {
            sets: [
              {
                type: "work",
                weight: 20,
                reps: 8,
                score: 5,
                failed: true,
                done: true,
                targetReps: 12,
                targetWeight: 20,
              },
            ],
          },
        },
      }),
    );
    const c = r.entries.find((e) => e.exerciseId === "curl")!;
    // Senken auf 17,5 -> schwerste Stange <= 17,5 ist die 12,5er, Scheiben oben drauf.
    expect(c.barWeight).toBe(12.5);
    expect(c.barName).toBe("12,5er");
    expect(c.sets[0]?.weight).toBe(17.5);
    expect(c.sets[0]?.weight).toBeLessThan(20);
    // Aufwaermrampe startet jetzt mit der leeren 12,5er, nicht mit 20.
    expect(c.warmupSets[0]?.weight).toBe(12.5);
  });

  it("behaelt bei nur einer Stange das bisherige Verhalten (kein Regress)", () => {
    const r = buildLiveEntries(input());
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    expect(sq.barWeight).toBe(20);
    expect(sq.sets[0]?.weight).toBe(60);
  });
});
