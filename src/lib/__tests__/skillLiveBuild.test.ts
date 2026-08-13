import { describe, expect, it } from "vitest";
import {
  buildSkillLive,
  type SkillBuildDef,
  type SkillBuildProgress,
} from "../skillLiveBuild";

const DEF: SkillBuildDef = {
  id: "skill-1",
  name: "Strict Pull-Up",
  phases: [
    {
      consecutiveSessions: 2,
      equipment: ["pullup-bar"],
      exercises: [
        { name: "Dead Hang", metric: "duration", target: 30, sets: 3, tempo: null, exerciseId: "ex-dead-hang" },
        { name: "Scapular Pull-Up", metric: "reps", target: 5, sets: 3, tempo: "langsam", exerciseId: null },
      ],
    },
    {
      consecutiveSessions: 2,
      equipment: ["pullup-bar", "band-heavy"],
      exercises: [
        { name: "Band Pull-Up", metric: "reps", target: 6, sets: 3, tempo: null, exerciseId: "ex-band" },
      ],
    },
  ],
};

function prog(over: Partial<SkillBuildProgress> = {}): SkillBuildProgress {
  return { currentPhase: 0, consecutiveCount: 0, mastered: false, ...over };
}

describe("buildSkillLive", () => {
  it("baut die aktuelle Phase mit leeren Ergebnis-Saetzen", () => {
    const r = buildSkillLive(DEF, prog());
    expect(r).not.toBeNull();
    expect(r?.skillId).toBe("skill-1");
    expect(r?.skillName).toBe("Strict Pull-Up");
    expect(r?.phaseIndex).toBe(0);
    expect(r?.mastered).toBe(false);
    expect(r?.exercises).toHaveLength(2);
    const [dead, scap] = r!.exercises;
    expect(dead.name).toBe("Dead Hang");
    expect(dead.metric).toBe("duration");
    expect(dead.target).toBe(30);
    expect(dead.tempo).toBeNull();
    expect(dead.sets).toHaveLength(3);
    expect(dead.sets[0]).toEqual({ value: null, done: false, met: false });
    expect(scap.tempo).toBe("langsam");
  });

  it("reicht die Katalog-Verknuepfung durch, auch wenn sie fehlt", () => {
    const r = buildSkillLive(DEF, prog());
    expect(r?.exercises[0].exerciseId).toBe("ex-dead-hang");
    expect(r?.exercises[1].exerciseId).toBeNull();
  });

  it("nutzt die Phase aus dem Fortschritt", () => {
    const r = buildSkillLive(DEF, prog({ currentPhase: 1 }));
    expect(r?.phaseIndex).toBe(1);
    expect(r?.exercises).toHaveLength(1);
    expect(r?.exercises[0].name).toBe("Band Pull-Up");
  });

  it("klemmt einen zu hohen Phasen-Index auf die letzte Phase", () => {
    const r = buildSkillLive(DEF, prog({ currentPhase: 9 }));
    expect(r?.phaseIndex).toBe(1);
  });

  it("reicht den gemeistert-Stand durch", () => {
    const r = buildSkillLive(DEF, prog({ currentPhase: 1, mastered: true }));
    expect(r?.mastered).toBe(true);
  });

  it("liefert null ohne Phasen", () => {
    expect(buildSkillLive({ id: "x", name: "X", phases: [] }, prog())).toBeNull();
  });
});
