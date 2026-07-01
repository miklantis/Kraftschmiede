import { describe, expect, it } from "vitest";
import {
  buildHistoryModel,
  buildHistorySession,
  calLabel,
  kindOf,
  sessionTitle,
  tagLabel,
  type HistoryLookups,
  type HistorySessionInput,
} from "../history";

const lk: HistoryLookups = {
  exerciseName: (id) => ({ sq: "Kniebeuge", bp: "Bankdrücken" })[id],
  templateName: (id) => ({ t1: "Ganzkörper A" })[id],
  skillName: (id) => ({ s1: "Pull-up" })[id],
};

function strength(over: Partial<HistorySessionInput> = {}): HistorySessionInput {
  return {
    id: "x",
    date: "2026-06-20",
    type: "strength",
    templateId: "t1",
    skillId: null,
    skillPhase: null,
    durationSec: 2700,
    minutes: null,
    notes: "",
    exercises: [
      {
        exerciseId: "sq",
        name: null,
        metric: "reps",
        position: 0,
        sets: [
          { kind: "warmup", reps: 5, weight: 60, durationSec: null, adjusted: false },
          { kind: "work", reps: 5, weight: 100, durationSec: null, adjusted: false },
          { kind: "work", reps: 5, weight: 100, durationSec: null, adjusted: false },
        ],
      },
    ],
    ...over,
  };
}

describe("Klassifikation", () => {
  it("Kraft ohne Abweichung -> kraft", () => {
    expect(kindOf(strength())).toBe("kraft");
    expect(tagLabel(strength())).toBe("Kraft");
  });

  it("Kraft mit angepasstem Satz -> dev/Abweichung", () => {
    const s = strength();
    s.exercises[0].sets[1].adjusted = true;
    expect(kindOf(s)).toBe("dev");
    expect(tagLabel(s)).toBe("Abweichung");
  });

  it("Skill und Yoga nach Typ", () => {
    expect(kindOf(strength({ type: "skill", skillId: "s1" }))).toBe("skill");
    expect(kindOf(strength({ type: "yoga" }))).toBe("yoga");
  });
});

describe("Titel und Kalender-Label", () => {
  it("Workout-Titel aus Vorlagenname", () => {
    expect(sessionTitle(strength(), lk)).toBe("Ganzkörper A");
    expect(calLabel(strength(), lk)).toBe("Ganzkörper A");
  });

  it("Skill-Titel aus Skillname", () => {
    const s = strength({ type: "skill", skillId: "s1", templateId: null });
    expect(sessionTitle(s, lk)).toBe("Pull-up");
    expect(calLabel(s, lk)).toBe("Pull-up");
  });

  it("Yoga-Titel fest, Label 'Yoga'", () => {
    const s = strength({ type: "yoga", templateId: null });
    expect(sessionTitle(s, lk)).toBe("Yoga / Mobility");
    expect(calLabel(s, lk)).toBe("Yoga");
  });
});

describe("Detail-Aufbereitung", () => {
  it("Kraft: jeder Arbeitssatz als Wdh × Gewicht (ohne Aufwaermen)", () => {
    const hs = buildHistorySession(strength(), lk);
    expect(hs.durationLabel).toBe("45 min");
    expect(hs.detail).toEqual([
      { label: "Kniebeuge", lines: ["5 × 100 kg", "5 × 100 kg"] },
    ]);
  });

  it("Kraft: Score je Satz wird angehaengt", () => {
    const s = strength();
    s.exercises[0].sets[1].score = 3;
    s.exercises[0].sets[2].score = 4;
    const hs = buildHistorySession(s, lk);
    expect(hs.detail).toEqual([
      { label: "Kniebeuge", lines: ["5 × 100 kg · S3", "5 × 100 kg · S4"] },
    ]);
  });

  it("Skill mit Haltezeit: Sekunden", () => {
    const s = strength({
      type: "skill",
      skillId: "s1",
      templateId: null,
      durationSec: 600,
      exercises: [
        {
          exerciseId: null,
          name: "Hang",
          metric: "duration",
          position: 0,
          sets: [
            { kind: "work", reps: null, weight: null, durationSec: 12, adjusted: false },
            { kind: "work", reps: null, weight: null, durationSec: 10, adjusted: false },
          ],
        },
      ],
    });
    const hs = buildHistorySession(s, lk);
    expect(hs.durationLabel).toBe("10 min");
    expect(hs.detail).toEqual([{ label: "Hang", lines: ["12 s", "10 s"] }]);
  });

  it("Yoga: Minuten als Dauer, Notiz als Zeile", () => {
    const s = strength({
      type: "yoga",
      templateId: null,
      durationSec: null,
      minutes: 30,
      notes: "Rücken locker",
      exercises: [],
    });
    const hs = buildHistorySession(s, lk);
    expect(hs.durationLabel).toBe("30 min");
    expect(hs.detail).toEqual([{ label: "Notiz", lines: ["Rücken locker"] }]);
  });
});

describe("Modellaufbau", () => {
  it("Liste neueste zuerst, Kalender nach Datum gruppiert", () => {
    const a = strength({ id: "a", date: "2026-06-18" });
    const b = strength({ id: "b", date: "2026-06-20" });
    const model = buildHistoryModel([a, b], lk);
    expect(model.sessions.map((s) => s.id)).toEqual(["b", "a"]);
    expect(model.byDate["2026-06-18"]).toHaveLength(1);
    expect(model.byDate["2026-06-20"][0].kind).toBe("kraft");
  });
});
