// Phasen-Kontext: die eine Stelle, an der aus der aktiven Journey abgeleitet
// wird, wo man gerade steht (Phase, Woche, Repband, Lastfaktor). Der Lastfaktor
// ist zusaetzlich in lastfaktor.test.ts gedeckt; hier steht das Uebrige.

import { describe, expect, it } from "vitest";
import { buildComboWeekPlan, buildStrengthWeekPlan } from "@/engine";
import { derivePhaseContext } from "../phaseContext";
import type { PhaseContextJourney, SessionForPhase } from "../phaseContext";
import type { PhaseRow } from "@/schemas";

const JOURNEY_ID = "00000000-0000-0000-0000-0000000000aa";
const USER_ID = "00000000-0000-0000-0000-0000000000ff";

function phase(overrides: Partial<PhaseRow> = {}): PhaseRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: USER_ID,
    journey_id: JOURNEY_ID,
    name: "Aufbau",
    focus: "hypertrophy",
    weeks: 4,
    sets_start: 3,
    sets_end: 3,
    deload_week: null,
    rep_target_min: 8,
    rep_target_max: 12,
    load_factor: 1,
    week_plan: null,
    position: 0,
    ...overrides,
  };
}

function journeyWith(phases: PhaseRow[]): PhaseContextJourney {
  return {
    id: JOURNEY_ID,
    user_id: USER_ID,
    name: "Testjourney",
    active: true,
    status: "active",
    source_template_id: null,
    start_date: "2026-08-03",
    end_date: null,
    created_at: "2026-08-03T08:00:00.000Z",
    phases,
  };
}

describe("derivePhaseContext", () => {
  it("nimmt die gesetzten Grenzen als Repband der Phase", () => {
    const ctx = derivePhaseContext(journeyWith([phase()]), [], 3, "2026-08-05");
    expect(ctx.phaseRepTarget).toEqual([8, 12]);
    expect(ctx.phaseFocus).toEqual({ focus: "hypertrophy" });
    expect(ctx.journeyId).toBe(JOURNEY_ID);
  });

  it("faellt ohne gesetzte Grenzen auf das Band des Fokus zurueck", () => {
    const ctx = derivePhaseContext(
      journeyWith([
        phase({ focus: "strength", rep_target_min: null, rep_target_max: null }),
      ]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.phaseRepTarget).toEqual([4, 6]);
  });

  it("bleibt ohne Band, wenn auch der Fokus keins vorgibt", () => {
    const ctx = derivePhaseContext(
      journeyWith([
        phase({
          focus: "maintenance",
          rep_target_min: null,
          rep_target_max: null,
        }),
      ]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.phaseRepTarget).toBeNull();
  });

  it("gibt die Volumen-Phase und die Woche in der Phase heraus", () => {
    const ctx = derivePhaseContext(
      journeyWith([phase({ sets_start: 3, sets_end: 5, deload_week: 4 })]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.volumePhase).toEqual({
      setsStart: 3,
      setsEnd: 5,
      weeks: 4,
      deloadWeek: 4,
    });
    expect(ctx.weekInPhase).toBe(0);
  });

  it("bleibt ohne aktive Journey vollstaendig leer (freies Training)", () => {
    const ctx = derivePhaseContext(null, [], 3, "2026-08-05");
    expect(ctx).toEqual({
      phaseFocus: null,
      phaseRepTarget: null,
      volumePhase: null,
      weekInPhase: 0,
      journeyId: null,
      phaseId: null,
      loadFactor: null,
      loadNote: null,
      placement: null,
      phase: null,
      planWeek: null,
      prevPlanWeek: null,
      firstPlanWeek: null,
      comboWeek: false,
      anchorPhaseId: null,
    });
  });

  it("gibt Platzierung und laufende Phase heraus", () => {
    const ctx = derivePhaseContext(
      journeyWith([phase({ name: "Aufbau", weeks: 4 })]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.placement).toMatchObject({
      phaseIndex: 0,
      weekInPhase: 1,
      globalWeek: 1,
      done: false,
    });
    expect(ctx.phase?.name).toBe("Aufbau");
    expect(ctx.phaseId).toBe(ctx.phase?.id);
  });
});

// Kombiwoche (#229): die Testphase traegt einen Plan und holt ihre Last aus der
// vorangegangenen Kraftphase - dort liegt das Startgewicht X.
describe("derivePhaseContext – Kombiwoche der Testphase", () => {
  const KRAFT = "00000000-0000-0000-0000-000000000010";
  const TEST = "00000000-0000-0000-0000-000000000011";

  const phases = [
    phase({
      id: KRAFT,
      name: "Maximalkraft",
      focus: "strength",
      weeks: 1,
      week_plan: buildStrengthWeekPlan(1),
      position: 0,
    }),
    phase({
      id: TEST,
      name: "Übergang / Test",
      focus: "test",
      weeks: 1,
      week_plan: buildComboWeekPlan(1),
      position: 1,
    }),
  ];

  // Drei Einheiten in der ersten Kalenderwoche erfuellen sie: die Journey steht
  // eine Woche spaeter in der Testphase.
  const sessions: SessionForPhase[] = ["2026-08-03", "2026-08-04", "2026-08-05"].map(
    (date) => ({ date, status: "done", type: "strength", journey_id: JOURNEY_ID }),
  );

  it("erkennt die laufende Testphase als Kombiwoche", () => {
    const ctx = derivePhaseContext(journeyWith(phases), sessions, 3, "2026-08-12");
    expect(ctx.phaseId).toBe(TEST);
    expect(ctx.comboWeek).toBe(true);
    expect(ctx.planWeek).toMatchObject({ sets: 3, reps: 3, repsMax: 5, loadPct: 0.6 });
  });

  it("bindet den Anker an die Kraftphase davor", () => {
    const ctx = derivePhaseContext(journeyWith(phases), sessions, 3, "2026-08-12");
    expect(ctx.anchorPhaseId).toBe(KRAFT);
  });

  it("bleibt in der Kraftphase bei der eigenen Phase als Anker", () => {
    const ctx = derivePhaseContext(journeyWith(phases), [], 3, "2026-08-05");
    expect(ctx.phaseId).toBe(KRAFT);
    expect(ctx.comboWeek).toBe(false);
    expect(ctx.anchorPhaseId).toBe(KRAFT);
  });

  it("laesst den Anker leer, wenn keine Kraftphase vorausgeht", () => {
    const ctx = derivePhaseContext(
      journeyWith([phases[1]!]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.comboWeek).toBe(true);
    expect(ctx.anchorPhaseId).toBeNull();
  });
});
