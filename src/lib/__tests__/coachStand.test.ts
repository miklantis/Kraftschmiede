// Die Coach-Kette an einer Stelle (Issue #380). Geprueft wird hier, was vorher
// nur der Live-Aufbau abdeckte: dass alle drei Anzeigeorte dieselbe Rechnung
// lesen und dass die eine Lage, die abweicht (die laufende Einheit im
// Training), genau an den zwei erklaerten Punkten abweicht - und sonst nirgends.

import { describe, expect, it } from "vitest";
import { buildStrengthWeekPlan } from "@/engine";
import type { SetEntry } from "@/engine/types";
import {
  coachStandFor,
  coachViewFor,
  phaseEntryOverride,
  type CoachStandInput,
  type CoachViewInput,
  type PhaseEntryInput,
} from "../coachStand";
import { buildLiveEntries } from "../liveBuild";
import type { LiveBuildExercise, LiveBuildInput } from "../liveBuild";
import type { PlanSource } from "../planContext";

const PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];
const BARS = [{ id: "bar1", name: "Olympia", weight: 20 }];
const PHASE = "phase-kraft";
const PLAN = buildStrengthWeekPlan(5);

const squat: LiveBuildExercise = {
  id: "squat",
  key: "squat",
  name: "Kniebeuge",
  profile: "strength",
  tier: "main",
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
  ...squat,
  id: "plank",
  key: "plank",
  name: "Plank",
  profile: "core",
  tier: "accessory",
  equipment: "bodyweight",
  repRange: [12, 20],
  workWeight: 0,
  barId: null,
  rm: null,
};

// Letzte Einheit im Hypertrophie-Band: 60 kg x 12 Wiederholungen.
const lastHypertrophy: SetEntry = {
  sets: [
    { type: "work", weight: 60, reps: 12, targetReps: 12, targetWeight: 60, done: true },
  ],
};

// Plan-Stand: Woche 3 der Kraftphase. Der Anker haengt an derselben Phase,
// sonst tritt die Uebung gerade erst in den Plan ein.
function planSource(over: Partial<PlanSource> = {}): PlanSource {
  return {
    week: PLAN[2]!,
    prevWeek: PLAN[1]!,
    nextWeek: PLAN[3]!,
    startReps: PLAN[0]!.reps,
    anchorPhaseId: PHASE,
    deload: false,
    currentWeekEntryByExercise: {},
    previousWeekEntryByExercise: {},
    ...over,
  };
}

function standInput(
  over: Partial<CoachStandInput<{ id: string; name: string; weight: number }>> = {},
): CoachStandInput<{ id: string; name: string; weight: number }> {
  return {
    exo: squat,
    planSource: null,
    phaseFocus: { focus: "strength" },
    // Zielzone der neuen Phase, echt getrennt vom letzten Band [12,12].
    phaseRepTarget: [4, 6],
    hasPhase: true,
    freeMode: false,
    loadFactor: null,
    weightStep: 2.5,
    bars: BARS,
    plates: PLATES,
    dumbbells: [],
    lastEntry: lastHypertrophy,
    prevEntry: null,
    ...over,
  };
}

function viewInput(
  over: Partial<CoachViewInput<{ id: string; name: string; weight: number }>> = {},
): CoachViewInput<{ id: string; name: string; weight: number }> {
  return { ...standInput(over), unit: "kg", ...over };
}

// ---------------------------------------------------------------------------
// Phasenwechsel-Einstieg (vorher in liveBuild.test.ts geprueft)
// ---------------------------------------------------------------------------

describe("phaseEntryOverride", () => {
  function entryInput(overrides: Partial<PhaseEntryInput> = {}): PhaseEntryInput {
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
    expect(phaseEntryOverride(entryInput())).toEqual({
      weight: 65,
      targetReps: 6,
      phaseEntry: true,
    });
  });

  it("laesst den Vorschlag bei ueberlappenden Baendern unveraendert", () => {
    // Letztes Band [12,12] beruehrt [10,14] -> kein Sprung.
    expect(phaseEntryOverride(entryInput({ repTarget: [10, 14] }))).toEqual({
      weight: 60,
      targetReps: 12,
      phaseEntry: false,
    });
  });

  it("laesst den Vorschlag unveraendert, wenn die Journey die Last vorgibt", () => {
    const r = phaseEntryOverride(
      entryInput({ exo: { ...squat, referenceWeight: 80 }, loadFactor: 0.9 }),
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

// ---------------------------------------------------------------------------
// Der Coach-Stand selbst
// ---------------------------------------------------------------------------

describe("coachStandFor", () => {
  it("legt beim Aufbau einer Einheit den Phasenwechsel-Einstieg auf den Vorschlag", () => {
    const stand = coachStandFor(standInput());
    expect(stand).not.toBeNull();
    expect(stand!.phaseEntry).toBe(true);
    expect(stand!.weight).toBe(65);
    expect(stand!.targetReps).toBe(6);
    // Der Vorschlag selbst bleibt unangetastet - auf ihm rechnet der Ausblick.
    expect(stand!.suggestion.weight).not.toBe(65);
  });

  it("laesst den Einstieg in der laufenden Einheit ruhen", () => {
    const stand = coachStandFor(standInput({ running: { workedWeight: 60 } }));
    expect(stand).not.toBeNull();
    expect(stand!.phaseEntry).toBe(false);
    expect(stand!.weight).toBe(stand!.suggestion.weight);
    expect(stand!.targetReps).toBe(stand!.suggestion.targetReps);
  });

  it("rechnet in der laufenden Einheit auf dem heute bewegten Gewicht", () => {
    const leichter = coachStandFor(standInput({ running: { workedWeight: 40 } }));
    const schwerer = coachStandFor(standInput({ running: { workedWeight: 80 } }));
    expect(leichter!.exo.workWeight).toBe(40);
    expect(schwerer!.exo.workWeight).toBe(80);
    // Der Katalogstand (60) spielt ausserhalb des Wochenplans keine Rolle mehr.
    expect(leichter!.weight).toBeLessThan(schwerer!.weight);
  });

  it("hat ohne abgehakten Satz nichts zu rechnen - ausser im Wochenplan", () => {
    // Doppelprogression: ohne Geleistetes kein Coach-Zeichen.
    expect(coachStandFor(standInput({ running: { workedWeight: null } }))).toBeNull();
    // Wochenplan: die Vorgabe der Woche steht von Beginn der Einheit an.
    const imPlan = coachStandFor(
      standInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource(),
        running: { workedWeight: null },
      }),
    );
    expect(imPlan).not.toBeNull();
    expect(imPlan!.scope).toBe("week");
    expect(imPlan!.exo.workWeight).toBe(60);
  });

  it("laesst das Phasen-Repband ruhen, sobald der Wochenplan die Wdh vorgibt", () => {
    expect(coachStandFor(standInput())!.repTarget).toEqual([4, 6]);
    const imPlan = coachStandFor(
      standInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource(),
      }),
    );
    expect(imPlan!.repTarget).toBeNull();
    expect(imPlan!.plan).not.toBeNull();
  });

  it("wertet die Einheit der laufenden Woche - im Training die laufende", () => {
    const imPlan = coachStandFor(
      standInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource({
          currentWeekEntryByExercise: { squat: lastHypertrophy },
        }),
      }),
    );
    expect(imPlan!.judged).toBe(lastHypertrophy);
    const training = coachStandFor(
      standInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource({
          currentWeekEntryByExercise: { squat: lastHypertrophy },
        }),
        lastEntry: null,
        running: { workedWeight: null },
      }),
    );
    // Im Training zaehlt allein, was heute abgehakt ist - hier nichts.
    expect(training!.judged).toBeNull();
  });

  it("erkennt Vordaten auch, wenn nur die Einheit davor etwas hergibt", () => {
    expect(coachStandFor(standInput({ lastEntry: null }))!.hadPriorData).toBe(false);
    const stand = coachStandFor(
      standInput({ lastEntry: null, prevEntry: lastHypertrophy }),
    );
    expect(stand!.hadPriorData).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Die Anzeigeform, die Uebungsseite und Trainingskarte lesen
// ---------------------------------------------------------------------------

describe("coachViewFor", () => {
  it("zeigt die Zahlen nach dem Einstieg, rechnet den Ausblick aber auf dem Vorschlag", () => {
    const view = coachViewFor(
      viewInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource({
          currentWeekEntryByExercise: { squat: lastHypertrophy },
        }),
      }),
    );
    const stand = coachStandFor(
      standInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource({
          currentWeekEntryByExercise: { squat: lastHypertrophy },
        }),
      }),
    );
    expect(view!.status.weight).toBe(stand!.weight);
    expect(view!.status.targetReps).toBe(stand!.targetReps);
    expect(view!.scope).toBe("week");
    expect(view!.outlook).not.toBeNull();
  });

  it("gibt keinen Ausblick, solange die Woche nichts Bewertbares hergibt", () => {
    const view = coachViewFor(
      viewInput({
        exo: { ...squat, referenceWeight: 60, referencePhaseId: PHASE },
        planSource: planSource(),
      }),
    );
    expect(view!.outlook).toBeNull();
  });

  it("steht ohne Vordaten auf Start", () => {
    const view = coachViewFor(viewInput({ lastEntry: null }));
    expect(view!.status.state).toBe("start");
  });

  it("wertet Begleituebungen nicht ('carry')", () => {
    const view = coachViewFor(viewInput({ exo: plank }));
    expect(view!.status.decision).toBe("carry");
  });
});

// ---------------------------------------------------------------------------
// Der eigentliche Zweck des Vorhabens: die drei Wege koennen nicht mehr
// auseinanderlaufen.
// ---------------------------------------------------------------------------

describe("Deckungsgleichheit der drei Anzeigeorte", () => {
  function liveInput(over: Partial<LiveBuildInput> = {}): LiveBuildInput {
    return {
      exerciseIds: ["squat"],
      exercisesById: { squat },
      phaseFocus: { focus: "strength" },
      phaseRepTarget: [4, 6],
      volumePhase: { setsStart: 3, setsEnd: 3, weeks: 5, deloadWeek: null },
      weekInPhase: 2,
      recoveryGreen: true,
      freeMode: false,
      loadFactor: null,
      planSource: null,
      lastEntryByExercise: { squat: lastHypertrophy },
      weightStep: 2.5,
      bars: BARS,
      plates: PLATES,
      dumbbells: [],
      unit: "kg",
      ...over,
    };
  }

  it("zeigt die Uebungsseite dasselbe Gewicht wie die gestartete Einheit", () => {
    const gebaut = buildLiveEntries(liveInput()).entries[0]!;
    const view = coachViewFor(viewInput())!;
    expect(view.status.weight).toBe(gebaut.sets[0]!.weight);
    expect(view.status.targetReps).toBe(gebaut.sets[0]!.targetReps);
    // Genau dieser Fall lief frueher auseinander: der Einstieg musste
    // nachtraeglich in die Statusanzeige kopiert werden.
    expect(gebaut.phaseEntry).toBe(true);
  });

  it("bleibt deckungsgleich, wenn der Wochenplan die Vorgabe macht", () => {
    const exo = { ...squat, referenceWeight: 60, referencePhaseId: PHASE };
    const src = planSource({
      previousWeekEntryByExercise: { squat: lastHypertrophy },
    });
    const gebaut = buildLiveEntries(
      liveInput({ exercisesById: { squat: exo }, planSource: src }),
    ).entries[0]!;
    const view = coachViewFor(viewInput({ exo, planSource: src }))!;
    expect(view.status.weight).toBe(gebaut.sets[0]!.weight);
    expect(view.status.targetReps).toBe(gebaut.sets[0]!.targetReps);
    expect(view.scope).toBe("week");
  });
});
