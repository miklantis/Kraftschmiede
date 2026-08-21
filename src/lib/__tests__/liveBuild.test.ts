import { describe, expect, it } from "vitest";
import { buildLiveEntries, phaseEntryOverride } from "../liveBuild";
import type {
  LiveBuildExercise,
  LiveBuildInput,
  PhaseEntryInput,
} from "../liveBuild";
import type { SetEntry } from "@/engine/types";

const squat: LiveBuildExercise = {
  id: "squat",
  key: "squat",
  name: "Kniebeuge",
  profile: "strength",
  tier: "main" as const,
  equipment: "barbell",
  repRange: [8, 12],
  workWeight: 60,
  barId: "bar1",
  referenceWeight: null,
  referencePhaseId: null,
  rm: 120,
  muscleGroups: ["Beine"],
};
const plank: LiveBuildExercise = {
  id: "plank",
  key: "plank",
  name: "Plank",
  profile: "core",
  tier: "accessory" as const,
  equipment: "bodyweight",
  repRange: [12, 20],
  workWeight: 0,
  barId: null,
  referenceWeight: null,
  referencePhaseId: null,
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
    freeMode: false,
    loadFactor: null,
    lastEntryByExercise: {},
    bars: [{ id: "bar1", name: "Olympia", weight: 20 }],
    plates: PLATES,
    dumbbells: [],
    unit: "kg",
    ...overrides,
  };
}

describe("buildLiveEntries", () => {
  it("legt das allgemeine Aufwaermen mit einem Cardio-Satz an", () => {
    const r = buildLiveEntries(input());
    expect(r.generalWarmup.sets).toEqual([
      { minutes: 7, mode: "vario", done: false },
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
    // Ohne Wochenplan gilt der Systemstandard - und der wird mitgeschrieben.
    expect(sq.sets[0]?.targetScore).toBe(3);
    // Aufwaermrampe beginnt mit der leeren Stange.
    expect(sq.warmupSets.length).toBeGreaterThan(0);
    expect(sq.warmupSets[0]?.weight).toBe(20);
  });

  // Vorhaben #299: die Vorgabe der Planwoche haengt am Satz, nicht nur am
  // Regler - Hauptuebung nach Plan, Core faellt auf den Standard zurueck.
  it("uebernimmt die Ziel-Anstrengung der Planwoche in die Saetze", () => {
    const woche = {
      week: 1,
      sets: 4,
      reps: 5,
      repsMax: null,
      rir: 1,
      loadPct: 1,
      note: "schwer",
    };
    const r = buildLiveEntries(
      input({
        planSource: {
          week: woche,
          prevWeek: woche,
          nextWeek: null,
          startReps: 5,
          anchorPhaseId: "ph1",
          deload: false,
          currentWeekEntryByExercise: {},
          previousWeekEntryByExercise: {},
        },
      }),
    );
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    // RIR 1 entspricht Score 4.
    expect(sq.sets[0]?.targetScore).toBe(4);
    expect(sq.sets).toHaveLength(4);
    const pl = r.entries.find((e) => e.exerciseId === "plank")!;
    expect(pl.sets[0]?.targetScore).toBe(3);
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
      tier: "main" as const,
      equipment: "barbell",
      repRange: [12, 20],
      workWeight: 20,
      barId: null,
      referenceWeight: null,
      referencePhaseId: null,
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

  it("Phasenwechsel: erste Einheit im getrennten Band startet aus dem 1RM (Einstieg)", () => {
    // Letzte Einheit im Hypertrophie-Band (12 Wdh), neue Phase Maxkraft 4..6:
    // Baender getrennt, 1RM 120 vorhanden -> Einstieg. Aufwaerts auf +12% ueber
    // dem getragenen 60 gedeckelt und abgerundet -> 65. Ziel-Wdh am oberen Band.
    const r = buildLiveEntries(
      input({
        exerciseIds: ["squat"],
        phaseRepTarget: [4, 6],
        lastEntryByExercise: {
          squat: {
            sets: [
              { type: "work", weight: 60, reps: 12, targetReps: 12, targetWeight: 60, done: true },
            ],
          },
        },
      }),
    );
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    expect(sq.phaseEntry).toBe(true);
    expect(sq.sets[0]?.weight).toBe(65);
    expect(sq.sets[0]?.targetReps).toBe(6);
    // Aufwaermrampe richtet sich am Einstiegsgewicht aus, nicht am alten 60.
    expect(sq.warmupSets.length).toBeGreaterThan(0);
  });

  it("Phasenwechsel: ueberlappendes Band -> kein Einstieg, normale Progression", () => {
    const r = buildLiveEntries(
      input({
        exerciseIds: ["squat"],
        phaseRepTarget: [6, 10],
        lastEntryByExercise: {
          squat: {
            sets: [
              { type: "work", weight: 60, reps: 8, targetReps: 8, targetWeight: 60, done: true },
            ],
          },
        },
      }),
    );
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    expect(sq.phaseEntry).toBeFalsy();
  });

  it("Phasenwechsel: ohne sauberes 1RM kein Einstieg", () => {
    const noRm: LiveBuildExercise = { ...squat, rm: null };
    const r = buildLiveEntries(
      input({
        exerciseIds: ["squat"],
        exercisesById: { squat: noRm },
        phaseRepTarget: [4, 6],
        lastEntryByExercise: {
          squat: {
            sets: [
              { type: "work", weight: 60, reps: 12, targetReps: 12, targetWeight: 60, done: true },
            ],
          },
        },
      }),
    );
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    expect(sq.phaseEntry).toBeFalsy();
  });

  it("Phasenwechsel: ohne letzte Einheit kein Einstieg (Startfall)", () => {
    const r = buildLiveEntries(
      input({ exerciseIds: ["squat"], phaseRepTarget: [4, 6] }),
    );
    const sq = r.entries.find((e) => e.exerciseId === "squat")!;
    expect(sq.phaseEntry).toBeFalsy();
  });
});

describe("freies Training (keine aktive Journey)", () => {
  const lastSquat: SetEntry = {
    sets: [
      {
        type: "work",
        weight: 70,
        reps: 10,
        score: 4,
        failed: false,
        done: true,
        targetReps: 10,
        targetWeight: 70,
      },
      {
        type: "work",
        weight: 70,
        reps: 10,
        score: 4,
        failed: false,
        done: true,
        targetReps: 10,
        targetWeight: 70,
      },
    ],
  };

  it("uebernimmt Gewicht und Wdh. der letzten Einheit ohne Progression", () => {
    const r = buildLiveEntries(
      input({
        exerciseIds: ["squat"],
        exercisesById: { squat },
        freeMode: true,
        phaseFocus: null,
        phaseRepTarget: null,
        volumePhase: null,
        lastEntryByExercise: { squat: lastSquat },
      }),
    );
    const e = r.entries[0]!;
    expect(e.sets[0]!.weight).toBe(70);
    expect(e.sets[0]!.reps).toBe(10);
    expect(e.phaseEntry).toBe(false);
  });

  it("nimmt die Satzzahl der letzten Einheit", () => {
    const r = buildLiveEntries(
      input({
        exerciseIds: ["squat"],
        exercisesById: { squat },
        freeMode: true,
        phaseFocus: null,
        phaseRepTarget: null,
        volumePhase: null,
        lastEntryByExercise: { squat: lastSquat },
      }),
    );
    expect(r.entries[0]!.sets).toHaveLength(2);
  });

  it("faellt ohne Vordaten auf Arbeitsgewicht und Standard-Satzzahl zurueck", () => {
    const r = buildLiveEntries(
      input({
        exerciseIds: ["squat"],
        exercisesById: { squat },
        freeMode: true,
        phaseFocus: null,
        phaseRepTarget: null,
        volumePhase: null,
        lastEntryByExercise: {},
      }),
    );
    const e = r.entries[0]!;
    expect(e.sets).toHaveLength(3);
    expect(e.sets[0]!.weight).toBe(60);
    expect(e.sets[0]!.reps).toBe(12);
  });
});

// Der Phasenwechsel-Einstieg wird direkt geprueft, weil ihn seit AP4 auch die
// Uebungs-Statusanzeige (useCoachStatuses) nutzt, nicht nur der Live-Aufbau.
describe("phaseEntryOverride", () => {
  const lastHypertrophy: SetEntry = {
    sets: [
      { type: "work", weight: 60, reps: 12, targetReps: 12, targetWeight: 60, done: true },
    ],
  };

  function entryInput(
    overrides: Partial<PhaseEntryInput> = {},
  ): PhaseEntryInput {
    return {
      exo: squat,
      rm: 120,
      repTarget: [4, 6],
      bar: { weight: 20 },
      lastEntry: lastHypertrophy,
      plates: PLATES,
      loadFactor: null,
      suggestion: { weight: 60, targetReps: 12 },
      ...overrides,
    };
  }

  it("greift bei getrennten Baendern: Last aus dem 1RM, Wdh am oberen Bandende", () => {
    const r = phaseEntryOverride(entryInput());
    expect(r).toEqual({ weight: 65, targetReps: 6, phaseEntry: true });
  });

  it("laesst den Vorschlag bei ueberlappenden Baendern unveraendert", () => {
    // Letztes Band [12,12] beruehrt [10,14] -> kein Sprung.
    const r = phaseEntryOverride(entryInput({ repTarget: [10, 14] }));
    expect(r).toEqual({ weight: 60, targetReps: 12, phaseEntry: false });
  });

  it("laesst den Vorschlag unveraendert, wenn die Journey die Last vorgibt", () => {
    const r = phaseEntryOverride(
      entryInput({
        exo: { ...squat, referenceWeight: 80 },
        loadFactor: 0.9,
      }),
    );
    expect(r).toEqual({ weight: 60, targetReps: 12, phaseEntry: false });
  });

  it("greift ohne sauberes 1RM, ohne Stange und ohne letzte Einheit nicht", () => {
    expect(phaseEntryOverride(entryInput({ rm: null })).phaseEntry).toBe(false);
    expect(phaseEntryOverride(entryInput({ bar: null })).phaseEntry).toBe(false);
    expect(phaseEntryOverride(entryInput({ lastEntry: null })).phaseEntry).toBe(false);
    expect(phaseEntryOverride(entryInput({ repTarget: null })).phaseEntry).toBe(false);
  });
});
