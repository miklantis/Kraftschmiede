import { describe, it, expect } from "vitest";
import { buildCoachExport } from "@/lib/coachExport";
import type {
  RawExportData,
  RawSession,
  RawSessionExercise,
  RawSet,
} from "@/lib/exportData";

function emptyRaw(): RawExportData {
  return {
    bars: [],
    plates: [],
    kettlebells: [],
    equipment: [],
    exercises: [],
    exerciseMuscles: [],
    templates: [],
    templateExercises: [],
    journeyTemplates: [],
    journeyTemplatePhases: [],
    skills: [],
    skillPhases: [],
    skillPhaseExercises: [],
    skillPhaseEquipment: [],
    journeys: [],
    phases: [],
    sessions: [],
    sessionExercises: [],
    sets: [],
    skillProgress: [],
    bodyLog: [],
    composition: [],
    settings: null,
  };
}

const TODAY = new Date("2026-06-24T10:00:00");

function set(
  id: string,
  sx: string,
  position: number,
  extra: Partial<RawSet> = {},
): RawSet {
  return {
    id,
    session_exercise_id: sx,
    position,
    kind: "work",
    score: null,
    ...extra,
  };
}

describe("buildCoachExport - Spanne", () => {
  it("nimmt nur Einheiten innerhalb der letzten X Wochen", () => {
    const raw = emptyRaw();
    raw.sessions = [
      { id: "old", date: "2026-01-01", type: "strength" } as RawSession,
      { id: "new", date: "2026-06-20", type: "strength" } as RawSession,
    ];
    const out = buildCoachExport(raw, { weeks: 8, today: TODAY });
    expect(out.sessions.map((s) => s.date)).toEqual(["2026-06-20"]);
    expect(out.range.weeks).toBe(8);
    expect(out.range.from).toBe("2026-04-29");
  });

  it("weeks=null nimmt den kompletten Verlauf", () => {
    const raw = emptyRaw();
    raw.sessions = [
      { id: "old", date: "2025-01-01", type: "strength" } as RawSession,
      { id: "new", date: "2026-06-20", type: "strength" } as RawSession,
    ];
    const out = buildCoachExport(raw, { weeks: null, today: TODAY });
    expect(out.sessions).toHaveLength(2);
    expect(out.range.weeks).toBe("all");
    expect(out.range.from).toBeNull();
  });
});

describe("buildCoachExport - Zuordnung und Saetze", () => {
  it("loest Journey, Phase, Woche und Workout je Kraft-Einheit auf", () => {
    const raw = emptyRaw();
    raw.journeys = [{ id: "j1", name: "Rückkehr", active: true }];
    raw.phases = [
      { id: "p1", journey_id: "j1", name: "Hypertrophie", focus: "hypertrophy", weeks: 5, position: 0 },
    ];
    raw.templates = [{ id: "t1", name: "Push A" }];
    raw.exercises = [
      { id: "e1", name: "Back Squat", active: true, position: 0, rep_range_min: 6, rep_range_max: 10, work_weight: 25, rm: 30.6 },
    ];
    raw.sessions = [
      {
        id: "s1",
        date: "2026-06-20",
        type: "strength",
        journey_id: "j1",
        phase_id: "p1",
        week: 4,
        template_id: "t1",
      } as RawSession,
    ];
    raw.sessionExercises = [
      { id: "x1", session_id: "s1", position: 0, exercise_id: "e1" } as RawSessionExercise,
    ];
    raw.sets = [
      set("st1", "x1", 0, { reps: 5, weight: 20, score: 3, target_reps: 5, target_weight: 20 }),
      set("st2", "x1", 1, { reps: 4, weight: 20, score: 5, target_reps: 6, target_weight: 20 }),
      set("w1", "x1", 2, { kind: "warmup", reps: 5, weight: 10 }),
    ];

    const out = buildCoachExport(raw, { weeks: null, today: TODAY });
    const s = out.sessions[0];
    expect(s.journey).toBe("Rückkehr");
    expect(s.phase).toBe("Hypertrophie");
    expect(s.week).toBe(4);
    expect(s.workout).toBe("Push A");
    expect(s.exercises?.[0].exercise).toBe("Back Squat");
    // nur Arbeitssaetze, Aufwaermsatz raus
    expect(s.exercises?.[0].sets).toEqual(["5×20 @S3", "4×20 @S5 (Ziel 6×20)"]);
  });

  it("zeigt aktive Journey mit Phasenplan und aktueller Phase", () => {
    const raw = emptyRaw();
    raw.journeys = [{ id: "j1", name: "Rückkehr", active: true, start_date: "2026-05-31" }];
    raw.phases = [
      { id: "p1", journey_id: "j1", name: "Wiedereinstieg", focus: "reentry", weeks: 2, sets_start: 2, sets_end: 2, rep_target_min: 5, rep_target_max: 8, position: 0 },
      { id: "p2", journey_id: "j1", name: "Hypertrophie", focus: "hypertrophy", weeks: 5, sets_start: 2, sets_end: 6, deload_week: 4, rep_target_min: 8, rep_target_max: 12, position: 1 },
    ];
    raw.settings = { weekly_frequency_target: 3, unit: "kg", rm_formula: "mean" };
    const out = buildCoachExport(raw, { weeks: null, today: TODAY });
    expect(out.activeJourney?.name).toBe("Rückkehr");
    expect(out.activeJourney?.phases).toHaveLength(2);
    expect(out.activeJourney?.phases[1].index).toBe("2/2");
    expect(out.activeJourney?.phases[1].setsRamp).toBe("2→6");
    expect(out.activeJourney?.phases[1].repBand).toBe("8-12");
    expect(out.settings.unit).toBe("kg");
  });
});

describe("buildCoachExport - Skill und Yoga", () => {
  it("formatiert Skill-Einheit mit Haltezeit, Ergebnis und Fortschritt", () => {
    const raw = emptyRaw();
    raw.skills = [{ id: "sk1", name: "Klimmzug" }];
    raw.skillPhases = [
      { id: "sp0", skill_id: "sk1", label: "Dead Hang", position: 0 },
      { id: "sp1", skill_id: "sk1", label: "Negative", position: 1 },
    ];
    raw.skillProgress = [
      { skill_id: "sk1", current_phase: 1, mastered: false },
    ];
    raw.sessions = [
      {
        id: "s1",
        date: "2026-06-20",
        type: "skill",
        skill_id: "sk1",
        skill_phase: 1,
        skill_result: "missed",
      } as RawSession,
    ];
    raw.sessionExercises = [
      { id: "x1", session_id: "s1", position: 0, name: "Dead Hang" } as RawSessionExercise,
    ];
    raw.sets = [
      set("st1", "x1", 0, { duration_sec: 30, met: true }),
      set("st2", "x1", 1, { duration_sec: 18, met: false }),
    ];

    const out = buildCoachExport(raw, { weeks: null, today: TODAY });
    const s = out.sessions[0];
    expect(s.type).toBe("Skill");
    expect(s.skill).toBe("Klimmzug");
    expect(s.result).toBe("verfehlt");
    expect(s.exercises?.[0].sets).toEqual(["30 s", "18 s (verfehlt)"]);
    expect(out.skills[0].phase).toBe("2/2 (Negative)");
    expect(out.skills[0].mastered).toBe(false);
  });

  it("zeigt Yoga-Minuten", () => {
    const raw = emptyRaw();
    raw.sessions = [
      { id: "y1", date: "2026-06-20", type: "yoga", minutes: 80 } as RawSession,
    ];
    const out = buildCoachExport(raw, { weeks: null, today: TODAY });
    expect(out.sessions[0].type).toBe("Yoga");
    expect(out.sessions[0].minutes).toBe(80);
  });
});

describe("buildCoachExport - schlank", () => {
  it("traegt keine ids/user_id in den Einheiten", () => {
    const raw = emptyRaw();
    raw.sessions = [
      { id: "s1", date: "2026-06-20", type: "strength", user_id: "u1" } as RawSession,
    ];
    const out = buildCoachExport(raw, { weeks: null, today: TODAY });
    const json = JSON.stringify(out.sessions[0]);
    expect(json).not.toContain("user_id");
    expect(json).not.toContain("s1");
  });
});
