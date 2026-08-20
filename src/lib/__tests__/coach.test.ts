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
  squat: { id: "squat", name: "Kniebeuge", tier: "main", profile: "strength", muscleGroups: ["legs"], recoveryHours: 48 },
  bench: { id: "bench", name: "Bankdrücken", tier: "main", profile: "strength", muscleGroups: ["chest"], recoveryHours: 48 },
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
  planSuggestion,
  planOutlook,
  coachScopeFor,
  type CoachBuildExercise,
  type CoachSuggestion,
  type PlanContext,
} from "../coach";
import type { SetEntry } from "@/engine/types";
import type { WeekPlanWeek } from "@/engine";

const STRENGTH: CoachBuildExercise = {
  key: "squat",
  profile: "strength",
  tier: "main" as const,
  equipment: "barbell",
  repRange: [8, 12],
  workWeight: 60,
  targetScore: 3,
  barId: "bar1",
  referenceWeight: null,
  referencePhaseId: null,
};
const CORE: CoachBuildExercise = {
  key: "plank",
  profile: "core",
  tier: "accessory" as const,
  equipment: "bodyweight",
  repRange: [12, 20],
  workWeight: 0,
  targetScore: 3,
  barId: null,
  referenceWeight: null,
  referencePhaseId: null,
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
      dumbbells: [],
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
      dumbbells: [],
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
    reason: { code: "hold-hard" },
  });

  it("bildet die Engine-Entscheidung auf die grobe Lesart ab", () => {
    expect(coachStatusFromSuggestion(sug("increase"), true, "kg").state).toBe("up");
    expect(coachStatusFromSuggestion(sug("increase-reps"), true, "kg").state).toBe("up");
    expect(coachStatusFromSuggestion(sug("hold"), true, "kg").state).toBe("hold");
    expect(coachStatusFromSuggestion(sug("decrease"), true, "kg").state).toBe("down");
  });

  it("zeigt Begleituebungen als carry, unabhaengig von Vordaten", () => {
    expect(coachStatusFromSuggestion(sug("carry"), true, "kg").state).toBe("carry");
    expect(coachStatusFromSuggestion(sug("carry"), false, "kg").state).toBe("carry");
  });

  it("ohne Vordaten -> Start (vor der Auf/Halten/Senken-Wertung)", () => {
    expect(coachStatusFromSuggestion(sug("hold"), false, "kg").state).toBe("start");
    expect(coachStatusFromSuggestion(sug("increase"), false, "kg").state).toBe("start");
  });

  it("reicht Gewicht, Ziel-Wdh und Entscheidung durch", () => {
    const s = coachStatusFromSuggestion(sug("increase"), true, "kg");
    expect(s.weight).toBe(60);
    expect(s.targetReps).toBe(10);
    expect(s.decision).toBe("increase");
  });
});

// Issue #268, Schritt 1: der Wochenplan liefert Kennung und Differenz, den
// Satz baut lib/coachText.ts.
describe("planSuggestion – Kennung des Wochenplans", () => {
  const week = (o: Partial<WeekPlanWeek> = {}): WeekPlanWeek => ({
    week: 2,
    sets: 4,
    reps: 4,
    repsMax: null,
    rir: 2,
    loadPct: 1,
    note: "",
    ...o,
  });
  // Eine saubere Vorwoche: alle Saetze voll, in der Ziel-Anstrengung.
  const sauber: SetEntry = {
    sets: [1, 2, 3, 4].map(() => ({
      type: "work" as const,
      weight: 40,
      reps: 5,
      targetReps: 5,
      targetWeight: 40,
      score: 3,
      done: true,
    })),
  };
  const plan = (o: Partial<PlanContext> = {}): PlanContext => ({
    week: week(),
    prevWeek: week({ week: 1, reps: 5 }),
    nextWeek: null,
    startReps: 5,
    anchor: 40,
    currentWeekEntry: null,
    previousWeekEntry: null,
    rm: null,
    ...o,
  });
  const ctx = (p: PlanContext): Parameters<typeof planSuggestion>[1] => ({
    phase: null,
    lastEntry: null,
    weightStep: 2.5,
    bar: { weight: 20 },
    plates: [1.25, 2.5, 5, 10, 15, 20],
    plan: p,
  });

  it("Vorwoche sauber: Kennung plus echte Differenz", () => {
    const r = planSuggestion(STRENGTH, ctx(plan({ previousWeekEntry: sauber })));
    expect(r?.weight).toBe(42.5);
    expect(r?.reason).toEqual({ code: "plan-raised", diff: 2.5 });
  });

  it("Vorwoche verfehlt: Gewicht bleibt stehen", () => {
    const r = planSuggestion(STRENGTH, ctx(plan({ previousWeekEntry: null })));
    expect(r?.weight).toBe(40);
    expect(r?.reason).toEqual({ code: "plan-held", diff: 0 });
  });

  it("zweite Einheit derselben Woche: gleiche Vorgabe, keine Differenz", () => {
    const r = planSuggestion(
      STRENGTH,
      ctx(
        plan({
          currentWeekEntry: {
            sets: [
              { type: "work", weight: 42.5, reps: 4, targetReps: 4, targetWeight: 42.5, done: true },
            ],
          },
          previousWeekEntry: sauber,
        }),
      ),
    );
    expect(r?.reason).toEqual({ code: "plan-same-week", diff: 0 });
  });

  it("Zusatzuebung bleibt bei der Doppelprogression", () => {
    expect(planSuggestion(CORE, ctx(plan()))).toBeNull();
  });
});

// Issue #268, Schritt 2: Wochenvorgabe und Ausblick sind zwei getrennte
// Aussagen. Vorher trug die Karte das Gewicht der naechsten Woche neben den
// Wiederholungen der laufenden - ein Paar, das real nie vorkommt.
describe("planOutlook – Ausblick auf die naechste Woche", () => {
  const week = (o: Partial<WeekPlanWeek> = {}): WeekPlanWeek => ({
    week: 2,
    sets: 4,
    reps: 4,
    repsMax: null,
    rir: 2,
    loadPct: 1,
    note: "",
    ...o,
  });
  // Die laufende Einheit, sauber durchgezogen: 4 Saetze zu 4 Wdh. auf 42,5.
  const sauber: SetEntry = {
    sets: [1, 2, 3, 4].map(() => ({
      type: "work" as const,
      weight: 42.5,
      reps: 4,
      targetReps: 4,
      targetWeight: 42.5,
      score: 3,
      done: true,
    })),
  };
  // Dieselbe Einheit, aber ein Satz zu kurz.
  const verfehlt: SetEntry = {
    sets: sauber.sets!.map((st, i) => (i === 3 ? { ...st, reps: 2 } : st)),
  };
  const plan = (o: Partial<PlanContext> = {}): PlanContext => ({
    week: week(),
    prevWeek: week({ week: 1, reps: 5 }),
    nextWeek: week({ week: 3, reps: 3 }),
    startReps: 5,
    anchor: 42.5,
    currentWeekEntry: null,
    previousWeekEntry: null,
    rm: null,
    ...o,
  });
  const ctx = (p: PlanContext): Parameters<typeof planOutlook>[1] => ({
    phase: null,
    lastEntry: null,
    weightStep: 2.5,
    bar: { weight: 20 },
    plates: [1.25, 2.5, 5, 10, 15, 20],
    plan: p,
  });
  const heute = { weekWeight: 42.5, workedWeight: 42.5, judged: sauber };

  it("nimmt die Wiederholungen der Folgewoche, nicht die der laufenden", () => {
    const r = planOutlook(STRENGTH, ctx(plan()), heute);
    expect(r?.targetReps).toBe(3);
  });

  it("steigert, wenn die gewertete Einheit sauber war", () => {
    expect(planOutlook(STRENGTH, ctx(plan()), heute)?.weight).toBe(45);
  });

  it("haelt das Gewicht, wenn ein Satz zu kurz kam", () => {
    const r = planOutlook(STRENGTH, ctx(plan()), { ...heute, judged: verfehlt });
    expect(r?.weight).toBe(42.5);
  });

  it("zieht den Anker nach unten, wenn im Training reduziert wurde", () => {
    // 42,5 vorgegeben, real nur 40 bewegt: naechste Woche steht 40 an, nicht 42,5.
    const reduziert: SetEntry = {
      sets: sauber.sets!.map((st) => ({ ...st, weight: 40 })),
    };
    const r = planOutlook(STRENGTH, ctx(plan()), {
      weekWeight: 42.5,
      workedWeight: 40,
      judged: reduziert,
    });
    expect(r?.weight).toBe(40);
  });

  it("entfaellt in der letzten Phasenwoche", () => {
    expect(planOutlook(STRENGTH, ctx(plan({ nextWeek: null })), heute)).toBeNull();
  });

  it("entfaellt in der Entlastungswoche", () => {
    expect(planOutlook(STRENGTH, ctx(plan({ deload: true })), heute)).toBeNull();
  });

  it("entfaellt vor einer Woche ohne Einheit (reine Testwoche)", () => {
    const testwoche = week({ week: 3, sets: 0, reps: 1 });
    expect(planOutlook(STRENGTH, ctx(plan({ nextWeek: testwoche })), heute)).toBeNull();
  });

  it("gibt es fuer Zusatzuebungen nicht", () => {
    expect(planOutlook(CORE, ctx(plan()), heute)).toBeNull();
  });

  // #279: loadableDown fragt die Kurzhantel-Stufen zuerst ab. Eine mitgegebene
  // Liste hat die Langhantel auf die schwerste Kurzhantel gerundet - aus 55 kg
  // wurden 30.
  it("rundet die Langhantel auf die Scheiben-Stufe, nicht auf die Kurzhantel", () => {
    const mitKurzhanteln = {
      ...ctx(plan()),
      dumbbells: [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30],
    };
    expect(planOutlook(STRENGTH, mitKurzhanteln, heute)?.weight).toBe(45);
  });

  it("rundet Kurzhantel-Uebungen weiter auf die vorhandene Stufe", () => {
    const kurzhantel: CoachBuildExercise = {
      ...STRENGTH,
      equipment: "dumbbell",
      barId: null,
    };
    const r = planOutlook(
      kurzhantel,
      { ...ctx(plan({ anchor: 20 })), bar: undefined, dumbbells: [10, 15, 20, 25] },
      { weekWeight: 20, workedWeight: 20, judged: sauber },
    );
    expect(r?.weight).toBe(20);
  });
});

describe("coachScopeFor – welche Logik gerade gilt", () => {
  const plan = {
    week: {
      week: 2, sets: 4, reps: 4, repsMax: null, rir: 2, loadPct: 1, note: "",
    },
  } as unknown as PlanContext;

  it("Hauptuebung im Wochenplan spricht ueber die Woche", () => {
    expect(coachScopeFor(STRENGTH, plan)).toBe("week");
  });
  it("Zusatzuebung spricht ueber die naechste Einheit", () => {
    expect(coachScopeFor(CORE, plan)).toBe("next");
  });
  it("ohne Wochenplan spricht alles ueber die naechste Einheit", () => {
    expect(coachScopeFor(STRENGTH, null)).toBe("next");
  });
});

describe("coachStatusFromSuggestion – Satz aus der Kennung", () => {
  it("baut den sichtbaren Satz aus Kennung und Einheit", () => {
    const st = coachStatusFromSuggestion(
      {
        weight: 42.5,
        targetReps: 4,
        decision: "increase",
        reason: { code: "plan-raised", diff: 2.5 },
      },
      true,
      "kg",
    );
    expect(st.note).toBe(
      "Vorwoche sauber durchgezogen – deshalb liegen jetzt 2,5 kg mehr drauf.",
    );
    expect(st.reason.code).toBe("plan-raised");
  });
});
