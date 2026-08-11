import { describe, expect, it } from "vitest";
import {
  fmtDur,
  pad2,
  parseLive,
  serializeLive,
  type WorkoutSession,
  type SkillSession,
} from "@/lib/liveSession";

const SESSION: WorkoutSession = {
  id: "live_abc",
  kind: "workout",
  templateId: "tpl-1",
  journeyId: "j-1",
  phaseId: "p-1",
  loadNote: null,
  title: "Oberkörper",
  startedAt: 1_700_000_000_000,
  generalWarmup: { sets: [{ minutes: 7, mode: "bike", done: false }] },
  entries: [
    {
      exerciseId: "ex-1",
      exerciseName: "Bankdrücken",
      equipment: "barbell",
      tag: "1RM 100 kg",
      phaseEntry: false,
      barId: "bar-1",
      barName: "Olympia",
      barWeight: 20,
      warmupSets: [{ reps: 5, weight: 20, done: false }],
      sets: [
        {
          reps: 8,
          weight: 60,
          score: 3,
          targetReps: 8,
          targetWeight: 60,
          done: false,
          failed: false,
          adjusted: false,
          adjustNote: "",
        },
      ],
    },
  ],
  focusEi: 1,
};

describe("liveSession", () => {
  describe("fmtDur", () => {
    it("zeigt unter einer Stunde m:ss ohne fuehrende Null bei den Minuten", () => {
      expect(fmtDur(0)).toBe("0:00");
      expect(fmtDur(5)).toBe("0:05");
      expect(fmtDur(65)).toBe("1:05");
      expect(fmtDur(600)).toBe("10:00");
    });

    it("zeigt ab einer Stunde h:mm:ss mit zweistelligen Minuten", () => {
      expect(fmtDur(3600)).toBe("1:00:00");
      expect(fmtDur(3661)).toBe("1:01:01");
      expect(fmtDur(7325)).toBe("2:02:05");
    });

    it("klemmt negative Werte auf 0 und rundet", () => {
      expect(fmtDur(-10)).toBe("0:00");
      expect(fmtDur(59.6)).toBe("1:00");
    });

    it("pad2 fuellt einstellige Zahlen auf", () => {
      expect(pad2(0)).toBe("00");
      expect(pad2(9)).toBe("09");
      expect(pad2(10)).toBe("10");
    });
  });

  describe("parseLive / serializeLive", () => {
    it("liefert leeren Stand bei null oder Muell", () => {
      expect(parseLive(null)).toEqual({ session: null, collapsed: false });
      expect(parseLive("kein json")).toEqual({ session: null, collapsed: false });
      expect(parseLive("123")).toEqual({ session: null, collapsed: false });
    });

    it("macht einen Roundtrip ueber serialize -> parse", () => {
      const raw = serializeLive({ session: SESSION, collapsed: true });
      expect(parseLive(raw)).toEqual({ session: SESSION, collapsed: true });
    });

    // Vorhaben #100: der Merker, an welcher Uebung gearbeitet wird, ueberlebt
    // den Reload. Einheiten aus der Zeit davor kennen ihn nicht.
    it("liest focusEi und macht aus einem fehlenden oder unsinnigen Wert null", () => {
      const gelesen = (focusEi: unknown): number | null => {
        const obj = JSON.parse(
          serializeLive({ session: SESSION, collapsed: false }),
        ) as { session: Record<string, unknown> };
        if (focusEi === undefined) delete obj.session.focusEi;
        else obj.session.focusEi = focusEi;
        const s = parseLive(JSON.stringify(obj)).session;
        return s !== null && s.kind === "workout" ? s.focusEi : null;
      };
      expect(gelesen(0)).toBe(0);
      expect(gelesen(2)).toBe(2);
      expect(gelesen(undefined)).toBeNull();
      expect(gelesen(null)).toBeNull();
      expect(gelesen(-1)).toBeNull();
      expect(gelesen(1.5)).toBeNull();
      expect(gelesen("1")).toBeNull();
    });

    it("behaelt collapsed, verwirft aber eine unvollstaendige Session", () => {
      const raw = JSON.stringify({
        collapsed: true,
        session: { id: "x", kind: "workout" }, // startedAt/title fehlen
      });
      expect(parseLive(raw)).toEqual({ session: null, collapsed: true });
    });

    it("macht einen Roundtrip einer Skill-Einheit", () => {
      const skill: SkillSession = {
        id: "live_sk1",
        kind: "skill",
        title: "Strict Pull-Up",
        startedAt: 1_700_000_000_000,
        skillId: "skill-uuid",
        phaseIndex: 1,
        mastered: false,
        exercises: [
          {
            name: "Dead Hang",
            metric: "duration",
            target: 30,
            tempo: null,
            sets: [
              { value: null, done: false, met: false },
              { value: 32, done: true, met: true },
            ],
          },
          {
            name: "Scapular Pull-Up",
            metric: "reps",
            target: 5,
            tempo: "langsam",
            sets: [{ value: 5, done: true, met: true }],
          },
        ],
      };
      const raw = serializeLive({ session: skill, collapsed: false });
      expect(parseLive(raw)).toEqual({ session: skill, collapsed: false });
    });

    it("verwirft eine Skill-Einheit ohne skillId", () => {
      const raw = JSON.stringify({
        collapsed: true,
        session: { id: "x", kind: "skill", title: "S", startedAt: 1 },
      });
      expect(parseLive(raw)).toEqual({ session: null, collapsed: true });
    });

    it("verwirft Eintraege ohne exerciseId und stellt Default-Werte her", () => {
      const raw = JSON.stringify({
        collapsed: false,
        session: {
          ...SESSION,
          entries: [
            { foo: "bar" }, // kein exerciseId -> raus
            { exerciseId: "ex-9" }, // minimal -> Defaults
          ],
        },
      });
      const out = parseLive(raw).session;
      expect(out?.kind).toBe("workout");
      expect(out?.kind === "workout" ? out.entries : null).toEqual([
        {
          exerciseId: "ex-9",
          exerciseName: "",
          equipment: "barbell",
          tag: "",
          phaseEntry: false,
          barId: null,
          barName: null,
          barWeight: null,
          warmupSets: [],
          sets: [],
        },
      ]);
    });

    it("stellt das allgemeine Aufwaermen tolerant wieder her", () => {
      const raw = JSON.stringify({
        collapsed: false,
        session: { ...SESSION, generalWarmup: { sets: [{}] } },
      });
      const out = parseLive(raw).session;
      expect(out?.kind === "workout" ? out.generalWarmup.sets : null).toEqual([
        { minutes: 5, mode: "vario", done: false },
      ]);
    });
  });
});

describe("parseLive – 1RM-Test", () => {
  it("stellt eine laufende Test-Einheit samt Uebung wieder her", () => {
    const raw = JSON.stringify({
      collapsed: true,
      session: {
        id: "live_1",
        kind: "rmtest",
        title: "1RM-Test · Kniebeuge",
        startedAt: 1000,
        exerciseId: "ex1",
        previousRm: 100,
        generalWarmup: { sets: [{ minutes: 5, mode: "vario", done: false }] },
        entries: [
          {
            exerciseId: "ex1",
            exerciseName: "Kniebeuge",
            equipment: "barbell",
            tag: "1RM 100 kg",
            barId: null,
            barName: null,
            barWeight: 20,
            warmupSets: [],
            sets: [{ reps: 5, weight: 90, done: true }],
          },
        ],
      },
    });
    const p = parseLive(raw);
    expect(p.collapsed).toBe(true);
    expect(p.session?.kind).toBe("rmtest");
    if (p.session && p.session.kind === "rmtest") {
      expect(p.session.exerciseId).toBe("ex1");
      expect(p.session.previousRm).toBe(100);
      expect(p.session.entries[0]?.sets[0]?.done).toBe(true);
      expect(p.session.generalWarmup.sets).toHaveLength(1);
    }
  });

  it("verwirft eine Test-Einheit ohne Uebungs-ID", () => {
    const raw = JSON.stringify({
      session: { id: "live_2", kind: "rmtest", title: "x", startedAt: 1 },
    });
    expect(parseLive(raw).session).toBeNull();
  });
});
