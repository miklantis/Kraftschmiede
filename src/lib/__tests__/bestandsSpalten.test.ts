import { describe, it, expect } from "vitest";
import { BESTANDSREGISTER } from "@/lib/bestandsregister";
import { aufBekannteSpalten, bekannteSpalten } from "@/lib/bestandsSpalten";

// Die Spaltenliste je Tabelle faellt aus den Zod-Schemas heraus. Diese Tests
// halten fest, was das Eindampfen tut und was es bewusst nicht tut.

describe("bekannteSpalten", () => {
  it("kennt jede Tabelle des Bestandsregisters mit Spalten", () => {
    for (const e of BESTANDSREGISTER) {
      expect(bekannteSpalten(e.tabelle).size, e.tabelle).toBeGreaterThan(0);
    }
  });

  it("fuehrt user_id in jeder Tabelle des Bestands", () => {
    for (const e of BESTANDSREGISTER) {
      expect(bekannteSpalten(e.tabelle).has("user_id"), e.tabelle).toBe(true);
    }
  });

  it("gibt fuer eine fremde Tabelle nichts zurueck", () => {
    expect(bekannteSpalten("gibt_es_nicht").size).toBe(0);
  });
});

describe("aufBekannteSpalten", () => {
  it("wirft unbekannte Felder weg und laesst bekannte unveraendert", () => {
    const eingedampft = aufBekannteSpalten("exercises", {
      id: "e1",
      name: "Back Squat",
      work_weight: 60,
      abgeschaffte_spalte: "alt",
    });
    expect(eingedampft).toEqual({ id: "e1", name: "Back Squat", work_weight: 60 });
  });

  it("laesst Werte unangetastet, auch ungueltige", () => {
    // Ueber die Gueltigkeit entscheidet die Datenbank, nicht das Eindampfen.
    const eingedampft = aufBekannteSpalten("sets", { id: "s1", reps: "fuenf" });
    expect(eingedampft.reps).toBe("fuenf");
  });

  it("erfindet keine fehlenden Spalten", () => {
    const eingedampft = aufBekannteSpalten("templates", { id: "t1", name: "Push" });
    expect(Object.keys(eingedampft).sort()).toEqual(["id", "name"]);
    expect("active" in eingedampft).toBe(false);
  });

  it("reicht eine fremde Tabelle unveraendert durch", () => {
    const row = { was: "auch immer" };
    expect(aufBekannteSpalten("gibt_es_nicht", row)).toEqual(row);
  });
});
