import { describe, it, expect } from "vitest";
import { deriveWorkSets, deriveSkillSets } from "@/lib/setResult";

// Deterministischer ID-Erzeuger fuer stabile Vergleiche.
function idGen(): () => string {
  let n = 0;
  return () => "id" + n++;
}

describe("deriveWorkSets (Kraft)", () => {
  it("baut Satz-Zeilen, bewertet Ziel erreicht, schaetzt 1RM und nennt das Arbeitsgewicht", () => {
    const r = deriveWorkSets(
      [
        { reps: 5, weight: 100, score: 4, targetReps: 5, targetWeight: 100, adjusted: false, adjustNote: "" },
        { reps: 3, weight: 90, score: 3, targetReps: 5, targetWeight: 100, adjusted: false, adjustNote: "" },
      ],
      { userId: "u", sessionExerciseId: "se", rmFormula: "mean", newId: idGen(), startPosition: 2 },
    );

    expect(r.setRows).toHaveLength(2);
    expect(r.setRows[0]).toMatchObject({
      kind: "work",
      position: 2,
      reps: 5,
      weight: 100,
      duration_sec: null,
      score: 4,
      done: true,
      target_reps: 5,
      target_weight: 100,
      met: true,
    });
    expect(r.setRows[1]).toMatchObject({ position: 3, reps: 3, weight: 90, met: false });
    expect(r.workWeight).toBe(100);
    expect(r.est1RM).not.toBeNull();
    expect(r.est1RM ?? 0).toBeGreaterThan(0);
    expect(r.nextPosition).toBe(4);
  });

  it("ohne Saetze: kein 1RM, kein Arbeitsgewicht", () => {
    const r = deriveWorkSets([], {
      userId: "u",
      sessionExerciseId: "se",
      rmFormula: "mean",
      newId: idGen(),
    });
    expect(r.setRows).toHaveLength(0);
    expect(r.est1RM).toBeNull();
    expect(r.workWeight).toBeNull();
    expect(r.nextPosition).toBe(0);
  });

  it("default failed=false fliesst in Ziel erreicht", () => {
    const r = deriveWorkSets(
      [{ reps: 5, weight: 100, score: 5, targetReps: 5, targetWeight: 100, adjusted: false, adjustNote: "" }],
      { userId: "u", sessionExerciseId: "se", rmFormula: "mean", newId: idGen() },
    );
    expect(r.setRows[0].met).toBe(true);
    expect(r.setRows[0].failed).toBe(false);
  });
});

describe("deriveSkillSets (Skill)", () => {
  it("Metrik reps: Wert in reps, Ziel als target_reps, met gegen Ziel", () => {
    const r = deriveSkillSets(
      [{ value: 12 }, { value: 8 }],
      { userId: "u", sessionExerciseId: "se", metric: "reps", target: 10, newId: idGen() },
    );
    expect(r.setRows[0]).toMatchObject({
      kind: "work",
      position: 0,
      reps: 12,
      duration_sec: null,
      weight: null,
      target_reps: 10,
      met: true,
    });
    expect(r.setRows[1]).toMatchObject({ reps: 8, met: false });
    expect(r.nextPosition).toBe(2);
  });

  it("Metrik duration: Wert in duration_sec, kein target_reps", () => {
    const r = deriveSkillSets(
      [{ value: 30 }],
      { userId: "u", sessionExerciseId: "se", metric: "duration", target: 20, newId: idGen() },
    );
    expect(r.setRows[0]).toMatchObject({
      reps: null,
      duration_sec: 30,
      target_reps: null,
      target_weight: null,
      met: true,
    });
  });
});
