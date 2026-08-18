import { describe, expect, it } from "vitest";
import {
  buildRmTestSession,
  buildSkillSession,
  buildWorkoutSession,
  type StartRmTestInput,
  type StartSkillInput,
  type StartWorkoutInput,
} from "../liveStart";
import type { LiveEntry, SkillLiveExercise } from "../liveSession";

const ID = "live_test_1";
const NOW = 1_700_000_000_000;

function entry(over: Partial<LiveEntry> = {}): LiveEntry {
  return {
    exerciseId: "ex1",
    exerciseName: "Bankdruecken",
    equipment: "barbell",
    tag: "1RM 120 kg",
    barId: "bar1",
    barName: "Standard",
    barWeight: 20,
    warmupSets: [{ reps: 5, weight: 40, done: false }],
    note: "",
    sets: [],
    ...over,
  };
}

describe("buildWorkoutSession", () => {
  const input: StartWorkoutInput = {
    templateId: "tpl1",
    title: "Oberkoerper A",
    journeyId: "j1",
    phaseId: "p1",
    loadNote: "Woche 2: 80 %",
    loadPlan: null,
    entries: [entry()],
    generalWarmup: { sets: [{ minutes: 10, mode: "bike", done: false }] },
  };

  it("bildet alle Felder ab und setzt die Art der Einheit", () => {
    const s = buildWorkoutSession(input, ID, NOW);
    expect(s.kind).toBe("workout");
    expect(s.id).toBe(ID);
    expect(s.startedAt).toBe(NOW);
    expect(s.templateId).toBe("tpl1");
    expect(s.title).toBe("Oberkoerper A");
    expect(s.journeyId).toBe("j1");
    expect(s.phaseId).toBe("p1");
    expect(s.loadNote).toBe("Woche 2: 80 %");
  });

  it("uebernimmt Uebungen und Aufwaermen unveraendert", () => {
    const s = buildWorkoutSession(input, ID, NOW);
    expect(s.entries).toBe(input.entries);
    expect(s.generalWarmup).toBe(input.generalWarmup);
  });

  it("haelt eine Einheit ohne Journey und ohne Lastfaktor-Hinweis aus", () => {
    const s = buildWorkoutSession(
      { ...input, journeyId: null, phaseId: null, loadNote: null },
      ID,
      NOW,
    );
    expect(s.journeyId).toBeNull();
    expect(s.phaseId).toBeNull();
    expect(s.loadNote).toBeNull();
  });
});

describe("buildSkillSession", () => {
  const exercises: SkillLiveExercise[] = [
    {
      name: "Klimmzug",
      exerciseId: null,
      metric: "reps",
      target: 8,
      tempo: null,
      sets: [],
      note: "",
    },
  ];
  const input: StartSkillInput = {
    skillId: "sk1",
    skillName: "Klimmzug",
    phaseIndex: 2,
    mastered: true,
    exercises,
  };

  it("bildet alle Felder ab, inklusive Phase und Gemeistert-Zustand", () => {
    const s = buildSkillSession(input, ID, NOW);
    expect(s.kind).toBe("skill");
    expect(s.id).toBe(ID);
    expect(s.startedAt).toBe(NOW);
    expect(s.title).toBe("Klimmzug");
    expect(s.skillId).toBe("sk1");
    expect(s.phaseIndex).toBe(2);
    expect(s.mastered).toBe(true);
    expect(s.exercises).toBe(exercises);
  });

  it("uebernimmt die erste Phase und einen noch nicht gemeisterten Skill", () => {
    const s = buildSkillSession({ ...input, phaseIndex: 0, mastered: false }, ID, NOW);
    expect(s.phaseIndex).toBe(0);
    expect(s.mastered).toBe(false);
  });
});

describe("buildRmTestSession", () => {
  const input: StartRmTestInput = {
    exerciseId: "ex1",
    exerciseName: "Bankdruecken",
    previousRm: 120,
    entry: entry(),
    generalWarmup: { sets: [{ minutes: 8, mode: "row", done: false }] },
  };

  it("bildet alle Felder ab und baut den Titel aus dem Uebungsnamen", () => {
    const s = buildRmTestSession(input, ID, NOW);
    expect(s.kind).toBe("rmtest");
    expect(s.id).toBe(ID);
    expect(s.startedAt).toBe(NOW);
    expect(s.title).toBe("1RM-Test · Bankdruecken");
    expect(s.exerciseId).toBe("ex1");
    expect(s.previousRm).toBe(120);
    expect(s.generalWarmup).toBe(input.generalWarmup);
  });

  it("legt genau die eine Uebung als Eintrag ab", () => {
    const s = buildRmTestSession(input, ID, NOW);
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0]).toBe(input.entry);
  });

  it("haelt einen Test ohne bisherigen Rekord aus", () => {
    expect(buildRmTestSession({ ...input, previousRm: null }, ID, NOW).previousRm).toBeNull();
  });
});
