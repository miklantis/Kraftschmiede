import { describe, expect, it } from "vitest";
import {
  buildSuitabilityCtx,
  lastByExercise,
  rankWorkouts,
  recoveryGreen,
  weekCounts,
  type DoneSessionEntry,
} from "../coach";
import type { Exercise } from "@/engine/types";

const exMap: Record<string, Exercise> = {
  squat: { id: "squat", name: "Kniebeuge", kind: "main", muscleGroups: ["legs"], recoveryHours: 48 },
  bench: { id: "bench", name: "Bankdrücken", kind: "main", muscleGroups: ["chest"], recoveryHours: 48 },
};

describe("lastByExercise", () => {
  it("nimmt den spaetesten Einsatz je Uebung", () => {
    const done: DoneSessionEntry[] = [
      { date: "2026-01-01", exerciseIds: ["squat"] },
      { date: "2026-01-10", exerciseIds: ["squat", "bench"] },
    ];
    const map = lastByExercise(done);
    expect(map.squat).toBe(new Date("2026-01-10T12:00:00").getTime());
    expect(map.bench).toBe(new Date("2026-01-10T12:00:00").getTime());
  });
});

describe("weekCounts", () => {
  it("zaehlt nur Einheiten der laufenden Kalenderwoche", () => {
    const done: DoneSessionEntry[] = [
      { date: "2026-01-05", exerciseIds: ["squat"] }, // KW02
      { date: "2026-01-06", exerciseIds: ["squat"] }, // KW02
      { date: "2025-12-29", exerciseIds: ["squat"] }, // KW01
    ];
    expect(weekCounts(done, "2026-01-05")).toEqual({ squat: 2 });
  });
});

describe("recoveryGreen", () => {
  it("gruen bei niedrigem Kater und ausreichender Readiness", () => {
    expect(
      recoveryGreen({ legs: 1, upper_body: 0, overall: 1, readiness: 3 }),
    ).toBe(true);
  });

  it("nicht gruen bei Kater >= 2 oder niedriger Readiness", () => {
    expect(
      recoveryGreen({ legs: 2, upper_body: 0, overall: 0, readiness: 4 }),
    ).toBe(false);
    expect(
      recoveryGreen({ legs: 0, upper_body: 0, overall: 0, readiness: 2 }),
    ).toBe(false);
  });
});

describe("rankWorkouts", () => {
  it("sortiert nach Score absteigend, Ausschluss ans Ende", () => {
    const ctx = buildSuitabilityCtx({
      now: new Date("2026-01-20T12:00:00").getTime(),
      done: [{ date: "2026-01-19", exerciseIds: ["squat"] }], // Kniebeuge frisch
      today: "2026-01-20",
      body: { legs: 0, upper_body: 0, overall: 0, readiness: 3 },
      phase: { focus: "hypertrophy" },
      freqTarget: 3,
    });
    const templates = [
      { id: "w1", exerciseIds: ["squat"] }, // gerade erst trainiert -> unausgeruht
      { id: "w2", exerciseIds: ["bench"] }, // nie -> hoher Recency-Bonus
    ];
    const ranked = rankWorkouts(templates, ctx, exMap);
    expect(ranked[0].template.id).toBe("w2");
    expect(ranked[1].template.id).toBe("w1");
  });

  it("schliesst Workouts mit Kater=3 in betroffener Region aus", () => {
    const ctx = buildSuitabilityCtx({
      now: new Date("2026-01-20T12:00:00").getTime(),
      done: [],
      today: "2026-01-20",
      body: { legs: 3, upper_body: 0, overall: 0, readiness: 3 },
      phase: null,
      freqTarget: 3,
    });
    const ranked = rankWorkouts(
      [{ id: "legday", exerciseIds: ["squat"] }],
      ctx,
      exMap,
    );
    expect(ranked[0].excluded).toBe(true);
  });
});

// ---- Sitzungsaufbau (Lieferung 2) ------------------------------------------

import {
  coreCarry,
  suggestForExercise,
  suggestWithBar,
  coachStatusFromSuggestion,
  warmupFor,
  plannedSets,
  pickBarForTarget,
  type CoachBuildExercise,
  type CoachSuggestion,
} from "../coach";
import type { SetEntry } from "@/engine/types";

const STRENGTH: CoachBuildExercise = {
  key: "squat",
  profile: "strength",
  category: "barbell",
  repRange: [8, 12],
  workWeight: 60,
  targetScore: 3,
  barId: "bar1",
};
const CORE: CoachBuildExercise = {
  key: "plank",
  profile: "core",
  category: "core",
  repRange: [12, 20],
  workWeight: 0,
  targetScore: 3,
  barId: null,
};

describe("coreCarry", () => {
  it("uebernimmt den schwersten Arbeitssatz des letzten Eintrags", () => {
    const last: SetEntry = {
      sets: [
        { type: "warmup", weight: 10, reps: 10 },
        { type: "work", weight: 20, reps: 18 },
        { type: "work", weight: 24, reps: 15 },
      ],
    };
    const c = coreCarry(CORE, last);
    expect(c.weight).toBe(24);
    expect(c.targetReps).toBe(15);
    expect(c.decision).toBe("carry");
  });

  it("nimmt ohne Vordaten Startgewicht + oberes Repband", () => {
    const c = coreCarry(CORE, null);
    expect(c.weight).toBe(0);
    expect(c.targetReps).toBe(20);
    expect(c.decision).toBe("carry");
  });
});

describe("suggestForExercise", () => {
  it("leitet Core auf coreCarry um", () => {
    expect(suggestForExercise(CORE, { phase: null, lastEntry: null }).decision).toBe(
      "carry",
    );
  });

  it("haelt eine Kraftuebung ohne Vordaten am Startgewicht", () => {
    const s = suggestForExercise(STRENGTH, {
      phase: { focus: "hypertrophy" },
      lastEntry: null,
      bar: { weight: 20 },
    });
    expect(s.weight).toBe(60);
    expect(s.targetReps).toBe(12);
    expect(s.decision).toBe("hold");
  });

  it("ueberschreibt das Repband mit dem Phasen-Ziel", () => {
    const s = suggestForExercise(STRENGTH, {
      phase: { focus: "strength" },
      lastEntry: null,
      bar: { weight: 20 },
      repTarget: [4, 6],
    });
    expect(s.targetReps).toBe(6);
  });
});

describe("warmupFor", () => {
  it("baut nur fuer Langhantel mit Stange eine Rampe", () => {
    const w = warmupFor(STRENGTH, 60, { weight: 20 }, true, [1.25, 2.5, 5, 10, 20]);
    expect(w.length).toBeGreaterThan(0);
    expect(w[0]?.weight).toBe(20); // leere Stange zuerst
  });

  it("gibt fuer Nicht-Langhantel oder ohne Stange [] zurueck", () => {
    expect(warmupFor(CORE, 0, { weight: 20 }, true, [2.5])).toEqual([]);
    expect(warmupFor(STRENGTH, 60, null, true, [2.5])).toEqual([]);
  });
});

describe("plannedSets", () => {
  it("gibt ohne Phase 3 zurueck", () => {
    expect(plannedSets(null, 0, true)).toBe(3);
  });

  it("folgt der Satzrampe der Phase", () => {
    const phase = { setsStart: 2, setsEnd: 4, weeks: 4, deloadWeek: null };
    expect(plannedSets(phase, 0, true)).toBe(2);
    expect(plannedSets(phase, 3, true)).toBe(4);
  });
});

describe("pickBarForTarget", () => {
  const bars = [
    { id: "b20", weight: 20 },
    { id: "b125", weight: 12.5 },
    { id: "b10", weight: 10 },
  ];

  it("nimmt die schwerste Stange <= Zielgewicht", () => {
    expect(pickBarForTarget(17.5, bars).id).toBe("b125");
    expect(pickBarForTarget(25, bars).id).toBe("b20");
    expect(pickBarForTarget(12.5, bars).id).toBe("b125");
  });

  it("nimmt bei Ziel unter der leichtesten Stange die leichteste", () => {
    expect(pickBarForTarget(8, bars).id).toBe("b10");
    expect(pickBarForTarget(0, bars).id).toBe("b10");
  });

  it("ignoriert die Reihenfolge der Eingabe (sortiert selbst)", () => {
    const shuffled = [
      { id: "b10", weight: 10 },
      { id: "b20", weight: 20 },
      { id: "b125", weight: 12.5 },
    ];
    expect(pickBarForTarget(15, shuffled).id).toBe("b125");
  });

  it("trifft eine Stange auf den Cent genau", () => {
    expect(pickBarForTarget(20, bars).id).toBe("b20");
    expect(pickBarForTarget(10, bars).id).toBe("b10");
  });
});

describe("suggestWithBar", () => {
  it("waehlt bei Langhantel die schwerste Stange <= Ziel und gibt den Vorschlag", () => {
    const r = suggestWithBar(STRENGTH, {
      phaseFocus: { focus: "hypertrophy" },
      lastEntry: null,
      bars: [
        { id: "b20", name: "20er", weight: 20 },
        { id: "b12", name: "12,5er", weight: 12.5 },
      ],
      plates: [1.25, 2.5, 5, 10, 20],
      repTarget: null,
    });
    expect(r.bar?.id).toBe("b20"); // 20 <= 60, schwerste passende
    expect(r.suggestion.weight).toBe(60);
    expect(r.suggestion.decision).toBe("hold"); // keine Vordaten
  });

  it("gibt fuer Nicht-Langhantel keine Stange und leitet auf carry um", () => {
    const r = suggestWithBar(CORE, {
      phaseFocus: null,
      lastEntry: null,
      bars: [{ id: "b20", name: "20er", weight: 20 }],
      plates: [2.5],
      repTarget: null,
    });
    expect(r.bar).toBeNull();
    expect(r.suggestion.decision).toBe("carry");
  });
});

describe("coachStatusFromSuggestion", () => {
  const sug = (decision: CoachSuggestion["decision"]): CoachSuggestion => ({
    weight: 60,
    targetReps: 10,
    decision,
    note: "",
  });

  it("bildet die Engine-Entscheidung auf die grobe Lesart ab", () => {
    expect(coachStatusFromSuggestion(sug("increase"), true).state).toBe("up");
    expect(coachStatusFromSuggestion(sug("increase-reps"), true).state).toBe("up");
    expect(coachStatusFromSuggestion(sug("hold"), true).state).toBe("hold");
    expect(coachStatusFromSuggestion(sug("decrease"), true).state).toBe("down");
  });

  it("zeigt Begleituebungen als carry, unabhaengig von Vordaten", () => {
    expect(coachStatusFromSuggestion(sug("carry"), true).state).toBe("carry");
    expect(coachStatusFromSuggestion(sug("carry"), false).state).toBe("carry");
  });

  it("ohne Vordaten -> Start (vor der Auf/Halten/Senken-Wertung)", () => {
    expect(coachStatusFromSuggestion(sug("hold"), false).state).toBe("start");
    expect(coachStatusFromSuggestion(sug("increase"), false).state).toBe("start");
  });

  it("reicht Gewicht, Ziel-Wdh und Entscheidung durch", () => {
    const s = coachStatusFromSuggestion(sug("increase"), true);
    expect(s.weight).toBe(60);
    expect(s.targetReps).toBe(10);
    expect(s.decision).toBe("increase");
  });
});
