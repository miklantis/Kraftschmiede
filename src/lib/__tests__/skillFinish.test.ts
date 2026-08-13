import { describe, expect, it } from "vitest";
import {
  buildSkillFinishRows,
  skillEndSummary,
  type SkillFinishContext,
  type SkillFinishPlanExercise,
} from "../skillFinish";
import type { SkillSession, SkillLiveExercise } from "../liveSession";

function ex(over: Partial<SkillLiveExercise> = {}): SkillLiveExercise {
  return {
    name: "Dead Hang",
    exerciseId: null,
    metric: "duration",
    target: 30,
    tempo: null,
    sets: [],
    ...over,
  };
}

function session(exercises: SkillLiveExercise[]): SkillSession {
  return {
    id: "live_sk",
    kind: "skill",
    title: "Strict Pull-Up",
    startedAt: 1_000_000,
    skillId: "skill-1",
    phaseIndex: 0,
    mastered: false,
    exercises,
  };
}

let counter = 0;
const newId = () => "id_" + counter++;

function ctx(over: Partial<SkillFinishContext>): SkillFinishContext {
  return {
    session: session([]),
    userId: "u1",
    planExercises: [],
    consecutiveSessions: 2,
    phasesLength: 3,
    progress: { currentPhase: 0, consecutiveCount: 0, mastered: false },
    date: "2026-06-23",
    endedAt: 1_000_000 + 120_000,
    newId,
    ...over,
  };
}

describe("skillEndSummary", () => {
  it("zaehlt erledigt/gesamt und baut Chips mit Einheit", () => {
    const s = session([
      ex({
        metric: "duration",
        sets: [
          { value: 32, done: true, met: true },
          { value: null, done: false, met: false },
        ],
      }),
      ex({
        name: "Scapular",
        metric: "reps",
        target: 5,
        sets: [{ value: 5, done: true, met: true }],
      }),
    ]);
    const sum = skillEndSummary(s, 1_000_000 + 90_000);
    expect(sum.durationSec).toBe(90);
    expect(sum.doneSets).toBe(2);
    expect(sum.totalSets).toBe(3);
    expect(sum.entries[0].count).toBe("1 / 2");
    expect(sum.entries[0].allDone).toBe(false);
    expect(sum.entries[0].chips[0]).toEqual({ label: "32 s", done: true });
    expect(sum.entries[0].chips[1]).toEqual({ label: "– s", done: false });
    expect(sum.entries[1].count).toBe("1 / 1");
    expect(sum.entries[1].allDone).toBe(true);
    expect(sum.entries[1].chips[0]).toEqual({ label: "5", done: true });
  });
});

describe("buildSkillFinishRows", () => {
  const plan: SkillFinishPlanExercise[] = [{ metric: "duration", target: 30, sets: 2 }];

  it("completed: alle Saetze erreicht, Konsekutiv-Zaehler steigt", () => {
    const s = session([
      ex({
        sets: [
          { value: 31, done: true, met: false },
          { value: 30, done: true, met: false },
        ],
      }),
    ]);
    const r = buildSkillFinishRows(ctx({ session: s, planExercises: plan }));
    expect(r.result).toBe("completed");
    expect(r.progressPatch).toEqual({
      currentPhase: 0,
      consecutiveCount: 1,
      mastered: false,
    });
    // Session-Zeile als Skill mit Phase/Ergebnis
    expect(r.sessionRow.type).toBe("skill");
    expect(r.sessionRow.skill_id).toBe("skill-1");
    expect(r.sessionRow.skill_phase).toBe(0);
    expect(r.sessionRow.skill_result).toBe("completed");
    expect(r.sessionRow.duration_sec).toBe(120);
    // genau eine Uebungszeile (Position 0), ohne Katalogbezug
    expect(r.exerciseRows).toHaveLength(1);
    expect(r.exerciseRows[0].exercise_id).toBeNull();
    expect(r.exerciseRows[0].metric).toBe("duration");
    expect(r.exerciseRows[0].position).toBe(0);
    // Haltezeit -> duration_sec, met = true
    expect(r.setRows).toHaveLength(2);
    expect(r.setRows[0].duration_sec).toBe(31);
    expect(r.setRows[0].reps).toBeNull();
    expect(r.setRows[0].met).toBe(true);
    expect(r.setRows[0].kind).toBe("work");
  });

  it("completed an der Schwelle steigt eine Phase auf", () => {
    const s = session([ex({ sets: [{ value: 30, done: true, met: false }] })]);
    const planOne: SkillFinishPlanExercise[] = [{ metric: "duration", target: 30, sets: 1 }];
    const r = buildSkillFinishRows(
      ctx({
        session: s,
        planExercises: planOne,
        consecutiveSessions: 2,
        progress: { currentPhase: 0, consecutiveCount: 1, mastered: false },
      }),
    );
    expect(r.result).toBe("completed");
    expect(r.progressPatch).toEqual({
      currentPhase: 1,
      consecutiveCount: 0,
      mastered: false,
    });
  });

  it("completed in der letzten Phase setzt gemeistert", () => {
    const s = session([ex({ sets: [{ value: 30, done: true, met: false }] })]);
    const planOne: SkillFinishPlanExercise[] = [{ metric: "duration", target: 30, sets: 1 }];
    const r = buildSkillFinishRows(
      ctx({
        session: s,
        planExercises: planOne,
        consecutiveSessions: 1,
        phasesLength: 2,
        progress: { currentPhase: 1, consecutiveCount: 0, mastered: false },
      }),
    );
    expect(r.progressPatch).toEqual({
      currentPhase: 1,
      consecutiveCount: 0,
      mastered: true,
    });
  });

  it("missed: versucht, aber nicht alles erreicht -> Zaehler 0", () => {
    const s = session([
      ex({
        sets: [
          { value: 20, done: true, met: false }, // unter Ziel
          { value: 30, done: true, met: false },
        ],
      }),
    ]);
    const r = buildSkillFinishRows(
      ctx({
        session: s,
        planExercises: plan,
        progress: { currentPhase: 0, consecutiveCount: 1, mastered: false },
      }),
    );
    expect(r.result).toBe("missed");
    expect(r.progressPatch.consecutiveCount).toBe(0);
    // nur abgehakte Saetze; met je Satz korrekt (erster verfehlt)
    expect(r.setRows).toHaveLength(2);
    expect(r.setRows[0].met).toBe(false);
    expect(r.setRows[1].met).toBe(true);
  });

  it("skipped: nichts abgehakt -> Fortschritt unveraendert, keine Saetze", () => {
    const s = session([
      ex({
        sets: [
          { value: null, done: false, met: false },
          { value: null, done: false, met: false },
        ],
      }),
    ]);
    const r = buildSkillFinishRows(
      ctx({
        session: s,
        planExercises: plan,
        progress: { currentPhase: 1, consecutiveCount: 1, mastered: false },
      }),
    );
    expect(r.result).toBe("skipped");
    expect(r.progressPatch).toEqual({
      currentPhase: 1,
      consecutiveCount: 1,
      mastered: false,
    });
    expect(r.setRows).toHaveLength(0);
    // Uebungszeile bleibt erhalten (Position fuer die Detailseite)
    expect(r.exerciseRows).toHaveLength(1);
  });

  it("Wiederholungs-Metrik schreibt reps statt duration_sec", () => {
    const s = session([
      ex({ name: "Scapular", metric: "reps", target: 5, sets: [{ value: 6, done: true, met: false }] }),
    ]);
    const planReps: SkillFinishPlanExercise[] = [{ metric: "reps", target: 5, sets: 1 }];
    const r = buildSkillFinishRows(ctx({ session: s, planExercises: planReps }));
    expect(r.setRows[0].reps).toBe(6);
    expect(r.setRows[0].duration_sec).toBeNull();
    expect(r.setRows[0].target_reps).toBe(5);
    expect(r.setRows[0].met).toBe(true);
  });
});
