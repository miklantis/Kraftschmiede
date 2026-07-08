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
  title: "Oberkörper",
  startedAt: 1_700_000_000_000,
  generalWarmup: { sets: [{ minutes: 7, mode: "bike", done: false }] },
  entries: [
    {
      exerciseId: "ex-1",
      exerciseName: "Bankdrücken",
      equipment: "barbell",
      tag: "1RM 100 kg",
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
