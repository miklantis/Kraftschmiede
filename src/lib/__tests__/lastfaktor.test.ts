// Lastfaktor-Rampe (Journey "Wiederaufbau nach Fasten"): die Journey gibt das
// Arbeitsgewicht selbst vor – Referenzgewicht x Lastfaktor der Phase – statt es
// aus der letzten Leistung abzuleiten. Geprueft wird die ganze Kette: die
// Vorgabe in der Engine (suggestWeight), die Ableitung des Lastfaktors aus der
// Journey (derivePhaseContext) und der fertige Sitzungsaufbau (buildLiveEntries).

import { describe, expect, it } from "vitest";
import { suggestWeight } from "@/engine";
import type { EngineSet, SetEntry } from "@/engine/types";
import { derivePhaseContext } from "../phaseContext";
import type { PhaseContextJourney } from "../phaseContext";
import { buildLiveEntries } from "../liveBuild";
import type { LiveBuildExercise, LiveBuildInput } from "../liveBuild";
import type { PhaseRow } from "@/schemas";

const PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];
const BAR = { weight: 20 };
// Stand vor der Pause. Auf 2,5-kg-Schritte abgerundet ergibt die Rampe
// 0.65 -> 37.5, 0.80 -> 47.5, 0.95 -> 55, 1.00 -> 60.
const REF = 60;

const EX = { workWeight: REF, repRange: [8, 12] as [number, number], targetScore: 3 };
const entry = (sets: EngineSet[]): SetEntry => ({ sets });
const work = (o: Partial<EngineSet>): EngineSet => ({
  type: "work",
  weight: 60,
  reps: 8,
  done: true,
  targetReps: 8,
  targetWeight: 60,
  score: 3,
  ...o,
});

// Vorschlag mit der Vorgabe einer Lastfaktor-Phase.
function withFactor(
  factor: number,
  workWeight: number,
  last: SetEntry | null,
): ReturnType<typeof suggestWeight> {
  return suggestWeight({ ...EX, workWeight }, last, {
    bar: BAR,
    plates: PLATES,
    ramp: { weight: REF * factor, cap: factor < 1 },
  });
}

// Eine saubere, leichte Einheit auf `weight` – der Coach wuerde steigern wollen.
const easy = (weight: number): SetEntry =>
  entry([
    work({ weight, reps: 12, targetWeight: weight, targetReps: 12, score: 2 }),
    work({ weight, reps: 12, targetWeight: weight, targetReps: 12, score: 2 }),
  ]);

describe("Lastfaktor-Rampe in der Gewichtssteuerung", () => {
  it("Rampe 0.65 -> 0.80 -> 0.95 -> 1.00 landet exakt beim Ausgangsgewicht", () => {
    // Woche 1: erste Einheit der Journey, noch keine Vordaten. Das
    // Arbeitsgewicht steht noch auf dem Stand vor der Pause und wird gedeckelt.
    const w1 = withFactor(0.65, REF, null);
    expect(w1.weight).toBe(37.5);

    // Woche 2-4: jede Woche uebernimmt das Gewicht der neuen Phase, in einem
    // Schritt – die Deckelung nach oben darf hier nicht bremsen.
    const w2 = withFactor(0.8, w1.weight, easy(w1.weight));
    expect(w2.weight).toBe(47.5);
    expect(w2.decision).toBe("increase");

    const w3 = withFactor(0.95, w2.weight, easy(w2.weight));
    expect(w3.weight).toBe(55);

    const w4 = withFactor(1, w3.weight, easy(w3.weight));
    expect(w4.weight).toBe(REF);
  });

  it("deckelt innerhalb einer Lastfaktor-Phase: kein Steigern ueber die Phasenlast", () => {
    // Zweite Einheit derselben Woche nach einer leichten ersten: die doppelte
    // Progression wollte auf 40 – die Phase laesst nur 37.5 zu.
    const r = withFactor(0.65, 37.5, easy(37.5));
    expect(r.weight).toBe(37.5);
    expect(r.decision).toBe("hold");
    // Reps bleiben oben im Band statt auf das Minimum zurueckzufallen.
    expect(r.targetReps).toBe(12);
  });

  it("laesst den Coach nach unten weiter reagieren", () => {
    const last = entry([
      work({ weight: 37.5, targetWeight: 37.5, reps: 5, failed: true, score: 5 }),
    ]);
    const r = withFactor(0.65, 37.5, last);
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(35);
  });

  it("Abschlussphase (Lastfaktor 1) stuetzt nur nach unten, deckelt nicht", () => {
    // Auf dem alten Niveau angekommen darf der Coach wieder normal steigern.
    const r = withFactor(1, REF, easy(REF));
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
  });

  it("Wiedereinstiegsphase: uebernimmt die Phasenlast, haelt aber nach Schmerz", () => {
    const ramp = { weight: REF * 0.8, cap: true };
    const ok = suggestWeight({ ...EX, workWeight: 37.5 }, easy(37.5), {
      bar: BAR,
      plates: PLATES,
      reentry: true,
      ramp,
    });
    expect(ok.weight).toBe(47.5);

    const pain = suggestWeight(
      { ...EX, workWeight: 37.5 },
      entry([work({ weight: 37.5, targetWeight: 37.5, painFlag: true })]),
      { bar: BAR, plates: PLATES, reentry: true, ramp },
    );
    expect(pain.decision).toBe("hold");
    expect(pain.weight).toBe(37.5);
  });

  it("ohne Vorgabe rechnet der Coach unveraendert aus der letzten Leistung", () => {
    const r = suggestWeight({ ...EX, workWeight: 37.5 }, easy(37.5), {
      bar: BAR,
      plates: PLATES,
    });
    expect(r.weight).toBe(40);
    expect(r.decision).toBe("increase");
  });
});

// --- Lastfaktor aus der Journey ableiten ---

function phase(name: string, loadFactor: number, position: number): PhaseRow {
  return {
    id: "00000000-0000-0000-0000-00000000000" + position,
    user_id: "00000000-0000-0000-0000-0000000000ff",
    journey_id: "00000000-0000-0000-0000-0000000000aa",
    name,
    focus: "hypertrophy",
    weeks: 1,
    sets_start: 3,
    sets_end: 3,
    deload_week: null,
    rep_target_min: 8,
    rep_target_max: 12,
    load_factor: loadFactor,
    position,
  };
}

function journeyWith(phases: PhaseRow[]): PhaseContextJourney {
  return {
    id: "00000000-0000-0000-0000-0000000000aa",
    user_id: "00000000-0000-0000-0000-0000000000ff",
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

describe("derivePhaseContext – Lastfaktor", () => {
  it("gibt den Lastfaktor der aktuellen Phase heraus", () => {
    const ctx = derivePhaseContext(
      journeyWith([phase("Tasten", 0.65, 0), phase("Reaktivieren", 0.8, 1)]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.loadFactor).toBe(0.65);
  });

  it("bleibt bei einer Journey ohne Lastfaktor leer", () => {
    // Wichtig, damit ein liegengebliebenes Referenzgewicht eine normale Journey
    // nicht auf das alte Niveau festnagelt.
    const ctx = derivePhaseContext(
      journeyWith([phase("Hypertrophie", 1, 0), phase("Kraft", 1, 1)]),
      [],
      3,
      "2026-08-05",
    );
    expect(ctx.loadFactor).toBeNull();
  });
});

// --- Sitzungsaufbau ---

const squat: LiveBuildExercise = {
  id: "squat",
  key: "squat",
  name: "Kniebeuge",
  profile: "strength",
  equipment: "barbell",
  repRange: [8, 12],
  workWeight: REF,
  targetScore: 3,
  barId: "bar1",
  referenceWeight: REF,
  rm: 120,
  muscleGroups: ["Beine"],
};

function input(overrides: Partial<LiveBuildInput> = {}): LiveBuildInput {
  return {
    exerciseIds: ["squat"],
    exercisesById: { squat },
    phaseFocus: { focus: "hypertrophy" },
    phaseRepTarget: [8, 10],
    volumePhase: { setsStart: 3, setsEnd: 3, weeks: 1, deloadWeek: null },
    weekInPhase: 0,
    recoveryGreen: true,
    freeMode: false,
    loadFactor: 0.65,
    lastEntryByExercise: {},
    bars: [{ id: "bar1", name: "Langhantel", weight: 20 }],
    plates: PLATES,
    dumbbells: [],
    unit: "kg",
    ...overrides,
  };
}

describe("buildLiveEntries – Lastfaktor", () => {
  it("baut die Einheit mit der Phasenlast statt aus dem 1RM", () => {
    // Das 1RM wuerde fuer 8-10 Wdh. deutlich mehr hergeben; die Journey gibt vor.
    const res = buildLiveEntries(input());
    expect(res.entries[0]!.sets[0]!.weight).toBe(37.5);
    expect(res.entries[0]!.phaseEntry).toBe(false);
  });

  it("ohne Lastfaktor bleibt der bisherige Aufbau unveraendert", () => {
    const res = buildLiveEntries(
      input({
        loadFactor: null,
        exercisesById: { squat: { ...squat, referenceWeight: null } },
      }),
    );
    expect(res.entries[0]!.sets[0]!.weight).toBe(REF);
  });
});
