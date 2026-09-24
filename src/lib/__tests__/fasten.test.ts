import { describe, it, expect } from "vitest";
import { fastenStand, fastenTextFuer } from "@/lib/fasten";
import type { ZeitraumTyp } from "@/schemas";

function z(
  id: string,
  typ: ZeitraumTyp,
  start_datum: string,
  end_datum: string | null,
) {
  return { id, typ, start_datum, end_datum };
}

describe("fastenStand", () => {
  const fasten = z("a", "heilfasten", "2026-09-21", "2026-10-04");

  it("zaehlt den Starttag als Tag 1 und kennt die Gesamtdauer", () => {
    expect(fastenStand([fasten], "2026-09-21")).toEqual({
      tag: 1,
      von: 14,
      bis: "2026-10-04",
    });
    expect(fastenStand([fasten], "2026-09-24")?.tag).toBe(4);
  });

  it("zaehlt den Endtag noch mit, den Tag danach nicht mehr", () => {
    expect(fastenStand([fasten], "2026-10-04")?.tag).toBe(14);
    expect(fastenStand([fasten], "2026-10-05")).toBeNull();
    expect(fastenStand([fasten], "2026-09-20")).toBeNull();
  });

  it("rechnet ueber die Zeitumstellung ohne Versatz", () => {
    const herbst = z("b", "heilfasten", "2026-10-20", "2026-11-02");
    expect(fastenStand([herbst], "2026-10-26")?.tag).toBe(7);
    expect(fastenStand([herbst], "2026-11-02")?.tag).toBe(14);
  });

  it("laesst einen Zeitraum ohne Ende weiterlaufen, ohne Gesamtdauer", () => {
    const offen = z("c", "heilfasten", "2026-09-21", null);
    expect(fastenStand([offen], "2026-10-15")).toEqual({
      tag: 25,
      von: null,
      bis: null,
    });
  });

  it("ignoriert andere Zeitraum-Typen", () => {
    expect(
      fastenStand([z("d", "urlaub", "2026-09-21", "2026-10-04")], "2026-09-24"),
    ).toBeNull();
    expect(fastenStand([], "2026-09-24")).toBeNull();
  });

  it("nimmt bei Ueberlappung den zuletzt begonnenen Zeitraum", () => {
    const spaeter = z("e", "heilfasten", "2026-09-23", "2026-09-30");
    expect(fastenStand([fasten, spaeter], "2026-09-24")).toEqual({
      tag: 2,
      von: 8,
      bis: "2026-09-30",
    });
  });
});

describe("fastenTextFuer", () => {
  const texte = [{ tag: 1 }, { tag: 2 }, { tag: 3 }];

  it("liefert den Text genau dieses Tags", () => {
    expect(fastenTextFuer(texte, 2)).toEqual({ tag: 2 });
  });

  it("bleibt nach dem letzten Text beim letzten stehen", () => {
    expect(fastenTextFuer(texte, 30)).toEqual({ tag: 3 });
  });

  it("liefert ohne passenden Text null", () => {
    expect(fastenTextFuer([], 1)).toBeNull();
    expect(fastenTextFuer([{ tag: 5 }], 2)).toBeNull();
  });
});
