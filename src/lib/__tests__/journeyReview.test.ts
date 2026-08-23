import { describe, expect, it } from "vitest";
import {
  buildJourneyReview,
  type ReviewSessionInput,
} from "../journeyReview";

const lk = {
  templateName: (id: string) =>
    ({ t1: "Ganzkörper A", t2: "Ganzkörper B" })[id],
  skillName: (id: string) => ({ s1: "Handstand" })[id],
};

const phases = [
  { id: "p1", name: "Wiedereinstieg", weeks: 2, loadPlan: null },
  { id: "p2", name: "Aufbau", weeks: 4, loadPlan: null },
];

function s(over: Partial<ReviewSessionInput>): ReviewSessionInput {
  return {
    id: "x",
    date: "2026-01-05",
    type: "strength",
    status: "done",
    journeyId: "j1",
    phaseId: "p1",
    templateId: "t1",
    skillId: null,
    ...over,
  };
}

describe("buildJourneyReview", () => {
  it("gruppiert Einheiten nach der eingefrorenen Phasen-Zuordnung", () => {
    const r = buildJourneyReview(
      "j1",
      phases,
      [
        s({ id: "a", date: "2026-01-05", phaseId: "p1" }),
        s({ id: "b", date: "2026-01-20", phaseId: "p2", templateId: "t2" }),
      ],
      lk,
    );
    expect(r.groups.map((g) => g.sessions.map((x) => x.id))).toEqual([
      ["a"],
      ["b"],
    ]);
    expect(r.groups[1]!.sessions[0]!.title).toBe("Ganzkörper B");
    expect(r.totalUnits).toBe(2);
  });

  it("sortiert innerhalb einer Phase chronologisch", () => {
    const r = buildJourneyReview(
      "j1",
      phases,
      [
        s({ id: "spaet", date: "2026-01-09" }),
        s({ id: "frueh", date: "2026-01-05" }),
      ],
      lk,
    );
    expect(r.groups[0]!.sessions.map((x) => x.id)).toEqual(["frueh", "spaet"]);
  });

  it("ignoriert fremde und offene Einheiten", () => {
    const r = buildJourneyReview(
      "j1",
      phases,
      [
        s({ id: "fremd", journeyId: "j2" }),
        s({ id: "offen", status: "live" }),
        s({ id: "ok" }),
      ],
      lk,
    );
    expect(r.totalUnits).toBe(1);
    expect(r.groups[0]!.sessions[0]!.id).toBe("ok");
  });

  it("sammelt Einheiten ohne bekannte Phase in einer Restgruppe", () => {
    const r = buildJourneyReview(
      "j1",
      phases,
      [s({ id: "alt", phaseId: null }), s({ id: "weg", phaseId: "geloescht" })],
      lk,
    );
    const rest = r.groups[r.groups.length - 1]!;
    expect(rest.name).toBe("Ohne Phasenbezug");
    expect(rest.sessions.map((x) => x.id)).toEqual(["alt", "weg"]);
  });

  it("benennt Yoga und Skills korrekt", () => {
    const r = buildJourneyReview(
      "j1",
      phases,
      [
        s({ id: "y", type: "yoga", templateId: null }),
        s({ id: "sk", type: "skill", templateId: null, skillId: "s1" }),
      ],
      lk,
    );
    const titles = r.groups[0]!.sessions.map((x) => x.title);
    expect(titles).toEqual(["Yoga", "Handstand"]);
  });

  it("zeigt leere Phasen mit Wochen- und Einheitenangabe", () => {
    const r = buildJourneyReview("j1", phases, [], lk);
    expect(r.groups[0]!.meta).toBe("2 Wochen · 0 Einheiten");
    expect(r.groups).toHaveLength(2);
  });
});
describe("buildJourneyReview \u2013 Lastliste", () => {
  it("haelt die vorgegebene Last in der Meta-Zeile fest", () => {
    const r = buildJourneyReview(
      "j1",
      [
        { id: "p1", name: "Tasten", weeks: 1, loadPlan: [{ week: 1, loadPct: 0.65 }] },
        { id: "p2", name: "Standort", weeks: 1, loadPlan: [{ week: 1, loadPct: 1 }] },
      ],
      [s({ id: "a", date: "2026-01-05", phaseId: "p1" })],
      lk,
    );
    expect(r.groups[0]!.meta).toBe("1 Woche \u00b7 1 Einheit \u00b7 65 % Last");
    expect(r.groups[1]!.meta).toBe("1 Woche \u00b7 0 Einheiten \u00b7 100 % Last");
  });

  it("zeigt bei einem wandernden Block die Spanne", () => {
    // Die Phase ist abgeschlossen - eine einzelne Zahl waere hier falsch.
    const r = buildJourneyReview(
      "j1",
      [
        {
          id: "p1",
          name: "Wiederaufbau",
          weeks: 3,
          loadPlan: [
            { week: 1, loadPct: 0.65 },
            { week: 2, loadPct: 0.8 },
            { week: 3, loadPct: 0.95 },
          ],
        },
        { id: "p2", name: "Test/Peak", weeks: 1, loadPlan: null },
      ],
      [s({ id: "a", date: "2026-01-05", phaseId: "p1" })],
      lk,
    );
    expect(r.groups[0]!.meta).toBe(
      "3 Wochen \u00b7 1 Einheit \u00b7 65 \u2192 95 % Last",
    );
    // Phase ohne eigene Liste laesst den Abschnitt weg statt "keine" zu sagen.
    expect(r.groups[1]!.meta).toBe("1 Woche \u00b7 0 Einheiten");
  });

  it("laesst Journeys ohne Lastliste unveraendert", () => {
    const r = buildJourneyReview(
      "j1",
      phases,
      [s({ id: "a", date: "2026-01-05", phaseId: "p1" })],
      lk,
    );
    expect(r.groups[0]!.meta).toBe("2 Wochen \u00b7 1 Einheit");
  });
});
