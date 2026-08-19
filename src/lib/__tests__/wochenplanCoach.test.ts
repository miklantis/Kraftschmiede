// Der Wochenplan im Zusammenspiel: was die Kraftphase dem Coach vorgibt und was
// unveraendert beim Coach bleibt (Issue #225, Schritt 3).

import { describe, expect, it } from "vitest";
import { buildLiveEntries } from "../liveBuild";
import type { LiveBuildExercise, LiveBuildInput } from "../liveBuild";
import { planContextFor, type PlanSource } from "../planContext";
import { katalogPatch } from "../katalogPatch";
import { buildWeekEntries } from "../lastEntries";
import type { HistorySessionInput } from "../history";
import { buildStrengthWeekPlan, scoreForRir } from "@/engine";
import type { EngineSet, SetEntry } from "@/engine/types";

const PLAN = buildStrengthWeekPlan(5); // 5,5,4,3,2 – RIR 2, letzte zwei RIR 1
const PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];
const PHASE = "phase-kraft";

const bench: LiveBuildExercise = {
  id: "bench",
  key: "bench",
  name: "Bench Press",
  profile: "strength",
  tier: "main",
  equipment: "barbell",
  repRange: [4, 6],
  workWeight: 37.5,
  targetScore: 3,
  barId: "bar1",
  referenceWeight: 37.5,
  referencePhaseId: PHASE,
  rm: 50,
  muscleGroups: ["Brust"],
};
const curl: LiveBuildExercise = {
  ...bench,
  id: "curl",
  key: "curl",
  name: "Curl",
  tier: "accessory",
  workWeight: 20,
  referenceWeight: null,
  referencePhaseId: null,
  rm: null,
};

function set(over: Partial<EngineSet> = {}): EngineSet {
  return {
    type: "work",
    weight: 37.5,
    reps: 4,
    score: 3,
    failed: false,
    done: true,
    targetReps: 4,
    targetWeight: 37.5,
    ...over,
  };
}
function entry(sets: EngineSet[]): SetEntry {
  return { sets };
}

// Plan-Stand: Woche 3 der Phase (4 Wiederholungen, RIR 2).
function planSource(over: Partial<PlanSource> = {}): PlanSource {
  return {
    week: PLAN[2]!,
    prevWeek: PLAN[1]!,
    startReps: PLAN[0]!.reps,
    phaseId: PHASE,
    currentWeekEntryByExercise: {},
    previousWeekEntryByExercise: {},
    ...over,
  };
}

function input(overrides: Partial<LiveBuildInput> = {}): LiveBuildInput {
  return {
    exerciseIds: ["bench", "curl"],
    exercisesById: { bench, curl },
    phaseFocus: { focus: "strength" },
    phaseRepTarget: [4, 6],
    volumePhase: { setsStart: 4, setsEnd: 4, weeks: 5, deloadWeek: null },
    weekInPhase: 2,
    recoveryGreen: true,
    freeMode: false,
    loadFactor: null,
    planSource: planSource(),
    lastEntryByExercise: {},
    weightStep: 2.5,
    bars: [{ id: "bar1", name: "Olympia", weight: 20 }],
    plates: PLATES,
    dumbbells: [],
    unit: "kg",
    ...overrides,
  };
}

describe("Kraftphase mit Wochenplan – Hauptuebung", () => {
  it("gibt Saetze, Wiederholungen und Ziel-Anstrengung der Planwoche vor", () => {
    const r = buildLiveEntries(input());
    const en = r.entries[0]!;
    expect(en.sets).toHaveLength(4);
    expect(en.sets.every((s) => s.targetReps === 4)).toBe(true);
    expect(en.sets.every((s) => s.score === scoreForRir(2))).toBe(true);
  });

  it("haelt das Gewicht, wenn die Uebung in der Vorwoche nicht dran war", () => {
    const r = buildLiveEntries(input());
    expect(r.entries[0]!.sets[0]!.weight).toBe(37.5);
  });

  it("steigert um die Schrittweite, wenn die Vorwoche sauber war", () => {
    const r = buildLiveEntries(
      input({
        planSource: planSource({
          previousWeekEntryByExercise: {
            bench: entry([set(), set(), set(), set()]),
          },
        }),
      }),
    );
    expect(r.entries[0]!.sets[0]!.weight).toBe(40);
  });

  it("haelt das Gewicht, wenn die Vorwoche das Ziel verfehlt hat", () => {
    const r = buildLiveEntries(
      input({
        planSource: planSource({
          previousWeekEntryByExercise: {
            bench: entry([set(), set(), set(), set({ reps: 3 })]),
          },
        }),
      }),
    );
    expect(r.entries[0]!.sets[0]!.weight).toBe(37.5);
  });

  it("legt in derselben Woche dasselbe Gewicht auf wie beim ersten Mal", () => {
    const r = buildLiveEntries(
      input({
        planSource: planSource({
          currentWeekEntryByExercise: {
            bench: entry([set({ targetWeight: 40, weight: 40 })]),
          },
          previousWeekEntryByExercise: {
            bench: entry([set(), set(), set(), set()]),
          },
        }),
      }),
    );
    expect(r.entries[0]!.sets[0]!.weight).toBe(40);
  });

  it("setzt beim Phaseneintritt das Startgewicht aus dem 1RM", () => {
    const frisch: LiveBuildExercise = {
      ...bench,
      referenceWeight: null,
      referencePhaseId: null,
      rm: 50,
    };
    const r = buildLiveEntries(
      input({ exercisesById: { bench: frisch, curl }, exerciseIds: ["bench"] }),
    );
    // 50 kg 1RM, erste Planwoche 5 Wdh + 2 Reserve -> 40,5 -> 40 kg
    expect(r.entries[0]!.sets[0]!.weight).toBe(40);
  });

  it("ignoriert einen Anker, der an eine andere Phase gebunden ist", () => {
    const fremd: LiveBuildExercise = { ...bench, referencePhaseId: "andere-phase" };
    const r = buildLiveEntries(
      input({ exercisesById: { bench: fremd, curl }, exerciseIds: ["bench"] }),
    );
    expect(r.entries[0]!.sets[0]!.weight).toBe(40); // Startgewicht statt Anker
  });
});

describe("Kraftphase mit Wochenplan – was unberuehrt bleibt", () => {
  it("laesst Zusatzuebungen bei der Doppelprogression des Coaches", () => {
    const r = buildLiveEntries(input());
    const en = r.entries[1]!;
    // Repband der Phase (4-6), nicht die Planwiederholung 4 als feste Zahl
    expect(en.sets[0]!.targetReps).toBe(6);
    expect(en.sets[0]!.score).toBe(curl.targetScore);
  });

  it("bleibt ohne Wochenplan komplett beim bisherigen Verhalten", () => {
    const r = buildLiveEntries(input({ planSource: null }));
    expect(r.entries[0]!.sets[0]!.targetReps).toBe(6);
  });
});

describe("planContextFor – Anker der Phase", () => {
  it("nimmt den Anker nur bei passender Phasenbindung", () => {
    const gebunden = planContextFor(planSource(), {
      id: "bench",
      referenceWeight: 37.5,
      referencePhaseId: PHASE,
      rm: 50,
    });
    expect(gebunden?.anchor).toBe(37.5);
    const fremd = planContextFor(planSource(), {
      id: "bench",
      referenceWeight: 37.5,
      referencePhaseId: "andere-phase",
      rm: 50,
    });
    expect(fremd?.anchor).toBeNull();
  });

  it("gibt ohne Wochenplan null heraus", () => {
    expect(
      planContextFor(null, {
        id: "bench",
        referenceWeight: null,
        referencePhaseId: null,
        rm: null,
      }),
    ).toBeNull();
  });
});

describe("katalogPatch – Anker nach der Einheit", () => {
  const basis = {
    exerciseId: "bench",
    tracksRm: true,
    currentRm: 50,
    record1RM: null,
    est1RM: null,
    date: "2026-08-19",
  };

  it("zieht den Anker nach unten, wenn im Training reduziert wurde", () => {
    const p = katalogPatch({
      ...basis,
      workWeight: 35,
      planAnchor: { phaseId: PHASE, plannedWeight: 40 },
    });
    expect(p.reference_weight).toBe(35);
    expect(p.reference_phase_id).toBe(PHASE);
  });

  it("zieht nie nach oben mit, auch wenn mehr geladen wurde", () => {
    const p = katalogPatch({
      ...basis,
      workWeight: 45,
      planAnchor: { phaseId: PHASE, plannedWeight: 40 },
    });
    expect(p.reference_weight).toBe(40);
  });

  it("ruehrt den Anker ohne Wochenplan nicht an", () => {
    const p = katalogPatch({ ...basis, workWeight: 45 });
    expect(p.reference_weight).toBeUndefined();
    expect(p.reference_phase_id).toBeUndefined();
  });
});

describe("buildWeekEntries – letzte Einheit je Uebung in einer Journey-Woche", () => {
  // Verlauf aufsteigend nach Datum, wie ihn die Abfrage liefert.
  function sess(
    id: string,
    date: string,
    phaseId: string | null,
    weight: number,
  ): HistorySessionInput {
    return {
      id,
      date,
      phaseId,
      type: "strength",
      templateId: null,
      skillId: null,
      skillPhase: null,
      durationSec: null,
      minutes: null,
      notes: "",
      exercises: [
        {
          exerciseId: "bench",
          name: "Bench Press",
          metric: null,
          position: 0,
          sets: [
            {
              kind: "work",
              reps: 4,
              weight,
              durationSec: null,
              adjusted: false,
              score: 3,
              done: true,
              failed: false,
              targetReps: 4,
              targetWeight: weight,
            },
          ],
        },
      ],
    };
  }

  const verlauf = [
    sess("a", "2026-08-03", PHASE, 35),
    sess("b", "2026-08-06", PHASE, 37.5),
    sess("c", "2026-08-10", PHASE, 40),
    sess("d", "2026-08-12", "andere-phase", 45),
  ];
  // Kalenderwoche 32 = Journey-Woche 1, Kalenderwoche 33 = Journey-Woche 2.
  const weekOf = (date: string): number => (date < "2026-08-10" ? 1 : 2);

  it("nimmt je Woche die spaeteste Einheit der Uebung", () => {
    const w1 = buildWeekEntries(verlauf, weekOf, 1, PHASE);
    expect(w1.bench?.sets?.[0]?.weight).toBe(37.5);
  });

  it("blendet Einheiten anderer Phasen aus", () => {
    const w2 = buildWeekEntries(verlauf, weekOf, 2, PHASE);
    expect(w2.bench?.sets?.[0]?.weight).toBe(40);
  });

  it("bleibt ohne Phase leer", () => {
    expect(buildWeekEntries(verlauf, weekOf, 1, null)).toEqual({});
  });
});
