import { describe, expect, it } from "vitest";
import { buildFinishRows, liveEndSummary } from "../liveFinish";
import type { WorkoutSession, LiveEntry } from "../liveSession";

function set(over: Partial<WorkoutSession["entries"][0]["sets"][0]> = {}) {
  return {
    reps: 5,
    weight: 100,
    score: 3,
    targetReps: 5,
    targetWeight: 100,
    done: true,
    failed: false,
    adjusted: false,
    adjustNote: "",
    ...over,
  };
}

function entry(over: Partial<LiveEntry> = {}): LiveEntry {
  return {
    exerciseId: "squat",
    exerciseName: "Kniebeuge",
    equipment: "barbell",
    tag: "1RM 120 kg",
    barId: "bar1",
    barName: "Standard",
    barWeight: 20,
    warmupSets: [],
    sets: [],
    ...over,
  };
}

function session(entries: LiveEntry[]): WorkoutSession {
  return {
    id: "s_local",
    kind: "workout",
    templateId: "tpl1",
    journeyId: "j1",
    phaseId: "p1",
    title: "Push",
    startedAt: 1_000_000,
    generalWarmup: { sets: [{ minutes: 7, mode: "bike", done: true }] },
    entries,
  };
}

let counter = 0;
const newId = () => "id_" + counter++;

describe("liveEndSummary", () => {
  it("zaehlt erledigt/gesamt und baut Chips mit deutschem Komma", () => {
    const s = session([
      entry({
        sets: [set({ done: true, weight: 100 }), set({ done: false, weight: 102.5 })],
      }),
    ]);
    const sum = liveEndSummary(s);
    expect(sum).toHaveLength(1);
    expect(sum[0].count).toBe("1 / 2");
    expect(sum[0].chips[0]).toEqual({ label: "5×100 kg", done: true });
    expect(sum[0].chips[1]).toEqual({ label: "5×102,5 kg", done: false });
  });
});

describe("buildFinishRows", () => {
  it("behaelt nur abgehakte Saetze und verwirft Uebungen ohne erledigten Arbeitssatz", () => {
    counter = 0;
    const rows = buildFinishRows({
      session: session([
        entry({
          exerciseId: "squat",
          warmupSets: [{ reps: 5, weight: 40, done: true }, { reps: 5, weight: 60, done: false }],
          sets: [set({ done: true }), set({ done: false })],
        }),
        entry({ exerciseId: "bench", exerciseName: "Bankdruecken", sets: [set({ done: false })] }),
      ]),
      userId: "u1",
      rmFormula: "mean",
      body: { legs: 1, upper_body: 2, overall: 1, readiness: 4, pain_flag: false, pain_note: "", notes: "" },
      week: 3,
      date: "2026-06-23",
      endedAt: 1_000_000 + 3600_000,
      newId,
    });

    // bench faellt raus, nur squat bleibt
    expect(rows.exerciseRows).toHaveLength(1);
    expect(rows.exerciseRows[0].exercise_id).toBe("squat");
    // ein erledigter Aufwaermsatz + ein erledigter Arbeitssatz
    const warm = rows.setRows.filter((r) => r.kind === "warmup");
    const work = rows.setRows.filter((r) => r.kind === "work");
    expect(warm).toHaveLength(1);
    expect(work).toHaveLength(1);
    expect(warm[0].weight).toBe(40);
  });

  it("rechnet est1RM und naechstes Arbeitsgewicht aus den sauberen Saetzen", () => {
    counter = 0;
    const rows = buildFinishRows({
      session: session([
        entry({
          sets: [
            set({ done: true, weight: 100, reps: 1, targetReps: 1 }),
            set({ done: true, weight: 110, reps: 1, targetReps: 1 }),
          ],
        }),
      ]),
      userId: "u1",
      rmFormula: "mean",
      body: { legs: 0, upper_body: 0, overall: 0, readiness: 3, pain_flag: false, pain_note: "", notes: "" },
      week: null,
      date: "2026-06-23",
      endedAt: 1_000_000,
      newId,
    });
    expect(rows.exerciseUpdates[0].workWeight).toBe(110);
    expect(rows.exerciseUpdates[0].est1RM).toBe(110); // reps=1 -> Gewicht selbst
    expect(rows.exerciseRows[0].tested_1rm).toBe(110);
  });

  it("setzt met je Arbeitssatz (Ziel erreicht vs. verfehlt)", () => {
    counter = 0;
    const rows = buildFinishRows({
      session: session([
        entry({
          sets: [
            set({ done: true, reps: 5, targetReps: 5, weight: 100, targetWeight: 100 }),
            set({ done: true, reps: 3, targetReps: 5, weight: 100, targetWeight: 100, failed: true }),
          ],
        }),
      ]),
      userId: "u1",
      rmFormula: "mean",
      body: { legs: 0, upper_body: 0, overall: 0, readiness: 3, pain_flag: false, pain_note: "", notes: "" },
      week: null,
      date: "2026-06-23",
      endedAt: 1_000_000,
      newId,
    });
    const work = rows.setRows.filter((r) => r.kind === "work");
    expect(work[0].met).toBe(true);
    expect(work[1].met).toBe(false);
  });

  it("uebernimmt Journey/Phase, Woche, Dauer und Body in die Einheit", () => {
    counter = 0;
    const rows = buildFinishRows({
      session: session([entry({ sets: [set({ done: true })] })]),
      userId: "u1",
      rmFormula: "mean",
      body: { legs: 1, upper_body: 2, overall: 1, readiness: 4, pain_flag: true, pain_note: "Knie", notes: "" },
      week: 7,
      date: "2026-06-23",
      endedAt: 1_000_000 + 90_000, // 90 s
      newId,
    });
    expect(rows.sessionRow.type).toBe("strength");
    expect(rows.sessionRow.status).toBe("done");
    expect(rows.sessionRow.journey_id).toBe("j1");
    expect(rows.sessionRow.phase_id).toBe("p1");
    expect(rows.sessionRow.template_id).toBe("tpl1");
    expect(rows.sessionRow.week).toBe(7);
    expect(rows.sessionRow.duration_sec).toBe(90);
    expect(rows.sessionRow.body?.pain_flag).toBe(true);
  });
});
