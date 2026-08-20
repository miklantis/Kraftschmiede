import { describe, expect, it } from "vitest";
import { suggestWeight } from "../progression";
import type { EngineSet, SetEntry } from "../types";

const EX = { workWeight: 60, repRange: [8, 12] as [number, number], targetScore: 3 };
const entry = (sets: EngineSet[]): SetEntry => ({ sets });
const work = (o: Partial<EngineSet>): EngineSet => ({
  type: "work",
  weight: 60,
  reps: 8,
  done: true,
  targetReps: 8,
  targetWeight: 60,
  score: 3,
  ...o,
});

describe("suggestWeight – Doppelprogression", () => {
  it("keine Vordaten => Startgewicht halten", () => {
    const r = suggestWeight(EX, null);
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(12);
  });

  it("Repband oben erreicht => Gewicht +Schritt, Reps zuruecksetzen", () => {
    const r = suggestWeight(EX, entry([work({ reps: 12, score: 2 }), work({ reps: 12, score: 2 })]));
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
    expect(r.targetReps).toBe(8);
  });

  it("leichter als Ziel, Repband nicht voll => Wiederholungen steigern", () => {
    const r = suggestWeight(EX, entry([work({ reps: 9, score: 2 }), work({ reps: 9, score: 2 })]));
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(10);
  });

  it("Bandende voll in Zielanstrengung => Gewicht hoch, Reps zurueck", () => {
    const r = suggestWeight(EX, entry([work({ reps: 12, targetReps: 12, score: 3 })]));
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
    expect(r.targetReps).toBe(8);
  });

  it("Score genau am Ziel und erfuellt => eine Wiederholung mehr", () => {
    const r = suggestWeight(EX, entry([work({ reps: 10, targetReps: 10, score: 3 })]));
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(11);
  });

  it("Score am Ziel im schmalen Repband => Einzelschritt statt Sprung ans Bandende", () => {
    // Maximalkraft-Fall: Band 4-6, vier Saetze mit 4 Wiederholungen im Ziel.
    const kraft = { workWeight: 50, repRange: [4, 6] as [number, number], targetScore: 3 };
    const satz = (): EngineSet => ({
      type: "work",
      weight: 50,
      reps: 4,
      done: true,
      targetReps: 4,
      targetWeight: 50,
      score: 3,
    });
    const r = suggestWeight(kraft, entry([satz(), satz(), satz(), satz()]));
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(50);
    expect(r.targetReps).toBe(5);
  });

  it("Steigerung richtet sich nach dem schwaechsten Satz", () => {
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 10, targetReps: 9, score: 2 }),
        work({ reps: 9, targetReps: 9, score: 2 }),
      ]),
    );
    expect(r.decision).toBe("increase-reps");
    expect(r.targetReps).toBe(10);
  });

  it("fuenf Saetze, letzte zwei abgefallen => Gewicht steigt trotzdem", () => {
    // Hypertrophie-Fall aus #174: Bandende erreicht, danach normale Ermuedung.
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 11, targetReps: 12 }),
        work({ reps: 10, targetReps: 12 }),
      ]),
    );
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
    expect(r.targetReps).toBe(8);
    expect(r.reason.code).toBe("band-top-partial");
  });

  it("zwei Saetze, letzter eine darunter => keine Toleranz, Gewicht haelt", () => {
    const r = suggestWeight(
      EX,
      entry([work({ reps: 12, targetReps: 12 }), work({ reps: 11, targetReps: 12 })]),
    );
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });

  it("kein Satz am Bandende => Toleranz steigert nur die Wiederholungen", () => {
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 10, targetReps: 10 }),
        work({ reps: 10, targetReps: 10 }),
        work({ reps: 10, targetReps: 10 }),
        work({ reps: 10, targetReps: 10 }),
        work({ reps: 10, targetReps: 10 }),
      ]),
    );
    expect(r.decision).toBe("increase-reps");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(11);
  });

  it("schmales Band deckelt die Toleranz auf eine Wiederholung", () => {
    const kraft = { workWeight: 50, repRange: [4, 6] as [number, number], targetScore: 3 };
    const satz = (reps: number): EngineSet => ({
      type: "work",
      weight: 50,
      reps,
      done: true,
      targetReps: 6,
      targetWeight: 50,
      score: 3,
    });
    const eine = suggestWeight(kraft, entry([satz(6), satz(6), satz(6), satz(6), satz(5)]));
    expect(eine.decision).toBe("increase");
    expect(eine.weight).toBe(52.5);

    const zwei = suggestWeight(kraft, entry([satz(6), satz(6), satz(6), satz(6), satz(4)]));
    expect(zwei.decision).toBe("hold");
    expect(zwei.weight).toBe(50);
  });

  it("Versagen im letzten Satz wird von der Toleranz nicht gerettet", () => {
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 11, targetReps: 12, failed: true }),
      ]),
    );
    expect(r.decision).not.toBe("increase");
    expect(r.weight).toBe(60);
  });

  it("erfuellt, aber hart => Wiederholungen bleiben stehen", () => {
    const r = suggestWeight(EX, entry([work({ reps: 9, targetReps: 9, score: 4 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(9);
  });

  it("Ziel verfehlt => oberes Bandende bleibt das Ziel", () => {
    const r = suggestWeight(EX, entry([work({ reps: 7, targetReps: 10, score: 3 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(12);
  });

  it("Versagen => Gewicht senken", () => {
    const r = suggestWeight(EX, entry([work({ reps: 5, failed: true, score: 5 })]));
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(57.5);
  });

  it("Last reduziert => Gewicht senken", () => {
    const r = suggestWeight(EX, entry([work({ weight: 55, score: 3 })]));
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(57.5);
  });

  it("hart, aber kein Versagen => Gewicht halten", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 4 })]));
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });

  it("Wiedereinstieg: leicht und sauber => vorsichtig erhoehen (abgerundet)", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 3 })]), { reentry: true });
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(62.5);
    expect(r.targetReps).toBe(8);
  });

  it("Wiedereinstieg mit Schmerz-Flag => Gewicht halten", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 3, painFlag: true })]), {
      reentry: true,
    });
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });
});

describe("suggestWeight – Rueckwaertsregel bei mehrfach verfehltem Ziel", () => {
  // Eine Einheit, in der das Wiederholungsziel knapp verfehlt wurde, ohne
  // Versagen, ohne Last-Reduktion und in Zielanstrengung.
  const verfehlt = (w = 60): SetEntry =>
    entry([
      work({ weight: w, reps: 7, targetReps: 10, targetWeight: w, score: 3 }),
      work({ weight: w, reps: 7, targetReps: 10, targetWeight: w, score: 3 }),
    ]);
  const erfuellt = (w = 60): SetEntry =>
    entry([
      work({ weight: w, reps: 10, targetReps: 10, targetWeight: w, score: 3 }),
      work({ weight: w, reps: 10, targetReps: 10, targetWeight: w, score: 3 }),
    ]);

  it("einmal verfehlt => Gewicht halten, Bandende nochmal versuchen", () => {
    const r = suggestWeight(EX, verfehlt(), { prevEntry: erfuellt() });
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
    expect(r.targetReps).toBe(12);
  });

  it("zweimal in Folge am selben Gewicht verfehlt => einen Schritt zurueck", () => {
    const r = suggestWeight(EX, verfehlt(), { prevEntry: verfehlt() });
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(57.5);
    expect(r.targetReps).toBe(12);
  });

  it("dreimal verfehlt, dazwischen schon gesenkt => nur ein Schritt auf einmal", () => {
    // Nach dem Rueckschritt liegt die letzte Einheit auf 57,5: das Gewicht der
    // Einheit davor (60) passt nicht mehr, die Zaehlung beginnt neu.
    const ex = { ...EX, workWeight: 57.5 };
    const r = suggestWeight(ex, verfehlt(57.5), { prevEntry: verfehlt(60) });
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(57.5);
  });

  it("davor erfuellt, dazwischen kein Eintrag => keine Senkung ohne Vorgeschichte", () => {
    const r = suggestWeight(EX, verfehlt(), { prevEntry: null });
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });

  it("zweimal verfehlt und dabei hart => senken statt halten", () => {
    const hart = entry([
      work({ reps: 7, targetReps: 10, score: 4 }),
      work({ reps: 7, targetReps: 10, score: 4 }),
    ]);
    const r = suggestWeight(EX, hart, { prevEntry: verfehlt() });
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(57.5);
  });

  it("davor nur wegen der Toleranz knapp drunter => kein Rueckschritt", () => {
    // Drei Saetze: einer voll am Ziel, die spaeteren eine Wiederholung darunter.
    // Das gilt mit der Toleranz als erfuellt und zaehlt nicht als verfehlt.
    const toleriert = entry([
      work({ reps: 10, targetReps: 10 }),
      work({ reps: 9, targetReps: 10 }),
      work({ reps: 9, targetReps: 10 }),
    ]);
    const r = suggestWeight(EX, verfehlt(), { prevEntry: toleriert });
    expect(r.decision).toBe("hold");
    expect(r.weight).toBe(60);
  });
});

describe("suggestWeight – Schrittweite aus den Einstellungen", () => {
  it("Schrittweite 5 => Gewicht steigt um 5", () => {
    const r = suggestWeight(EX, entry([work({ reps: 12, score: 2 })]), { step: 5 });
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(65);
  });

  it("Schrittweite 5 => Gewicht faellt um 5", () => {
    const r = suggestWeight(EX, entry([work({ reps: 5, failed: true, score: 5 })]), {
      step: 5,
    });
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(55);
  });

  it("ohne Einstellung bleibt es bei 2,5", () => {
    const r = suggestWeight(EX, entry([work({ reps: 12, score: 2 })]));
    expect(r.weight).toBe(62.5);
  });
});

describe("suggestWeight – Kurzhantel-Stufen", () => {
  const DB = [8, 10, 12, 14, 16, 18, 20];
  const dbEx = {
    workWeight: 14,
    repRange: [8, 12] as [number, number],
    targetScore: 3,
  };
  const dbWork = (o: Partial<EngineSet>): EngineSet => ({
    type: "work",
    weight: 14,
    reps: 8,
    done: true,
    targetReps: 8,
    targetWeight: 14,
    score: 3,
    ...o,
  });

  it("keine Vordaten => Startgewicht auf vorhandene Stufe", () => {
    const r = suggestWeight(dbEx, null, { dumbbells: DB });
    expect(r.weight).toBe(14);
    expect(r.decision).toBe("hold");
  });

  it("Repband oben erreicht => eine Stufe hoch (kein Scheiben-Schritt)", () => {
    // W+2.5 = 16.5 -> naechste Stufe 16
    const r = suggestWeight(
      dbEx,
      entry([dbWork({ reps: 12, score: 2 }), dbWork({ reps: 12, score: 2 })]),
      { dumbbells: DB },
    );
    expect(r.decision).toBe("increase");
    expect(r.weight).toBe(16);
  });

  it("Versagen => Stufe runter, konservativ abgerundet", () => {
    // W-2.5 = 11.5, beim Senken wird abgerundet -> naechste Stufe darunter: 10
    const r = suggestWeight(
      dbEx,
      entry([dbWork({ score: 5, failed: true }), dbWork({ score: 5, failed: true })]),
      { dumbbells: DB },
    );
    expect(r.decision).toBe("decrease");
    expect(r.weight).toBe(10);
  });
});

// Issue #268, Schritt 1: die Rechnung liefert eine Kennung samt Zahlen, den
// Satz baut lib/coachText.ts. Geprueft wird, dass jeder Zweig die richtige
// Kennung traegt und die Differenz die tatsaechliche ist.
describe("suggestWeight – Kennung und Zahlen fuer den Text", () => {
  it("keine Vordaten", () => {
    expect(suggestWeight(EX, null).reason.code).toBe("no-data");
  });

  it("Bandende voll erreicht: Kennung, Differenz und Bandende", () => {
    const r = suggestWeight(
      EX,
      entry([work({ reps: 12, score: 2 }), work({ reps: 12, score: 2 })]),
    );
    expect(r.reason).toEqual({ code: "band-top", diff: 2.5, bandTop: 12 });
  });

  it("Bandende mit abgefallenen spaeten Saetzen", () => {
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 12, targetReps: 12 }),
        work({ reps: 11, targetReps: 12 }),
        work({ reps: 10, targetReps: 12 }),
      ]),
    );
    expect(r.reason.code).toBe("band-top-partial");
  });

  it("Wiederholungen steigern: Bandende als Zwischenziel, keine Differenz", () => {
    const r = suggestWeight(
      EX,
      entry([work({ reps: 9, score: 2 }), work({ reps: 9, score: 2 })]),
    );
    expect(r.reason).toEqual({ code: "reps-up", diff: 0, bandTop: 12 });
  });

  it("Versagen: Senkung mit negativer Differenz", () => {
    const r = suggestWeight(
      EX,
      entry([work({ score: 5, failed: true }), work({ score: 5, failed: true })]),
    );
    expect(r.reason.code).toBe("too-hard");
    expect(r.reason.diff).toBe(-2.5);
  });

  it("zweimal am selben Gewicht verfehlt: Rueckwaertsregel", () => {
    const miss = entry([work({ reps: 10, targetReps: 12 }), work({ reps: 9, targetReps: 12 })]);
    const r = suggestWeight(EX, miss, { prevEntry: miss });
    expect(r.reason.code).toBe("back-off");
    expect(r.reason.diff).toBe(-2.5);
  });

  it("sauber, aber anstrengend: Gewicht und Wiederholungen halten", () => {
    const r = suggestWeight(EX, entry([work({ reps: 8, score: 4 }), work({ reps: 8, score: 4 })]));
    expect(r.reason.code).toBe("hold-hard");
  });

  it("Ziel verfehlt: dasselbe Gewicht noch einmal", () => {
    const r = suggestWeight(
      EX,
      entry([work({ reps: 6, targetReps: 8 }), work({ reps: 6, targetReps: 8 })]),
    );
    expect(r.reason.code).toBe("hold-missed");
  });

  it("nur mit Ermuedungstoleranz erfuellt: Gewicht wartet auf das Bandende", () => {
    // dritter Satz eine Wiederholung unter Ziel (Toleranz), dabei etwas haerter
    // als vorgesehen -> Ziel erreicht, aber noch nicht oben
    const r = suggestWeight(
      EX,
      entry([
        work({ reps: 8, score: 3 }),
        work({ reps: 8, score: 3 }),
        work({ reps: 7, score: 4 }),
      ]),
    );
    expect(r.decision).toBe("hold");
    expect(r.reason).toEqual({ code: "hold-target", diff: 0, bandTop: 12 });
  });

  it("Wiedereinstieg: eigene Kennungen fuer steigern und halten", () => {
    const ok = suggestWeight(EX, entry([work({ score: 3 })]), { reentry: true });
    expect(ok.reason.code).toBe("reentry-up");
    const hart = suggestWeight(EX, entry([work({ score: 5 })]), { reentry: true });
    expect(hart.reason.code).toBe("reentry-hold");
  });

  it("Differenz ist die echte Differenz, nicht die Schrittweite", () => {
    // Kurzhantel: von 14 kg fuehrt der 2,5er Schritt auf die Stufe 16 -> 2 kg
    const DBS = [8, 10, 12, 14, 16, 18, 20];
    const dbe = { workWeight: 14, repRange: [8, 12] as [number, number], targetScore: 3 };
    const s = (o: Partial<EngineSet>): EngineSet => ({
      type: "work",
      weight: 14,
      reps: 8,
      done: true,
      targetReps: 8,
      targetWeight: 14,
      score: 3,
      ...o,
    });
    const r = suggestWeight(dbe, entry([s({ reps: 12, score: 2 }), s({ reps: 12, score: 2 })]), {
      dumbbells: DBS,
    });
    expect(r.weight).toBe(16);
    expect(r.reason.diff).toBe(2);
  });
});
