import { describe, expect, it } from "vitest";
import {
  fmtDur,
  pad2,
  parseLive,
  serializeLive,
  type LiveSession,
} from "@/lib/liveSession";

const SESSION: LiveSession = {
  id: "live_abc",
  kind: "workout",
  templateId: "tpl-1",
  title: "Oberkörper",
  startedAt: 1_700_000_000_000,
  exercisesPreview: ["Bankdrücken", "Klimmzug"],
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

    it("verwirft fremde kind-Werte (z. B. Skill kommt erst spaeter)", () => {
      const raw = JSON.stringify({
        collapsed: false,
        session: { ...SESSION, kind: "skill" },
      });
      expect(parseLive(raw).session).toBeNull();
    });

    it("filtert Nicht-String-Eintraege aus der Vorschau", () => {
      const raw = JSON.stringify({
        collapsed: false,
        session: { ...SESSION, exercisesPreview: ["A", 5, null, "B"] },
      });
      expect(parseLive(raw).session?.exercisesPreview).toEqual(["A", "B"]);
    });
  });
});
