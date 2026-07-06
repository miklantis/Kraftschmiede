import { describe, expect, it } from "vitest";
import {
  bodySnapshotSchema,
  exerciseInsert,
  exerciseRow,
  recoveryWindowsSchema,
  sessionInsert,
  setInsert,
  setRow,
  settingsRow,
  suggestionSchema,
  timersSchema,
} from "../index";

const uid = (): string => crypto.randomUUID();

describe("Lese-Form (Row) verlangt alle Spalten", () => {
  const fullExercise = {
    id: uid(),
    user_id: uid(),
    key: null,
    name: "Kniebeuge",
    profile: "strength",
    tier: "main",
    equipment: "barbell",
    bar_id: null,
    description: "",
    metric: null,
    muscle_groups: ["legs", "glutes"],
    rep_range_min: 5,
    rep_range_max: 8,
    target_score: 3,
    work_weight: 100,
    recovery_hours: 48,
    rm: null,
    rm_as_of: null,
    rm_stale: false,
    position: 0,
  };

  it("vollstaendige Zeile parst", () => {
    expect(exerciseRow.safeParse(fullExercise).success).toBe(true);
  });

  it("fehlende Pflichtspalte (name) scheitert", () => {
    const { name: _omit, ...withoutName } = fullExercise;
    void _omit;
    expect(exerciseRow.safeParse(withoutName).success).toBe(false);
  });

  it("unbekannter Enum-Wert scheitert", () => {
    expect(
      exerciseRow.safeParse({ ...fullExercise, equipment: "kettlebell" }).success,
    ).toBe(false);
  });
});

describe("Schreib-Form (Insert) laesst Defaults und Auto-Felder weg", () => {
  it("Minimaleingabe genuegt (nur Pflichtfelder ohne Default)", () => {
    expect(
      exerciseInsert.safeParse({ user_id: uid(), name: "Bankdruecken" }).success,
    ).toBe(true);
  });

  it("Pflichtfeld fehlt -> scheitert", () => {
    expect(exerciseInsert.safeParse({ name: "x" }).success).toBe(false);
  });

  it("Enum wird auch im Insert geprueft", () => {
    expect(
      exerciseInsert.safeParse({ user_id: uid(), name: "x", equipment: "falsch" })
        .success,
    ).toBe(false);
  });

  it("session-Insert nur mit Pflichtfeldern", () => {
    expect(
      sessionInsert.safeParse({
        user_id: uid(),
        date: "2026-06-22",
        type: "strength",
      }).success,
    ).toBe(true);
  });

  it("set-Insert nur mit Pflichtfeldern", () => {
    expect(
      setInsert.safeParse({ user_id: uid(), session_exercise_id: uid() })
        .success,
    ).toBe(true);
  });
});

describe("Nullbare Spalten akzeptieren null in der Lese-Form", () => {
  it("Satz mit lauter null-Messwerten parst", () => {
    expect(
      setRow.safeParse({
        id: uid(),
        user_id: uid(),
        session_exercise_id: uid(),
        kind: "work",
        position: 0,
        reps: null,
        weight: null,
        duration_sec: null,
        score: null,
        failed: false,
        done: false,
        target_reps: null,
        target_weight: null,
        target_score: null,
        adjusted: false,
        adjust_note: "",
        met: null,
      }).success,
    ).toBe(true);
  });
});

describe("jsonb-Wertobjekte", () => {
  it("timers verlangt alle Felder", () => {
    expect(
      timersSchema.safeParse({
        setRestSec: 120,
        exerciseRestSec: 180,
        autoStart: true,
        sound: true,
        vibrate: true,
      }).success,
    ).toBe(true);
    expect(timersSchema.safeParse({ setRestSec: 120 }).success).toBe(false);
  });

  it("timers: wakeLock optional (rueckwaertskompatibel)", () => {
    const base = {
      setRestSec: 120,
      exerciseRestSec: 180,
      autoStart: true,
      sound: true,
      vibrate: true,
    };
    // Ohne wakeLock (Altbestand) und mit wakeLock parst beides.
    expect(timersSchema.safeParse(base).success).toBe(true);
    expect(timersSchema.safeParse({ ...base, wakeLock: true }).success).toBe(
      true,
    );
    // Falscher Typ scheitert.
    expect(
      timersSchema.safeParse({ ...base, wakeLock: "ja" }).success,
    ).toBe(false);
  });

  it("recovery_windows: default plus beliebige Hebungen", () => {
    expect(
      recoveryWindowsSchema.safeParse({ default: 48, squat: 48, deadlift: 72 })
        .success,
    ).toBe(true);
    expect(recoveryWindowsSchema.safeParse({ squat: 48 }).success).toBe(false);
  });

  it("Snapshots/Suggestion bewahren unbekannte Felder (lockeres Objekt)", () => {
    const parsedBody = bodySnapshotSchema.parse({ legs: 2, fremd: "behalten" });
    expect((parsedBody as Record<string, unknown>).fremd).toBe("behalten");

    const parsedSug = suggestionSchema.parse({
      weight: 102.5,
      decision: "increase",
      extra: 1,
    });
    expect((parsedSug as Record<string, unknown>).extra).toBe(1);
  });

  it("settings-Row mit jsonb-Defaults parst", () => {
    expect(
      settingsRow.safeParse({
        user_id: uid(),
        rm_formula: "mean",
        weekly_frequency_target: 3,
        weight_step: 2.5,
        unit: "kg",
        recovery_windows: { default: 48, squat: 48, deadlift: 72 },
        timers: {
          setRestSec: 120,
          exerciseRestSec: 180,
          autoStart: true,
          sound: true,
          vibrate: true,
        },
      }).success,
    ).toBe(true);
  });
});
