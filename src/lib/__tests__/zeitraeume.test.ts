import { describe, it, expect } from "vitest";
import { zeitraumBaenderImMonat, zeitraumSpanne } from "@/lib/zeitraeume";
import type { ZeitraumTyp } from "@/schemas";

// Kleiner Helfer fuer Test-Zeitraeume.
function z(
  id: string,
  typ: ZeitraumTyp,
  start: string,
  ende: string | null,
) {
  return { id, typ, start_datum: start, end_datum: ende };
}

describe("zeitraumBaenderImMonat", () => {
  it("belegt genau die Tage eines abgeschlossenen Zeitraums", () => {
    const b = zeitraumBaenderImMonat(
      [z("a", "heilfasten", "2026-03-10", "2026-03-12")],
      2026,
      2, // März (0-basiert)
    );
    expect(Object.keys(b).sort()).toEqual([
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
    ]);
  });

  it("setzt Start-/End-Rundung nur am echten Rand", () => {
    const b = zeitraumBaenderImMonat(
      [z("a", "urlaub", "2026-03-10", "2026-03-12")],
      2026,
      2,
    );
    expect(b["2026-03-10"][0]).toMatchObject({ isStart: true, isEnd: false });
    expect(b["2026-03-11"][0]).toMatchObject({ isStart: false, isEnd: false });
    expect(b["2026-03-12"][0]).toMatchObject({ isStart: false, isEnd: true });
  });

  it("faerbt laufenden Zeitraum ohne Ende bis Monatsende, ohne End-Rundung", () => {
    const b = zeitraumBaenderImMonat(
      [z("a", "pause", "2026-03-28", null)],
      2026,
      2, // März hat 31 Tage
    );
    expect(Object.keys(b)).toHaveLength(4); // 28..31
    expect(b["2026-03-31"][0]).toMatchObject({ isEnd: false });
  });

  it("clippt einen Zeitraum, der vor dem Monat beginnt", () => {
    const b = zeitraumBaenderImMonat(
      [z("a", "krankheit", "2026-02-25", "2026-03-03")],
      2026,
      2,
    );
    expect(Object.keys(b).sort()).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
    // Start liegt im Vormonat -> kein Start-Rand im März.
    expect(b["2026-03-01"][0]).toMatchObject({ isStart: false });
    expect(b["2026-03-03"][0]).toMatchObject({ isEnd: true });
  });

  it("ignoriert Zeitraeume ausserhalb des Monats", () => {
    const b = zeitraumBaenderImMonat(
      [z("a", "sonstiges", "2026-05-01", "2026-05-05")],
      2026,
      2,
    );
    expect(b).toEqual({});
  });

  it("stapelt Ueberlappungen stabil nach Start, dann id", () => {
    const b = zeitraumBaenderImMonat(
      [
        z("y", "urlaub", "2026-03-10", "2026-03-15"),
        z("x", "heilfasten", "2026-03-08", "2026-03-12"),
      ],
      2026,
      2,
    );
    // Am 11. laufen beide; frueherer Start (heilfasten) zuerst.
    expect(b["2026-03-11"].map((s) => s.typ)).toEqual(["heilfasten", "urlaub"]);
  });
});

describe("zeitraumSpanne", () => {
  it("zeigt laufenden Zeitraum als „seit …“", () => {
    expect(zeitraumSpanne("2026-03-12", null)).toMatch(/^seit /);
  });
});
