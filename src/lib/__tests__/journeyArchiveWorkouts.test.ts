import { describe, expect, it } from "vitest";
import { buildArchiveWorkouts } from "@/lib/journeyArchiveWorkouts";
import type { HistorySessionInput } from "@/lib/history";

const lk = {
  templateName: (id: string) =>
    ({ push: "Ganzkörper A", pull: "Ganzkörper B" })[id],
  exerciseName: (id: string) =>
    ({
      kniebeuge: "Kniebeuge",
      bankdruecken: "Bankdrücken",
      rudern: "Rudern",
    })[id],
};

// Eine absolvierte Einheit. exerciseIds in Reihenfolge; "" = Zeile ohne
// Katalogbezug (dann zaehlt der Name in der Einheit).
function einheit(
  over: Partial<HistorySessionInput>,
  ...exerciseIds: string[]
): HistorySessionInput {
  return {
    id: "s" + Math.random(),
    date: "2026-01-05",
    journeyId: "j1",
    type: "strength",
    templateId: "push",
    templateName: null,
    skillId: null,
    skillPhase: null,
    durationSec: null,
    minutes: null,
    notes: "",
    exercises: exerciseIds.map((raw, i) => {
      const [id, fallback] = raw.split(":");
      return {
        exerciseId: id === "" ? null : id,
        name: fallback ?? id,
        metric: null,
        position: i,
        sets: [
          {
            kind: "work" as const,
            reps: 8,
            weight: 60,
            durationSec: null,
            adjusted: false,
          },
        ],
      };
    }),
    ...over,
  };
}

describe("buildArchiveWorkouts", () => {
  it("zaehlt je Workout und nimmt den eingebrannten Namen", () => {
    const { workouts } = buildArchiveWorkouts(
      "j1",
      [
        einheit({ templateId: "push", templateName: "Push (damals)" }, "kniebeuge"),
        einheit({ templateId: "push", templateName: "Push (damals)" }, "kniebeuge"),
        einheit({ templateId: "pull", templateName: "Pull (damals)" }, "rudern"),
      ],
      lk,
    );

    expect(workouts.map((w) => [w.name, w.count])).toEqual([
      ["Push (damals)", 2],
      ["Pull (damals)", 1],
    ]);
    expect(workouts[0].meta).toBe("2 Einheiten");
    expect(workouts[1].meta).toBe("1 Einheit");
  });

  it("loest ohne eingebrannten Namen heute auf", () => {
    const { workouts } = buildArchiveWorkouts(
      "j1",
      [einheit({ templateId: "pull" }, "rudern")],
      lk,
    );
    expect(workouts[0].name).toBe("Ganzkörper B");
  });

  it("sammelt die Uebungen neueste Einheit zuerst, aeltere haengen an", () => {
    const { workouts } = buildArchiveWorkouts(
      "j1",
      [
        einheit({ date: "2026-01-05" }, "kniebeuge", "rudern"),
        einheit({ date: "2026-02-10" }, "kniebeuge", "bankdruecken"),
      ],
      lk,
    );
    // Zuletzt trainiert: Kniebeuge, Bankdruecken. Rudern wurde ausgetauscht und
    // steht hinten - es gehoerte zu dieser Journey.
    expect(workouts[0].summary).toBe("Kniebeuge · Bankdrücken · Rudern");
  });

  it("nimmt bei Uebungen den Katalognamen, sonst den Namen der Einheit", () => {
    const { workouts } = buildArchiveWorkouts(
      "j1",
      [einheit({}, "kniebeuge:Alter Name", ":Handstand")],
      lk,
    );
    expect(workouts[0].summary).toBe("Kniebeuge · Handstand");
  });

  it("zaehlt nur die eigene Journey, Yoga und Skill nur in der Summe", () => {
    const res = buildArchiveWorkouts(
      "j1",
      [
        einheit({}, "kniebeuge"),
        einheit({ type: "yoga", templateId: null }),
        einheit({ type: "skill", templateId: null, skillId: "s1" }),
        einheit({ journeyId: "j2" }, "kniebeuge"),
        einheit({ journeyId: null }, "kniebeuge"),
      ],
      lk,
    );
    expect(res.totalUnits).toBe(3);
    expect(res.workouts).toHaveLength(1);
    expect(res.workouts[0].count).toBe(1);
  });

  it("fasst namenlose Workouts still zusammen und stellt sie zuletzt", () => {
    const { workouts } = buildArchiveWorkouts(
      "j1",
      [
        einheit({ templateId: "geloescht" }, "kniebeuge"),
        einheit({ templateId: null }, "rudern"),
        einheit({ templateId: "push", templateName: "Push" }, "kniebeuge"),
      ],
      lk,
    );
    expect(workouts.map((w) => w.name)).toEqual(["Push", "Ohne Workout"]);
    expect(workouts[1].count).toBe(2);
    expect(workouts[1].id).toBe("");
  });

  it("sortiert bei Gleichstand nach Namen", () => {
    const { workouts } = buildArchiveWorkouts(
      "j1",
      [
        einheit({ templateId: "pull", templateName: "Zug" }, "rudern"),
        einheit({ templateId: "push", templateName: "Druck" }, "bankdruecken"),
      ],
      lk,
    );
    expect(workouts.map((w) => w.name)).toEqual(["Druck", "Zug"]);
  });

  it("bleibt ohne Einheiten leer", () => {
    const res = buildArchiveWorkouts("j1", [], lk);
    expect(res.workouts).toEqual([]);
    expect(res.totalUnits).toBe(0);
  });
});
