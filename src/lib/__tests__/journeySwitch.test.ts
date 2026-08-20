import { describe, expect, it } from "vitest";
import {
  buildJourneySwitchStand,
  journeySwitchBlockReason,
} from "@/lib/journeySwitch";

describe("buildJourneySwitchStand", () => {
  const base = {
    name: "Kraftaufbau",
    globalWeek: 5,
    totalWeeks: 12,
    phaseName: "Grundlagen",
    startDate: "2026-03-03",
  };

  it("zeigt Woche, Phase und Startdatum der laufenden Journey", () => {
    const stand = buildJourneySwitchStand(base);
    expect(stand.name).toBe("Kraftaufbau");
    expect(stand.week).toBe("Woche 5 von 12");
    expect(stand.phase).toBe("Phase: Grundlagen");
    expect(stand.start).toContain("Start: ");
    expect(stand.start).toContain("2026");
  });

  it("laesst Phase und Startdatum weg, wenn nichts da ist", () => {
    const stand = buildJourneySwitchStand({
      ...base,
      phaseName: null,
      startDate: null,
    });
    expect(stand.phase).toBeNull();
    expect(stand.start).toBeNull();
  });

  it("nennt ohne geplante Gesamtdauer nur die Woche", () => {
    expect(buildJourneySwitchStand({ ...base, totalWeeks: 0 }).week).toBe(
      "Woche 5",
    );
  });

  it("sagt bei durchlaufener Journey nicht 'Woche 13 von 12'", () => {
    expect(buildJourneySwitchStand({ ...base, globalWeek: 13 }).week).toBe(
      "Alle 12 Wochen durchlaufen",
    );
  });

  it("zeigt die letzte geplante Woche noch als Woche von Gesamt", () => {
    expect(buildJourneySwitchStand({ ...base, globalWeek: 12 }).week).toBe(
      "Woche 12 von 12",
    );
  });
});

describe("journeySwitchBlockReason", () => {
  it("sperrt nicht, wenn keine Einheit laeuft", () => {
    expect(journeySwitchBlockReason(null)).toBeNull();
  });

  it("sperrt bei laufender Einheit und nennt sie beim Namen", () => {
    const reason = journeySwitchBlockReason({ title: "Push A" });
    expect(reason).not.toBeNull();
    expect(reason).toContain("Push A");
    expect(reason).toContain("Beende oder verwirf sie zuerst");
  });

  it("sperrt auch ohne brauchbaren Titel", () => {
    const reason = journeySwitchBlockReason({ title: "   " });
    expect(reason).not.toBeNull();
    expect(reason).toContain("eine Einheit");
  });
});
