import { describe, expect, it } from "vitest";
import {
  isoWeekKey,
  isoWeekNumOf,
  journeyPlacement,
  journeyWeekForDate,
  phasePlacement,
  weekProgress,
  repTargetForFocus,
  phaseRepBand,
  totalJourneyWeeks,
  completesJourney,
  type JourneySession,
} from "../journey";

// Hilfsfunktion: zaehlende Krafteinheit an einem Datum.
function s(
  date: string,
  journeyId: string | null = "j1",
  type = "strength",
  status = "done",
): JourneySession {
  return { date, status, type, journeyId };
}

describe("isoWeekKey", () => {
  it("liefert feste Breite YYYY-Www", () => {
    expect(isoWeekKey("2026-01-05")).toBe("2026-W02");
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
  });

  it("ist lexikografisch chronologisch (fuehrende Null)", () => {
    expect(isoWeekKey("2026-03-02") > isoWeekKey("2026-01-05")).toBe(true);
  });
});

describe("isoWeekNumOf", () => {
  it("zieht die Wochennummer aus dem Schluessel", () => {
    expect(isoWeekNumOf("2026-W31")).toBe(31);
    expect(isoWeekNumOf("kaputt")).toBe(0);
  });
});

describe("phasePlacement", () => {
  const phases = [
    { id: "p1", weeks: 2 },
    { id: "p2", weeks: 5 },
    { id: "p3", weeks: 1 },
  ];

  it("Woche 1 liegt in der ersten Phase", () => {
    expect(phasePlacement(phases, 1)).toEqual({
      phaseIndex: 0,
      phaseId: "p1",
      weekInPhase: 1,
      done: false,
    });
  });

  it("Woche 3 ist die erste Woche der zweiten Phase", () => {
    expect(phasePlacement(phases, 3)).toEqual({
      phaseIndex: 1,
      phaseId: "p2",
      weekInPhase: 1,
      done: false,
    });
  });

  it("ueber alle Wochen hinaus => done auf der letzten Phase", () => {
    const p = phasePlacement(phases, 99);
    expect(p.done).toBe(true);
    expect(p.phaseId).toBe("p3");
  });

  it("ohne Phasen => done, phaseId null", () => {
    const p = phasePlacement([], 1);
    expect(p.done).toBe(true);
    expect(p.phaseId).toBe(null);
  });
});

describe("journeyWeekForDate", () => {
  const freq = 3;

  it("ohne erfuellte Wochen davor ist die Journey-Woche 1", () => {
    const sessions = [s("2026-01-05"), s("2026-01-06")]; // nur 2 in dieser KW
    expect(journeyWeekForDate("2026-01-05", sessions, "j1", freq)).toBe(1);
  });

  it("eine erfuellte Vorwoche schiebt die Nummer auf 2", () => {
    const sessions = [
      // KW01 erfuellt (3 Einheiten)
      s("2025-12-29"),
      s("2025-12-30"),
      s("2025-12-31"),
      // laufende KW02
      s("2026-01-05"),
    ];
    expect(journeyWeekForDate("2026-01-05", sessions, "j1", freq)).toBe(2);
  });

  it("Yoga und fremde Journeys zaehlen nicht", () => {
    const sessions = [
      s("2025-12-29", "j1", "yoga"),
      s("2025-12-30", "jX"),
      s("2025-12-31"),
    ];
    // nur 1 zaehlende Einheit in KW01 -> nicht erfuellt -> bleibt Woche 1
    expect(journeyWeekForDate("2026-01-05", sessions, "j1", freq)).toBe(1);
  });
});

describe("journeyPlacement", () => {
  it("verbindet globale Woche mit der Phasenkarte", () => {
    const journey = {
      id: "j1",
      phases: [
        { id: "p1", weeks: 2 },
        { id: "p2", weeks: 4 },
      ],
    };
    // 2 erfuellte Vorwochen -> globale Woche 3 -> zweite Phase, Woche 1
    const sessions = [
      s("2025-12-22"),
      s("2025-12-23"),
      s("2025-12-24"),
      s("2025-12-29"),
      s("2025-12-30"),
      s("2025-12-31"),
      s("2026-01-05"),
    ];
    const p = journeyPlacement(journey, sessions, 3, "2026-01-05");
    expect(p.globalWeek).toBe(3);
    expect(p.phaseId).toBe("p2");
    expect(p.weekInPhase).toBe(1);
  });
});

describe("weekProgress", () => {
  it("zaehlt Einheiten der laufenden KW und meldet Erfuellung", () => {
    const sessions = [s("2026-01-05"), s("2026-01-06"), s("2026-01-07")];
    const wp = weekProgress(sessions, "j1", 3, "2026-01-05");
    expect(wp.units).toBe(3);
    expect(wp.target).toBe(3);
    expect(wp.fulfilled).toBe(true);
  });

  it("unter dem Ziel ist nicht erfuellt", () => {
    const sessions = [s("2026-01-05")];
    const wp = weekProgress(sessions, "j1", 3, "2026-01-05");
    expect(wp.units).toBe(1);
    expect(wp.fulfilled).toBe(false);
  });
});

describe("repTargetForFocus", () => {
  it("liefert die V1-Baender je Fokus", () => {
    expect(repTargetForFocus("reentry")).toEqual([5, 8]);
    expect(repTargetForFocus("hypertrophy")).toEqual([8, 12]);
    expect(repTargetForFocus("strength")).toEqual([4, 6]);
    expect(repTargetForFocus("power")).toEqual([3, 5]);
    expect(repTargetForFocus("endurance")).toEqual([12, 18]);
    expect(repTargetForFocus("test")).toEqual([2, 4]);
  });

  it("maintenance und Unbekanntes ergeben null", () => {
    expect(repTargetForFocus("maintenance")).toBeNull();
    expect(repTargetForFocus("irgendwas")).toBeNull();
  });
});

describe("phaseRepBand", () => {
  it("nimmt vorrangig die explizit gesetzten Grenzen", () => {
    expect(phaseRepBand(6, 10, "strength")).toEqual([6, 10]);
  });

  it("faellt ohne Grenzen auf den Fokus zurueck", () => {
    expect(phaseRepBand(null, null, "hypertrophy")).toEqual([8, 12]);
    expect(phaseRepBand(8, null, "strength")).toEqual([4, 6]);
  });

  it("ohne Grenzen und ohne passenden Fokus null", () => {
    expect(phaseRepBand(null, null, "maintenance")).toBeNull();
  });
});

describe("completesJourney", () => {
  // Journey ueber 2 Wochen, Frequenzziel 2.
  const j = { id: "j1", phases: [{ id: "p1", weeks: 2 }] };

  it("summiert die Phasenwochen", () => {
    expect(
      totalJourneyWeeks([
        { id: "a", weeks: 3 },
        { id: "b", weeks: 4 },
      ]),
    ).toBe(7);
  });

  it("schliesst nicht ab, solange fruehere Wochen laufen", () => {
    // KW02: erste Journey-Woche, zweite Einheit -> Woche 1 von 2.
    const before: JourneySession[] = [s("2026-01-05")];
    expect(completesJourney(j, before, 2, "2026-01-06")).toBe(false);
  });

  it("schliesst nicht ab, wenn das Wochen-Pensum noch fehlt", () => {
    // KW02 erfuellt (2 Einheiten) -> die Einheit in KW03 ist Woche 2, aber
    // allein erfuellt sie das Pensum von 2 noch nicht.
    const before: JourneySession[] = [s("2026-01-05"), s("2026-01-07")];
    expect(completesJourney(j, before, 2, "2026-01-12")).toBe(false);
  });

  it("schliesst mit der Einheit ab, die die letzte Woche vollmacht", () => {
    const before: JourneySession[] = [
      s("2026-01-05"),
      s("2026-01-07"),
      s("2026-01-12"),
    ];
    expect(completesJourney(j, before, 2, "2026-01-14")).toBe(true);
  });

  it("holt eine laengst ueberfaellige Journey nach", () => {
    // Vier erfuellte Wochen bei nur zwei geplanten -> naechste erfuellte Woche
    // schliesst ab (Woche >= Gesamtwochen).
    const before: JourneySession[] = [
      s("2026-01-05"),
      s("2026-01-07"),
      s("2026-01-12"),
      s("2026-01-14"),
      s("2026-01-19"),
      s("2026-01-21"),
      s("2026-01-26"),
    ];
    expect(completesJourney(j, before, 2, "2026-01-28")).toBe(true);
  });

  it("ignoriert Einheiten anderer Journeys", () => {
    const before: JourneySession[] = [s("2026-01-05", "j2"), s("2026-01-07", "j2")];
    expect(completesJourney(j, before, 2, "2026-01-08")).toBe(false);
  });

  it("ohne Phasen kein Abschluss", () => {
    expect(completesJourney({ id: "j1", phases: [] }, [], 2, "2026-01-05")).toBe(
      false,
    );
  });
});
