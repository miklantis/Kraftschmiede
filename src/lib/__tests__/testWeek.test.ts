// Testliste der Testwoche (#240, Schritt 3; Umfang #470): welche Uebungen sie
// zeigt und welche davon in der laufenden Kalenderwoche schon getestet sind.
// Reine Ableitung - sie entscheidet nichts, die Woche endet ohnehin am Sonntag.

import { describe, expect, it } from "vitest";
import {
  fuehrtRekord,
  journeyTestScope,
  testWeekExercises,
  testWeekStand,
  type TestWeekCandidate,
  type TestWeekWorkout,
} from "../testWeek";

function ex(
  id: string,
  name: string,
  tier = "main",
  profile = "strength",
  metric: "reps" | "duration" | null = null,
): TestWeekCandidate {
  return { id, name, tier, profile, metric };
}

const KNIEBEUGE = ex("e1", "Kniebeuge");
const BANKDRUECKEN = ex("e2", "Bankdrücken");
const KREUZHEBEN = ex("e3", "Kreuzheben");
const BIZEPS = ex("e4", "Bizepscurl", "accessory");
// Koerpergewichts-Uebungen tragen im Katalog immer eine eigene Metrik.
const KLIMMZUG = ex("e5", "Klimmzug", "main", "bodyweight", "reps");
// Core-Uebungen mit Zusatzlast: Rang "main" und Gewicht in der Hand, aber
// trainiert werden 12-20 Wiederholungen.
const CORE_SITUPS = ex("e6", "Core Situps", "main", "core");

// Alles, was im Katalog stehen kann - der Umfang entscheidet, was davon uebrig
// bleibt.
const KATALOG = [
  KNIEBEUGE,
  BIZEPS,
  BANKDRUECKEN,
  KLIMMZUG,
  CORE_SITUPS,
  KREUZHEBEN,
];
const ALLE = new Set(KATALOG.map((e) => e.id));

describe("fuehrtRekord", () => {
  it("nimmt Hauptuebungen mit Kraftprofil und Gewicht", () => {
    expect(fuehrtRekord(KNIEBEUGE)).toBe(true);
  });

  it("laesst Zusatzuebungen und reines Koerpergewicht weg", () => {
    expect(fuehrtRekord(BIZEPS)).toBe(false);
    expect(fuehrtRekord(KLIMMZUG)).toBe(false);
  });

  // Core laeuft mit Zusatzlast auf hohe Wiederholungen - ein 1RM-Test ergibt
  // dort keinen Sinn, auch wenn eine Scheibe in der Hand liegt (#470).
  it("laesst Core-Uebungen weg, obwohl sie Gewicht tragen", () => {
    expect(fuehrtRekord(CORE_SITUPS)).toBe(false);
    expect(fuehrtRekord(ex("e7", "Core Twist", "main", "core"))).toBe(false);
  });

  // Eine Hauptuebung auf Haltezeit kann nie einen Rekord tragen.
  it("laesst eine Hauptuebung auf Haltezeit weg, egal welches Profil", () => {
    expect(fuehrtRekord(ex("e8", "Wall Sit", "main", "core", "duration"))).toBe(
      false,
    );
    expect(
      fuehrtRekord(ex("e9", "Farmers Walk", "main", "strength", "duration")),
    ).toBe(false);
  });
});

describe("journeyTestScope", () => {
  const workouts: TestWeekWorkout[] = [
    { id: "w1", active: true, exerciseIds: ["e1", "e2"] },
    { id: "w2", active: true, exerciseIds: ["e2", "e3"] },
    { id: "w3", active: false, exerciseIds: ["e4"] },
    { id: "w4", active: true, exerciseIds: ["e5"] },
  ];

  it("sammelt die Uebungen der zugewiesenen, aktiven Workouts", () => {
    const scope = journeyTestScope(workouts, ["w1", "w2"]);
    expect([...scope].sort()).toEqual(["e1", "e2", "e3"]);
  });

  it("laesst archivierte Workouts weg, auch wenn sie zugewiesen sind", () => {
    const scope = journeyTestScope(workouts, ["w1", "w3"]);
    expect([...scope].sort()).toEqual(["e1", "e2"]);
  });

  it("laesst nicht zugewiesene Workouts weg", () => {
    const scope = journeyTestScope(workouts, ["w1"]);
    expect(scope.has("e5")).toBe(false);
  });

  it("bleibt ohne Zuweisung leer - kein Rueckfall auf den Katalog", () => {
    expect(journeyTestScope(workouts, []).size).toBe(0);
  });
});

describe("testWeekExercises", () => {
  it("zeigt nur Kraft-Hauptuebungen, in der Reihenfolge des Katalogs", () => {
    const rows = testWeekExercises(KATALOG, [], "2026-08-19", ALLE);
    expect(rows.map((r) => r.name)).toEqual([
      "Kniebeuge",
      "Bankdrücken",
      "Kreuzheben",
    ]);
    expect(rows.every((r) => !r.tested)).toBe(true);
  });

  // Der Kern von #470: was in dieser Journey nicht trainiert wird, wird auch
  // nicht zum Test angeboten.
  it("laesst Uebungen ausserhalb der Journey weg", () => {
    const rows = testWeekExercises(
      KATALOG,
      [],
      "2026-08-19",
      new Set(["e1", "e2"]),
    );
    expect(rows.map((r) => r.name)).toEqual(["Kniebeuge", "Bankdrücken"]);
  });

  it("bleibt ohne Journey-Umfang leer", () => {
    expect(testWeekExercises(KATALOG, [], "2026-08-19", new Set())).toEqual([]);
  });

  it("hakt ab, was in dieser Kalenderwoche getestet wurde", () => {
    // Mo 17.08. und Mi 19.08. liegen in derselben Woche wie das Bezugsdatum.
    const rows = testWeekExercises(
      KATALOG,
      [
        { exerciseId: "e1", date: "2026-08-17" },
        { exerciseId: "e3", date: "2026-08-19" },
      ],
      "2026-08-19",
      ALLE,
    );
    expect(rows.map((r) => r.tested)).toEqual([true, false, true]);
  });

  it("zaehlt Tests aus anderen Wochen nicht mit", () => {
    // So 16.08. ist die Vorwoche, Mo 24.08. die Folgewoche.
    const rows = testWeekExercises(
      KATALOG,
      [
        { exerciseId: "e1", date: "2026-08-16" },
        { exerciseId: "e2", date: "2026-08-24" },
      ],
      "2026-08-19",
      ALLE,
    );
    expect(rows.every((r) => !r.tested)).toBe(true);
  });

  it("beruecksichtigt Tests zu Uebungen, die gar nicht auf der Liste stehen, nicht", () => {
    const rows = testWeekExercises(
      KATALOG,
      [{ exerciseId: "e4", date: "2026-08-19" }],
      "2026-08-19",
      ALLE,
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
      ALLE,
    );
    expect(testWeekStand(rows)).toBe("1 von 3 getestet");
  });

  it("bleibt ohne Hauptuebungen leer", () => {
    expect(testWeekStand([])).toBe("");
  });
});
