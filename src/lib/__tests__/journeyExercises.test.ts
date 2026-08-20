import { describe, expect, it } from "vitest";
import {
  buildJourneyExerciseGroups,
  journeyExerciseIds,
} from "@/lib/journeyExercises";
import type { JourneyExerciseData } from "@/lib/journeyExercises";
import type { WorkoutExerciseInfo, WorkoutInput } from "@/lib/workouts";
import type { ExerciseRow } from "@/schemas";

// Kachel-Nutzlast einer Uebung; fuer die Gruppierung zaehlt nur, wie viele
// Einheiten (Daten) sie traegt.
function kachel(...dates: string[]): JourneyExerciseData {
  return {
    chart: { dates, series: [], marks: [] },
    stats: [{ value: String(dates.length), label: "Einheiten" }],
    coach: null,
  };
}

// Minimaler, ueberschreibbarer ExerciseRow fuer die Tests.
function ex(id: string, overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  return {
    id,
    user_id: "00000000-0000-0000-0000-0000000000ff",
    key: null,
    name: id,
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    bar_id: null,
    description: "",
    metric: null,
    muscle_groups: [],
    rep_range_min: null,
    rep_range_max: null,
    target_score: 3,
    work_weight: 0,
    reference_weight: null,
    reference_phase_id: null,
    plan_start_weight: null,
    recovery_hours: 48,
    rm: null,
    rm_as_of: null,
    rm_stale: false,
    position: 0,
    ...overrides,
  };
}

function workout(
  id: string,
  exerciseIds: string[],
  active = true,
): WorkoutInput {
  return {
    id,
    name: id,
    active,
    exercises: exerciseIds.map((exerciseId, i) => ({
      exerciseId,
      position: i,
    })),
  };
}

// Nachschlagewerk: alle Uebungen als Kraftuebung, sofern nicht anders gesetzt.
function lookupOf(
  entries: Record<string, string>,
): Record<string, WorkoutExerciseInfo | undefined> {
  const out: Record<string, WorkoutExerciseInfo | undefined> = {};
  for (const [id, profile] of Object.entries(entries)) {
    out[id] = { name: id, profile };
  }
  return out;
}

const lookup = lookupOf({
  kniebeuge: "strength",
  bankdruecken: "strength",
  rudern: "strength",
  plank: "core",
  klimmzug: "bodyweight",
});

describe("journeyExerciseIds", () => {
  const push = workout("push", ["bankdruecken", "plank"]);
  const pull = workout("pull", ["klimmzug", "rudern"]);
  const legs = workout("legs", ["kniebeuge", "plank"]);

  it("nimmt nur die Uebungen der zugewiesenen Workouts", () => {
    const ids = journeyExerciseIds([push, pull, legs], lookup, new Set(["push"]));
    expect(ids).toEqual(["bankdruecken", "plank"]);
  });

  it("dedupliziert eine Uebung aus mehreren Workouts", () => {
    const ids = journeyExerciseIds(
      [push, pull, legs],
      lookup,
      new Set(["push", "legs"]),
    );
    expect(ids).toEqual(["bankdruecken", "plank", "kniebeuge"]);
  });

  it("faellt ohne Zuweisung nicht auf die Bibliothek zurueck", () => {
    expect(journeyExerciseIds([push, pull, legs], lookup, new Set())).toEqual(
      [],
    );
  });

  it("laesst archivierte und nicht journey-faehige Workouts weg", () => {
    const archiviert = workout("alt", ["rudern"], false);
    const ohneKraft = workout("mobility", ["plank"]);
    const ids = journeyExerciseIds(
      [archiviert, ohneKraft, push],
      lookup,
      new Set(["alt", "mobility", "push"]),
    );
    expect(ids).toEqual(["bankdruecken", "plank"]);
  });
});

describe("buildJourneyExerciseGroups", () => {
  const katalog: ExerciseRow[] = [
    ex("kniebeuge", { position: 0 }),
    ex("bankdruecken", { position: 1 }),
    ex("rudern", { position: 2, tier: "accessory" }),
    ex("plank", { position: 3, profile: "core", metric: "duration" }),
    ex("klimmzug", { position: 4, profile: "bodyweight" }),
  ];

  it("gruppiert wie die Uebungsseite und haelt die Katalog-Reihenfolge", () => {
    const groups = buildJourneyExerciseGroups(
      katalog,
      new Set(["klimmzug", "plank", "rudern", "bankdruecken", "kniebeuge"]),
      {},
    );
    expect(groups.map((g) => g.title)).toEqual([
      "Hauptübungen",
      "Assistenz",
      "Core",
      "Körpergewicht",
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual([
      "kniebeuge",
      "bankdruecken",
    ]);
  });

  it("laesst leere Gruppen und nicht zugewiesene Uebungen weg", () => {
    const groups = buildJourneyExerciseGroups(
      katalog,
      new Set(["kniebeuge"]),
      {},
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(["kniebeuge"]);
  });

  it("zaehlt die Einheiten aus den Chart-Daten; ohne Einheit bleibt es 0", () => {
    const kniebeuge = kachel("2026-01-05", "2026-01-12", "2026-01-19");
    const groups = buildJourneyExerciseGroups(
      katalog,
      new Set(["kniebeuge", "bankdruecken"]),
      { kniebeuge },
    );
    expect(groups[0].items).toEqual([
      {
        id: "kniebeuge",
        name: "kniebeuge",
        sessionCount: 3,
        chart: kniebeuge.chart,
        stats: kniebeuge.stats,
        coach: null,
      },
      {
        id: "bankdruecken",
        name: "bankdruecken",
        sessionCount: 0,
        chart: null,
        stats: [],
        coach: null,
      },
    ]);
  });

  it("behandelt eine leere Kachel-Nutzlast wie keine Einheit", () => {
    const groups = buildJourneyExerciseGroups(katalog, new Set(["kniebeuge"]), {
      kniebeuge: kachel(),
    });
    expect(groups[0].items[0].sessionCount).toBe(0);
    expect(groups[0].items[0].chart).toBeNull();
    expect(groups[0].items[0].stats).toEqual([]);
  });

  it("ignoriert Ids, die es im Katalog nicht mehr gibt", () => {
    const groups = buildJourneyExerciseGroups(
      katalog,
      new Set(["geloescht"]),
      {},
    );
    expect(groups).toEqual([]);
  });
});
