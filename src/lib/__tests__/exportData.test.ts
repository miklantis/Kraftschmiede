import { describe, it, expect } from "vitest";
import {
  buildExport,
  exportFilename,
  serializeExport,
  type RawExportData,
  type RawSession,
  type RawSessionExercise,
  type RawSet,
} from "@/lib/exportData";

function emptyRaw(): RawExportData {
  return {
    bars: [],
    plates: [],
    kettlebells: [],
    dumbbells: [],
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

function session(id: string, date: string): RawSession {
  return { id, date, type: "strength" };
}
function exercise(
  id: string,
  session_id: string,
  position: number,
): RawSessionExercise {
  return { id, session_id, position, name: `ex-${id}` };
}
function set(
  id: string,
  session_exercise_id: string,
  position: number,
  extra: Partial<RawSet> = {},
): RawSet {
  return {
    id,
    session_exercise_id,
    position,
    kind: "work",
    score: null,
    ...extra,
  };
}

const NOW = new Date("2026-06-23T10:00:00.000Z");

describe("buildExport", () => {
  it("reichert Arbeitssaetze mit Score um rir/rpe/scoreLabel an", () => {
    const raw = emptyRaw();
    raw.sessions = [session("s1", "2026-06-01")];
    raw.sessionExercises = [exercise("e1", "s1", 0)];
    raw.sets = [set("st1", "e1", 0, { score: 3 })];

    const out = buildExport(raw, NOW);
    const st = out.sessions[0].entries[0].sets[0];
    expect(st.rir).toBe("2");
    expect(st.rpe).toBe("8");
    expect(st.scoreLabel).toBe("im Ziel");
    // Originalfelder bleiben erhalten
    expect(st.score).toBe(3);
  });

  it("laesst Saetze ohne gueltigen Score unberuehrt", () => {
    const raw = emptyRaw();
    raw.sessions = [session("s1", "2026-06-01")];
    raw.sessionExercises = [exercise("e1", "s1", 0)];
    raw.sets = [
      set("st1", "e1", 0, { score: null }),
      set("st2", "e1", 1, { score: 9 }), // ausserhalb der Skala
    ];

    const out = buildExport(raw, NOW);
    const sets = out.sessions[0].entries[0].sets;
    expect(sets[0].rir).toBeUndefined();
    expect(sets[1].scoreLabel).toBeUndefined();
  });

  it("verschachtelt Saetze und Uebungen nach position und Einheiten nach Datum", () => {
    const raw = emptyRaw();
    raw.sessions = [session("s2", "2026-06-10"), session("s1", "2026-06-01")];
    raw.sessionExercises = [
      exercise("e2", "s1", 1),
      exercise("e1", "s1", 0),
    ];
    raw.sets = [set("b", "e1", 1), set("a", "e1", 0)];

    const out = buildExport(raw, NOW);
    // Einheiten aufsteigend nach Datum
    expect(out.sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
    // Uebungen nach position
    expect(out.sessions[0].entries.map((e) => e.id)).toEqual(["e1", "e2"]);
    // Saetze nach position
    expect(out.sessions[0].entries[0].sets.map((s) => s.id)).toEqual([
      "a",
      "b",
    ]);
    // leere Einheit hat ein entries-Array
    expect(out.sessions[1].entries).toEqual([]);
  });

  it("haengt die _scoreScale-Notiz mit der Skala an", () => {
    const out = buildExport(emptyRaw(), NOW);
    expect(out._scoreScale.note).toContain("verworfen");
    expect(out._scoreScale.map[5].label).toBe("Versagen");
  });

  it("buendelt das Inventar und reicht Einstellungen durch", () => {
    const raw = emptyRaw();
    raw.bars = [{ id: "b1", name: "Standard" }];
    raw.settings = { user_id: "u1", unit: "kg" };

    const out = buildExport(raw, NOW);
    expect(out.inventory.bars).toHaveLength(1);
    expect(out.settings).toEqual({ user_id: "u1", unit: "kg" });
    expect(out.app).toBe("Kraftschmiede");
    expect(out.schemaVersion).toBe("v3");
    expect(out.exportedAt).toBe("2026-06-23T10:00:00.000Z");
  });

  it("liefert valides, lesbares JSON", () => {
    const out = buildExport(emptyRaw(), NOW);
    const text = serializeExport(out);
    expect(text).toContain("\n"); // eingerueckt
    expect(JSON.parse(text).schemaVersion).toBe("v3");
  });
});

describe("exportFilename", () => {
  it("nutzt den Kraftschmiede-Stil mit Datum", () => {
    expect(exportFilename(new Date("2026-06-23T10:00:00"))).toBe(
      "kraftschmiede_2026-06-23.json",
    );
  });
});
