import { describe, expect, it } from "vitest";
import {
  groupExercises,
  exerciseRowMeta,
  exerciseRowSub,
} from "@/lib/exercises";
import type { ExerciseRow } from "@/schemas";

// Minimaler, ueberschreibbarer ExerciseRow fuer die Tests.
function ex(overrides: Partial<ExerciseRow>): ExerciseRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "00000000-0000-0000-0000-0000000000ff",
    key: null,
    name: "Übung",
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
    recovery_hours: 48,
    rm: null,
    rm_as_of: null,
    rm_stale: false,
    position: 0,
    ...overrides,
  };
}

describe("exerciseRowMeta", () => {
  it("zeigt bei Hauptuebungen das 1RM, ersatzweise das Arbeitsgewicht", () => {
    expect(exerciseRowMeta(ex({ rm: 120 }), "kg")).toBe("1RM 120 kg");
    expect(exerciseRowMeta(ex({ rm: null, work_weight: 80 }), "kg")).toBe(
      "Arbeit 80 kg",
    );
  });

  it("zeigt bei Core/Assistenz Arbeitsgewicht x Zielwiederholungen", () => {
    expect(
      exerciseRowMeta(
        ex({ profile: "core", work_weight: 20, rep_range_max: 15 }),
        "kg",
      ),
    ).toBe("20 kg × 15");
    expect(
      exerciseRowMeta(
        ex({ tier: "accessory", work_weight: 30, rep_range_max: 12 }),
        "kg",
      ),
    ).toBe("30 kg × 12");
  });

  it("zeigt bei Koerpergewicht Wiederholungen bzw. Haltezeit", () => {
    expect(
      exerciseRowMeta(
        ex({ profile: "bodyweight", metric: "reps", rep_range_max: 10 }),
        "kg",
      ),
    ).toBe("10 Wdh");
    expect(
      exerciseRowMeta(
        ex({ profile: "bodyweight", metric: "duration", rep_range_max: 45 }),
        "kg",
      ),
    ).toBe("45 s");
  });

  it("respektiert die Einheit", () => {
    expect(exerciseRowMeta(ex({ rm: 250 }), "lb")).toBe("1RM 250 lb");
  });
});

describe("exerciseRowSub", () => {
  it("zeigt die Muskelgruppen ohne core, mit Mittelpunkt getrennt", () => {
    expect(
      exerciseRowSub(ex({ muscle_groups: ["beine", "gesaess", "core"] })),
    ).toBe("beine · gesaess");
  });

  it("faellt auf die Uebungsart zurueck, wenn keine Gruppe (ausser core) da ist", () => {
    expect(exerciseRowSub(ex({ tier: "accessory", muscle_groups: [] }))).toBe(
      "Assistenz",
    );
    expect(exerciseRowSub(ex({ profile: "core", muscle_groups: ["core"] }))).toBe(
      "Core",
    );
  });
});

describe("groupExercises", () => {
  it("ordnet Uebungen den richtigen Gruppen in der V1-Reihenfolge zu", () => {
    const list = [
      ex({ id: "a", name: "Squat", tier: "main", profile: "strength" }),
      ex({ id: "b", name: "Curl", tier: "accessory", profile: "strength" }),
      ex({ id: "c", name: "Situps", profile: "core" }),
      ex({ id: "d", name: "Pushup", profile: "bodyweight" }),
    ];
    const groups = groupExercises(list, "kg");
    expect(groups.map((g) => g.title)).toEqual([
      "Hauptübungen",
      "Assistenz",
      "Core",
      "Körpergewicht",
    ]);
    expect(groups[0].items[0].name).toBe("Squat");
    expect(groups[3].items[0].name).toBe("Pushup");
  });

  it("laesst leere Gruppen weg und behaelt die Eingabereihenfolge je Gruppe", () => {
    const list = [
      ex({ id: "a", name: "A", position: 0 }),
      ex({ id: "b", name: "B", position: 1 }),
    ];
    const groups = groupExercises(list, "kg");
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("Hauptübungen");
    expect(groups[0].items.map((i) => i.name)).toEqual(["A", "B"]);
  });
});
