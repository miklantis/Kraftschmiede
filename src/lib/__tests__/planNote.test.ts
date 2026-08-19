import { describe, expect, it } from "vitest";
import { buildPlanNote } from "@/lib/planNote";
import { buildStrengthWeekPlan, buildTestPhaseWeekPlan } from "@/engine";

// Wochenplan einer 5-Wochen-Kraftphase (Leiter 5, 5, 4, 3, 2) und die
// Entlastungswoche der Testphase als Gegenprobe. Geprueft wird der fertige Text -
// er steht so auf dem Trainingsbildschirm.
const strength = buildStrengthWeekPlan(5);
const entlastung = buildTestPhaseWeekPlan(2);

function note(weekInPhase: number) {
  return buildPlanNote({
    phaseName: "Maximalkraft",
    weekInPhase,
    phaseWeeks: 5,
    week: strength[weekInPhase - 1]!,
    deload: false,
    weightStep: 2.5,
    unit: "kg",
  });
}

describe("buildPlanNote", () => {
  it("nennt Phase, Woche, Vorgabe und den naechsten Schritt", () => {
    const n = note(3)!;
    expect(n.title).toBe("Maximalkraft · Woche 3 von 5");
    expect(n.targets).toBe("4 Sätze × 4 Wiederholungen · Ziel RIR 2");
    expect(n.progress).toContain("2,5 kg hoch");
  });

  it("zeigt in den schweren Wochen die angehobene Ziel-Anstrengung", () => {
    expect(note(4)!.targets).toBe("4 Sätze × 3 Wiederholungen · Ziel RIR 1");
    expect(note(5)!.targets).toBe("4 Sätze × 2 Wiederholungen · Ziel RIR 1");
  });

  it("kuendigt in der letzten Woche keinen Schritt mehr an", () => {
    expect(note(5)!.progress).not.toContain("nächste Woche");
    expect(note(5)!.progress).toContain("Letzte Woche der Phase");
  });

  it("erklaert das Teilen schwerer Saetze", () => {
    expect(note(1)!.hint).toContain("teile den Satz");
  });

  it("rechnet mit der Schrittweite aus den Einstellungen", () => {
    const n = buildPlanNote({
      phaseName: "Maximalkraft",
      weekInPhase: 1,
      phaseWeeks: 5,
      week: strength[0]!,
      deload: false,
      weightStep: 5,
      unit: "kg",
    })!;
    expect(n.progress).toContain("5 kg hoch");
  });

  it("zeigt in der Entlastungswoche Entlastung statt Steigerung", () => {
    const n = buildPlanNote({
      phaseName: "Übergang / Test",
      weekInPhase: 1,
      phaseWeeks: 2,
      week: entlastung[0]!,
      deload: true,
      weightStep: 2.5,
      unit: "kg",
    })!;
    expect(n.targets).toBe(
      "2 Sätze × 3–5 Wiederholungen · 60 % vom Startgewicht · Ziel RIR 3",
    );
    expect(n.progress).toContain("Testwoche");
    // Cluster-Hinweis gehoert zu schweren Saetzen, nicht zur Entlastung.
    expect(n.hint).toBeNull();
  });

  it("liefert ohne Plan keinen Hinweis", () => {
    expect(buildPlanNote(null)).toBeNull();
  });
});
