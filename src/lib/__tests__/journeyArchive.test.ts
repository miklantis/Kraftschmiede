import { describe, expect, it } from "vitest";
import {
  buildArchivedJourneys,
  weeksBetween,
  type ArchiveSession,
} from "../journeyArchive";

function s(
  date: string,
  journeyId: string | null,
  status = "done",
): ArchiveSession {
  return { date, status, journeyId };
}

describe("weeksBetween", () => {
  it("rechnet beide Tage eingeschlossen und rundet auf", () => {
    expect(weeksBetween("2026-01-05", "2026-01-11")).toBe(1); // genau 7 Tage
    expect(weeksBetween("2026-01-05", "2026-01-12")).toBe(2); // 8 Tage
  });

  it("liefert mindestens eine Woche", () => {
    expect(weeksBetween("2026-01-05", "2026-01-05")).toBe(1);
  });
});

describe("buildArchivedJourneys", () => {
  it("nimmt Zeitraum und Dauer aus den Journey-Daten", () => {
    const [v] = buildArchivedJourneys(
      [
        {
          id: "j1",
          name: "Aufbau",
          startDate: "2026-01-05",
          endDate: "2026-03-01",
        },
      ],
      [],
    );
    expect(v!.range).toBe("5. Januar 2026 – 1. März 2026");
    expect(v!.duration).toBe("8 Wochen");
  });

  it("springt bei fehlendem Enddatum auf die letzte Einheit ein", () => {
    const [v] = buildArchivedJourneys(
      [{ id: "j1", name: "Alt", startDate: "2026-01-05", endDate: null }],
      [s("2026-01-06", "j1"), s("2026-02-10", "j1"), s("2026-03-02", "j2")],
    );
    expect(v!.range).toBe("5. Januar 2026 – 10. Februar 2026");
    expect(v!.units).toBe(2);
  });

  it("zaehlt nur abgeschlossene Einheiten der eigenen Journey", () => {
    const [v] = buildArchivedJourneys(
      [{ id: "j1", name: "Alt", startDate: null, endDate: null }],
      [
        s("2026-01-06", "j1"),
        s("2026-01-08", "j1", "open"),
        s("2026-01-09", "j2"),
        s("2026-01-10", null),
      ],
    );
    expect(v!.units).toBe(1);
  });

  it("sortiert neueste zuerst, Journeys ohne Datum ans Ende", () => {
    const out = buildArchivedJourneys(
      [
        { id: "a", name: "A", startDate: "2026-01-01", endDate: "2026-02-01" },
        { id: "b", name: "B", startDate: "2026-03-01", endDate: "2026-04-01" },
        { id: "c", name: "C", startDate: null, endDate: null },
      ],
      [],
    );
    expect(out.map((x) => x.id)).toEqual(["b", "a", "c"]);
  });

  it("laesst Zeitraum und Dauer leer, wenn nichts bekannt ist", () => {
    const [v] = buildArchivedJourneys(
      [{ id: "j1", name: "Leer", startDate: null, endDate: null }],
      [],
    );
    expect(v!.range).toBe("");
    expect(v!.duration).toBe("");
  });
});
