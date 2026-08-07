import { describe, it, expect } from "vitest";
import { zeitraumWochenBaender, zeitraumSpanne } from "@/lib/zeitraeume";
import type { ZeitraumTyp } from "@/schemas";

// Kleiner Helfer fuer Test-Zeitraeume (Maerz 2026 beginnt an einem Sonntag;
// Woche 0 = nur der 1., Woche 1 = 2.-8., Woche 2 = 9.-15., Woche 3 = 16.-22.).
function z(
  id: string,
  typ: ZeitraumTyp,
  start: string,
  ende: string | null,
  name: string | null = null,
) {
  return { id, typ, start_datum: start, end_datum: ende, name };
}

describe("zeitraumWochenBaender", () => {
  it("bildet einen Zeitraum innerhalb einer Woche als ein Segment ab", () => {
    const b = zeitraumWochenBaender(
      [z("a", "heilfasten", "2026-03-10", "2026-03-12")],
      2026,
      2,
    );
    expect(Object.keys(b)).toEqual(["2"]);
    expect(b[2]).toHaveLength(1);
    expect(b[2][0]).toMatchObject({
      colStart: 2,
      colSpan: 3,
      slot: 0,
      isStart: true,
      isEnd: true,
      label: "Heilfasten",
    });
  });

  it("teilt einen wochenuebergreifenden Zeitraum je Woche und rundet nur am echten Rand", () => {
    const b = zeitraumWochenBaender(
      [z("a", "urlaub", "2026-03-12", "2026-03-18")],
      2026,
      2,
    );
    expect(Object.keys(b).sort()).toEqual(["2", "3"]);
    expect(b[2][0]).toMatchObject({ colStart: 4, colSpan: 4, isStart: true, isEnd: false });
    expect(b[3][0]).toMatchObject({ colStart: 1, colSpan: 3, isStart: false, isEnd: true });
  });

  it("nutzt den Namen als Beschriftung, sonst den Typ", () => {
    const mitNotiz = zeitraumWochenBaender(
      [z("a", "urlaub", "2026-03-10", "2026-03-11", "Malta")],
      2026,
      2,
    );
    expect(mitNotiz[2][0].label).toBe("Malta");
    const leer = zeitraumWochenBaender(
      [z("a", "urlaub", "2026-03-10", "2026-03-11", "   ")],
      2026,
      2,
    );
    expect(leer[2][0].label).toBe("Urlaub");
  });

  it("stapelt Ueberlappungen ueber den Monat stabil in Slots", () => {
    const b = zeitraumWochenBaender(
      [
        z("y", "urlaub", "2026-03-10", "2026-03-15"),
        z("x", "heilfasten", "2026-03-08", "2026-03-12"),
      ],
      2026,
      2,
    );
    const w2 = b[2];
    const x = w2.find((s) => s.id === "x");
    const y = w2.find((s) => s.id === "y");
    expect(x?.slot).toBe(0); // frueherer Start bekommt Slot 0
    expect(y?.slot).toBe(1);
  });

  it("clippt einen vor dem Monat gestarteten Zeitraum (kein Start-Rand im Monat)", () => {
    const b = zeitraumWochenBaender(
      [z("a", "krankheit", "2026-02-25", "2026-03-03")],
      2026,
      2,
    );
    const alle = Object.values(b).flat();
    expect(alle.some((s) => s.isStart)).toBe(false);
    expect(alle.some((s) => s.isEnd)).toBe(true); // echtes Ende am 3. liegt im Monat
  });

  it("faerbt einen laufenden Zeitraum bis Monatsende ohne End-Rand", () => {
    const b = zeitraumWochenBaender(
      [z("a", "pause", "2026-03-28", null)],
      2026,
      2,
    );
    const alle = Object.values(b).flat();
    expect(alle.length).toBeGreaterThan(0);
    expect(alle.every((s) => s.isEnd === false)).toBe(true);
  });

  it("ignoriert Zeitraeume ausserhalb des Monats", () => {
    const b = zeitraumWochenBaender(
      [z("a", "sonstiges", "2026-05-01", "2026-05-05")],
      2026,
      2,
    );
    expect(b).toEqual({});
  });
});

describe("zeitraumSpanne", () => {
  it("zeigt laufenden Zeitraum als „seit …“", () => {
    expect(zeitraumSpanne("2026-03-12", null)).toMatch(/^seit /);
  });
});
