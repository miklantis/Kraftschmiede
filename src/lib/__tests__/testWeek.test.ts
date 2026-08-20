// Testliste der Testwoche (#240, Schritt 3): welche Uebungen sie zeigt und
// welche davon in der laufenden Kalenderwoche schon getestet sind. Reine
// Ableitung - sie entscheidet nichts, die Woche endet ohnehin am Sonntag.

import { describe, expect, it } from "vitest";
import {
  fuehrtRekord,
  testWeekExercises,
  testWeekStand,
  type TestWeekCandidate,
} from "../testWeek";

function ex(
  id: string,
  name: string,
  tier = "main",
  profile = "strength",
): TestWeekCandidate {
  return { id, name, tier, profile };
}

const KNIEBEUGE = ex("e1", "Kniebeuge");
const BANKDRUECKEN = ex("e2", "Bankdrücken");
const KREUZHEBEN = ex("e3", "Kreuzheben");
const BIZEPS = ex("e4", "Bizepscurl", "accessory");
const KLIMMZUG = ex("e5", "Klimmzug", "main", "bodyweight");

describe("fuehrtRekord", () => {
  it("nimmt Hauptuebungen mit Gewicht", () => {
    expect(fuehrtRekord(KNIEBEUGE)).toBe(true);
    expect(fuehrtRekord(ex("e6", "Rudern", "main", "core"))).toBe(true);
  });

  it("laesst Zusatzuebungen und reines Koerpergewicht weg", () => {
    expect(fuehrtRekord(BIZEPS)).toBe(false);
    expect(fuehrtRekord(KLIMMZUG)).toBe(false);
  });
});

describe("testWeekExercises", () => {
  const katalog = [KNIEBEUGE, BIZEPS, BANKDRUECKEN, KLIMMZUG, KREUZHEBEN];

  it("zeigt nur Hauptuebungen mit 1RM, in der Reihenfolge des Katalogs", () => {
    const rows = testWeekExercises(katalog, [], "2026-08-19");
    expect(rows.map((r) => r.name)).toEqual([
      "Kniebeuge",
      "Bankdrücken",
      "Kreuzheben",
    ]);
    expect(rows.every((r) => !r.tested)).toBe(true);
  });

  it("hakt ab, was in dieser Kalenderwoche getestet wurde", () => {
    // Mo 17.08. und Mi 19.08. liegen in derselben Woche wie das Bezugsdatum.
    const rows = testWeekExercises(
      katalog,
      [
        { exerciseId: "e1", date: "2026-08-17" },
        { exerciseId: "e3", date: "2026-08-19" },
      ],
      "2026-08-19",
    );
    expect(rows.map((r) => r.tested)).toEqual([true, false, true]);
  });

  it("zaehlt Tests aus anderen Wochen nicht mit", () => {
    // So 16.08. ist die Vorwoche, Mo 24.08. die Folgewoche.
    const rows = testWeekExercises(
      katalog,
      [
        { exerciseId: "e1", date: "2026-08-16" },
        { exerciseId: "e2", date: "2026-08-24" },
      ],
      "2026-08-19",
    );
    expect(rows.every((r) => !r.tested)).toBe(true);
  });

  it("beruecksichtigt Tests zu Uebungen, die gar nicht auf der Liste stehen, nicht", () => {
    const rows = testWeekExercises(
      katalog,
      [{ exerciseId: "e4", date: "2026-08-19" }],
      "2026-08-19",
    );
    expect(rows.every((r) => !r.tested)).toBe(true);
  });
});

describe("testWeekStand", () => {
  it("zaehlt getestete gegen alle", () => {
    const rows = testWeekExercises(
      [KNIEBEUGE, BANKDRUECKEN, KREUZHEBEN],
      [{ exerciseId: "e1", date: "2026-08-19" }],
      "2026-08-19",
    );
    expect(testWeekStand(rows)).toBe("1 von 3 getestet");
  });

  it("bleibt ohne Hauptuebungen leer", () => {
    expect(testWeekStand([])).toBe("");
  });
});
