import { describe, expect, it } from "vitest";
import {
  buildExerciseHistory,
  exBestSet,
  exSixWeekPct,
  exMetricOptions,
  exDefaultMetric,
  exLineSeries,
  exVolumeSeries,
  recordSeries,
  type ExHistoryEntry,
} from "@/lib/exerciseHistory";
import type { HistorySessionInput, HistoryExercise } from "@/lib/history";

function session(
  date: string,
  exercises: HistoryExercise[],
): HistorySessionInput {
  return {
    id: "s-" + date,
    date,
    type: "strength",
    templateId: null,
    skillId: null,
    skillPhase: null,
    durationSec: null,
    minutes: null,
    notes: "",
    exercises,
  };
}

function strengthEx(
  exerciseId: string | null,
  sets: Array<{
    kind: "warmup" | "work";
    weight?: number | null;
    reps?: number | null;
    score?: number | null;
    durationSec?: number | null;
    adjusted?: boolean;
  }>,
  tested1RM: number | null = null,
): HistoryExercise {
  return {
    exerciseId,
    name: null,
    metric: "reps",
    position: 0,
    tested1RM,
    sets: sets.map((s) => ({
      kind: s.kind,
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      durationSec: s.durationSec ?? null,
      score: s.score ?? null,
      adjusted: s.adjusted ?? false,
    })),
  };
}

describe("buildExerciseHistory", () => {
  it("sammelt nur Arbeitssaetze der passenden Uebung und rechnet die Kennzahlen", () => {
    const sessions = [
      session("2026-01-01", [
        strengthEx(
          "squat",
          [
            { kind: "warmup", weight: 40, reps: 5 },
            { kind: "work", weight: 80, reps: 5, score: 3 },
            { kind: "work", weight: 80, reps: 4, score: 4 },
          ],
          95,
        ),
        strengthEx("bench", [{ kind: "work", weight: 60, reps: 5 }]),
      ]),
    ];
    const h = buildExerciseHistory("squat", sessions);
    expect(h).toHaveLength(1);
    expect(h[0].topW).toBe(80);
    expect(h[0].reps).toBe(9); // 5 + 4, Aufwaermsatz zaehlt nicht
    expect(h[0].vol).toBe(80 * 5 + 80 * 4);
    expect(h[0].score).toBeCloseTo(3.5);
    expect(h[0].est1RM).toBe(92.2); // aus 80x5 geschaetzt (Mittelwert-Formel)
    expect(h[0].sets).toHaveLength(2);
  });

  it("ignoriert Einheiten ohne Arbeitssatz und sortiert aelteste zuerst", () => {
    const sessions = [
      session("2026-02-01", [
        strengthEx("squat", [{ kind: "work", weight: 90, reps: 3 }]),
      ]),
      session("2026-01-01", [
        strengthEx("squat", [{ kind: "warmup", weight: 40, reps: 5 }]),
      ]),
      session("2026-01-15", [
        strengthEx("squat", [{ kind: "work", weight: 85, reps: 5 }]),
      ]),
    ];
    const h = buildExerciseHistory("squat", sessions);
    expect(h.map((e) => e.date)).toEqual(["2026-01-15", "2026-02-01"]);
  });

  it("uebernimmt keine Skill-Einheiten ohne Katalogbezug (exercise_id null)", () => {
    const sessions = [
      session("2026-01-01", [
        strengthEx(null, [{ kind: "work", reps: 8 }]),
      ]),
    ];
    expect(buildExerciseHistory("squat", sessions)).toHaveLength(0);
  });

  it("markiert eine Abweichung, wenn ein Arbeitssatz angepasst wurde", () => {
    const sessions = [
      session("2026-01-01", [
        strengthEx("squat", [
          { kind: "work", weight: 80, reps: 5, adjusted: true },
        ]),
      ]),
    ];
    expect(buildExerciseHistory("squat", sessions)[0].dev).toBe(true);
  });
});

describe("exBestSet", () => {
  it("waehlt das hoechste Gewicht, bei Gleichstand die meisten Wiederholungen", () => {
    const sessions = [
      session("2026-01-01", [
        strengthEx("squat", [
          { kind: "work", weight: 80, reps: 5 },
          { kind: "work", weight: 90, reps: 3 },
          { kind: "work", weight: 90, reps: 5 },
        ]),
      ]),
    ];
    const best = exBestSet(buildExerciseHistory("squat", sessions));
    expect(best).toEqual({ weight: 90, reps: 5 });
  });

  it("liefert null ohne gewichtete Saetze", () => {
    expect(exBestSet([])).toBeNull();
  });
});

describe("exSixWeekPct", () => {
  it("rechnet die 1RM-Veraenderung ueber ~6 Wochen", () => {
    const sessions = [
      session("2026-01-01", [
        strengthEx("squat", [{ kind: "work", weight: 80, reps: 5 }]),
      ]),
      session("2026-02-20", [
        strengthEx("squat", [{ kind: "work", weight: 90, reps: 5 }]),
      ]),
    ];
    // 80x5 ~ 92.2, 90x5 ~ 103.72 -> +12 %
    expect(exSixWeekPct(buildExerciseHistory("squat", sessions))).toBe("+12%");
  });

  it("liefert null bei zu wenig 1RM-Daten", () => {
    const sessions = [
      session("2026-01-01", [
        strengthEx("squat", [{ kind: "work", weight: 80, reps: 5 }]),
      ]),
    ];
    expect(exSixWeekPct(buildExerciseHistory("squat", sessions))).toBeNull();
  });
});

describe("exMetricOptions / exDefaultMetric", () => {
  it("Hauptuebung: fuenf Metriken (1RM, Trend, ...), Standard 1RM", () => {
    expect(exMetricOptions("strength", null).map((o) => o.key)).toEqual([
      "rm",
      "trend",
      "weight",
      "reps",
      "volume",
    ]);
    expect(exDefaultMetric("strength", null)).toBe("rm");
  });

  it("Koerpergewicht mit Wdh: Wdh + Volumen, Standard Wdh", () => {
    expect(exMetricOptions("bodyweight", "reps").map((o) => o.key)).toEqual([
      "reps",
      "volume",
    ]);
    expect(exDefaultMetric("bodyweight", "reps")).toBe("reps");
  });

  it("Koerpergewicht mit Haltezeit: nur Haltezeit", () => {
    expect(exMetricOptions("bodyweight", "duration").map((o) => o.key)).toEqual([
      "duration",
    ]);
    expect(exDefaultMetric("bodyweight", "duration")).toBe("duration");
  });
});

describe("exLineSeries", () => {
  const sessions = [
    session("2026-01-01", [
      strengthEx("squat", [{ kind: "work", weight: 80, reps: 5, adjusted: true }]),
    ]),
    session("2026-01-08", [
      strengthEx("squat", [{ kind: "work", weight: 90, reps: 3 }]),
    ]),
  ];
  const h = buildExerciseHistory("squat", sessions);

  it("rm: nur Einheiten mit 1RM, Abweichungs-Flag uebernommen", () => {
    const s = exLineSeries(h, "rm");
    expect(s).toHaveLength(2);
    expect(s[0].flag).toBe(true);
    expect(s[1].flag).toBe(false);
    expect(s[0].y).toBeGreaterThan(0);
  });

  it("weight: Top-Gewicht je Einheit", () => {
    expect(exLineSeries(h, "weight").map((p) => p.y)).toEqual([80, 90]);
  });

  it("reps: Summe der Arbeitssatz-Wdh", () => {
    expect(exLineSeries(h, "reps").map((p) => p.y)).toEqual([5, 3]);
  });

  it("traegt das Datum je Punkt fuer die Zeitachse", () => {
    const dates = ["2026-01-01", "2026-01-08"];
    expect(exLineSeries(h, "rm").map((p) => p.date)).toEqual(dates);
    expect(exLineSeries(h, "weight").map((p) => p.date)).toEqual(dates);
  });
});

describe("exVolumeSeries", () => {
  it("summiert das Volumen je ISO-Woche, chronologisch", () => {
    const sessions = [
      session("2026-01-05", [
        strengthEx("squat", [{ kind: "work", weight: 100, reps: 5 }]),
      ]),
      session("2026-01-06", [
        strengthEx("squat", [{ kind: "work", weight: 100, reps: 3 }]),
      ]),
      session("2026-01-12", [
        strengthEx("squat", [{ kind: "work", weight: 100, reps: 4 }]),
      ]),
    ];
    const v = exVolumeSeries(buildExerciseHistory("squat", sessions));
    expect(v).toHaveLength(2);
    expect(v[0].value).toBe(800); // 500 + 300 (gleiche Woche)
    expect(v[1].value).toBe(400);
    expect(v[0].label.startsWith("W")).toBe(true);
  });
});

// --- Skill-Anbindung ---------------------------------------------------------
// Skill-Einheiten legen ihre Uebungen ohne Katalogbezug ab (exerciseId null).
// Ueber den Resolver (skillId + Phase + Position -> exerciseKey) ordnet
// buildExerciseHistory sie der Katalog-Uebung zu (1:1 wie V1).

function skillSession(
  date: string,
  skillId: string,
  phase: number,
  exercises: Array<{
    position: number;
    metric: "reps" | "duration";
    sets: Array<{
      reps?: number | null;
      durationSec?: number | null;
      done: boolean;
      met?: boolean | null;
    }>;
  }>,
): HistorySessionInput {
  return {
    id: "sk-" + date,
    date,
    type: "skill",
    templateId: null,
    skillId,
    skillPhase: phase,
    durationSec: null,
    minutes: null,
    notes: "",
    exercises: exercises.map((ex) => ({
      exerciseId: null,
      name: null,
      metric: ex.metric,
      position: ex.position,
      sets: ex.sets.map((s) => ({
        kind: "work" as const,
        reps: s.reps ?? null,
        weight: null,
        durationSec: s.durationSec ?? null,
        score: null,
        adjusted: false,
        done: s.done,
        met: s.met ?? null,
      })),
    })),
  };
}

// Resolver: Skill "pull" hat in Phase 0 an Position 0 eine Wiederholungs-Uebung
// (Ziel 5) auf Katalog "scapular", an Position 1 eine Haltezeit (Ziel 30) auf
// "dead_hang".
const resolve = (skillId: string, phase: number, position: number) => {
  if (skillId !== "pull" || phase !== 0) return null;
  if (position === 0)
    return { exerciseKey: "scapular", metric: "reps" as const, target: 5 };
  if (position === 1)
    return { exerciseKey: "dead_hang", metric: "duration" as const, target: 30 };
  return null;
};

describe("buildExerciseHistory – Skill-Anbindung", () => {
  it("ordnet Skill-Wiederholungssaetze ueber die Definition der Katalog-Uebung zu", () => {
    const sessions = [
      skillSession("2026-02-01", "pull", 0, [
        {
          position: 0,
          metric: "reps",
          sets: [
            { reps: 5, done: true, met: true },
            { reps: 4, done: true, met: false },
            { reps: 3, done: false }, // nicht abgehakt -> zaehlt nicht
          ],
        },
      ]),
    ];
    const h = buildExerciseHistory("scapular", sessions, "mean", "scapular", resolve);
    expect(h).toHaveLength(1);
    expect(h[0].skill).toBe(true);
    expect(h[0].metric).toBe("reps");
    expect(h[0].target).toBe(5);
    expect(h[0].reps).toBe(9); // 5 + 4 (der nicht abgehakte faellt raus)
    expect(h[0].vol).toBe(9);
    expect(h[0].sec).toBe(0);
    expect(h[0].topW).toBe(0);
    expect(h[0].est1RM).toBeNull();
    expect(h[0].score).toBeNull();
    expect(h[0].dev).toBe(true); // ein Satz hat das Ziel verfehlt (met false)
    expect(h[0].sets).toHaveLength(2);
  });

  it("ordnet Skill-Haltezeiten zu und nimmt die beste Sekundenzahl", () => {
    const sessions = [
      skillSession("2026-02-02", "pull", 0, [
        {
          position: 1,
          metric: "duration",
          sets: [
            { durationSec: 28, done: true, met: false },
            { durationSec: 32, done: true, met: true },
          ],
        },
      ]),
    ];
    const h = buildExerciseHistory("dead_hang", sessions, "mean", "dead_hang", resolve);
    expect(h).toHaveLength(1);
    expect(h[0].metric).toBe("duration");
    expect(h[0].sec).toBe(32);
    expect(h[0].vol).toBe(32); // Volumen = beste Haltezeit bei Dauer
    expect(h[0].reps).toBe(0);
    expect(h[0].target).toBe(30);
    expect(h[0].dev).toBe(true);
  });

  it("ignoriert Skill-Saetze, wenn der Schluessel nicht passt", () => {
    const sessions = [
      skillSession("2026-02-03", "pull", 0, [
        { position: 0, metric: "reps", sets: [{ reps: 5, done: true }] },
      ]),
    ];
    const h = buildExerciseHistory("dead_hang", sessions, "mean", "dead_hang", resolve);
    expect(h).toHaveLength(0);
  });

  it("nimmt Skill-Einheiten nur mit exerciseKey + Resolver auf", () => {
    const sessions = [
      skillSession("2026-02-04", "pull", 0, [
        { position: 0, metric: "reps", sets: [{ reps: 5, done: true }] },
      ]),
    ];
    // Ohne exerciseKey/Resolver bleiben Skill-Saetze aussen vor (Rueckwaertskompatibel).
    expect(buildExerciseHistory("scapular", sessions)).toHaveLength(0);
  });

  it("mischt Kraft- und Skill-Eintraege chronologisch derselben Uebung", () => {
    const sessions = [
      session("2026-02-10", [
        strengthEx("scapular", [{ kind: "work", weight: 0, reps: 8 }]),
      ]),
      skillSession("2026-02-05", "pull", 0, [
        { position: 0, metric: "reps", sets: [{ reps: 5, done: true }] },
      ]),
    ];
    const h = buildExerciseHistory("scapular", sessions, "mean", "scapular", resolve);
    expect(h).toHaveLength(2);
    expect(h[0].date).toBe("2026-02-05"); // aelteste zuerst
    expect(h[0].skill).toBe(true);
    expect(h[1].date).toBe("2026-02-10");
    expect(h[1].skill).toBeUndefined();
  });
});

describe("recordSeries – 1RM-Rekord-Treppe", () => {
  // Minimale Einheit mit gesetztem Rekord-Kandidaten (<=5-Wdh-Bestwert der
  // Einheit). record1RM=null => Einheit ohne tauglichen Satz.
  const rEntry = (date: string, record1RM: number | null): ExHistoryEntry => ({
    date,
    topW: 0,
    reps: 0,
    vol: 0,
    sec: 0,
    score: null,
    est1RM: record1RM,
    record1RM,
    dev: false,
    sets: [],
  });

  it("steigt nur bei hoeherem <=5-Kandidaten, senkt nicht von allein", () => {
    const h = [
      rEntry("2026-01-01", 100),
      rEntry("2026-01-08", 95), // niedriger -> keine Stufe
      rEntry("2026-01-15", 110),
    ];
    const pts = recordSeries(h, [], 110);
    expect(pts.map((p) => p.y)).toEqual([100, 110]);
    expect(pts.every((p) => p.test === false)).toBe(true);
  });

  it("Test setzt den Rekord hoch und runter, je als Stufe", () => {
    const h = [rEntry("2026-01-01", 100)];
    const tests = [
      { date: "2026-01-05", estRm: 120 },
      { date: "2026-02-01", estRm: 90 },
    ];
    const pts = recordSeries(h, tests, 90);
    expect(pts.map((p) => p.y)).toEqual([100, 120, 90]);
    expect(pts.map((p) => p.test === true)).toEqual([false, true, true]);
  });

  it("Test am selben Tag steht hinter der Einheit", () => {
    const h = [rEntry("2026-01-01", 100)];
    const pts = recordSeries(h, [{ date: "2026-01-01", estRm: 130 }], 130);
    expect(pts.map((p) => p.y)).toEqual([100, 130]);
    expect(pts.map((p) => p.test === true)).toEqual([false, true]);
  });

  it("bindet das Ende an den gespeicherten Rekord (Altwert hoeher)", () => {
    const h = [rEntry("2026-01-01", 100), rEntry("2026-01-08", 105)];
    const pts = recordSeries(h, [], 140);
    expect(pts.map((p) => p.y)).toEqual([100, 105, 140]);
    expect(pts[pts.length - 1].test).toBe(false);
  });

  it("leere Historie mit gespeichertem Rekord: ein Punkt auf dem Blockwert", () => {
    const pts = recordSeries([], [], 120);
    expect(pts.map((p) => p.y)).toEqual([120]);
  });

  it("traegt Datum je Stufe, der Blockwert das letzte bekannte", () => {
    const h = [rEntry("2026-01-01", 100), rEntry("2026-01-15", 110)];
    const pts = recordSeries(h, [{ date: "2026-01-20", estRm: 105 }], 140);
    expect(pts.map((p) => p.date)).toEqual([
      "2026-01-01",
      "2026-01-15",
      "2026-01-20",
      "2026-01-20",
    ]);
  });

  it("ohne Kandidaten und ohne gespeicherten Rekord: keine Punkte", () => {
    expect(recordSeries([rEntry("2026-01-01", null)], [], null)).toHaveLength(0);
  });
});
