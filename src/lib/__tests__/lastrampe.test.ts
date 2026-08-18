// Lastrampe der Phase (Issue #200): eine Kraft-, Power- oder Testphase gibt die
// Last ueber die Wochen vor, statt sie dem Coach zu ueberlassen. Geprueft wird
// die ganze Kette: Anker aus dem 1RM (phaseEntryOverride), Wochenanteil aus der
// Journey (derivePhaseContext), Vorgabe in der Engine (rampLoad/suggestWeight),
// fertiger Aufbau (buildLiveEntries) und das Nachziehen nach unten
// (katalogPatch).
//
// Massstab ist das Lehrbuch-Vorbild: 1RM 125 kg, Band 4-6, vier Wochen mit
// 77,5 / 80 / 82,5 Prozent und Entlastung in Woche 4.

import { describe, expect, it } from "vitest";
import { anchorForIntensity } from "@/engine";
import { loadShareForWeek } from "@/engine/intensity";
import type { EngineSet, SetEntry } from "@/engine/types";
import { rampLoad } from "../coach";
import { buildPhaseViews } from "../journey";
import { buildPeriodization } from "../periodization";
import {
  intensityNote,
  intensityPercent,
  intensityRange,
} from "../loadFactor";
import { katalogPatch } from "../katalogPatch";
import { derivePhaseContext } from "../phaseContext";
import type { PhaseContextJourney } from "../phaseContext";
import { buildLiveEntries } from "../liveBuild";
import type { LiveBuildExercise, LiveBuildInput } from "../liveBuild";
import type { PhaseRow } from "@/schemas";

const PLATES = [1.25, 2.5, 5, 10, 15, 20, 25];
const RM = 125;
const PHASE_ID = "00000000-0000-0000-0000-0000000000c1";
const KRAFT = {
  intensityStart: 77.5,
  intensityEnd: 82.5,
  weeks: 4,
  deloadWeek: 4,
};

const squat: LiveBuildExercise = {
  id: "squat",
  key: "squat",
  name: "Kniebeuge",
  profile: "strength",
  equipment: "barbell",
  repRange: [8, 12],
  workWeight: 90,
  targetScore: 3,
  barId: "bar1",
  referenceWeight: null,
  referencePhaseId: null,
  rm: RM,
  muscleGroups: ["Beine"],
};

function input(overrides: Partial<LiveBuildInput> = {}): LiveBuildInput {
  return {
    exerciseIds: ["squat"],
    exercisesById: { squat },
    phaseFocus: { focus: "strength" },
    phaseRepTarget: [4, 6],
    volumePhase: { setsStart: 4, setsEnd: 4, weeks: 4, deloadWeek: 4 },
    weekInPhase: 0,
    recoveryGreen: true,
    freeMode: false,
    loadFactor: null,
    loadShare: loadShareForWeek(KRAFT, 0),
    intensityStart: 77.5,
    phaseId: PHASE_ID,
    lastEntryByExercise: {},
    bars: [{ id: "bar1", name: "Langhantel", weight: 20 }],
    plates: PLATES,
    dumbbells: [],
    unit: "kg",
    ...overrides,
  };
}

// --- Anker der Phase ---

describe("anchorForIntensity", () => {
  it("setzt den Anker auf die Start-Intensitaet, abgerundet auf ladbare Scheiben", () => {
    // 125 x 77,5 % = 96,875 -> abgerundet 95
    expect(anchorForIntensity(RM, 77.5, { bar: { weight: 20 }, plates: PLATES })).toBe(95);
  });

  it("deckelt den Sprung nach oben, senkt aber direkt", () => {
    // Von 80 kg aus sind hoechstens 80 x 1,12 = 89,6 erlaubt -> 87,5
    expect(
      anchorForIntensity(RM, 77.5, {
        bar: { weight: 20 },
        plates: PLATES,
        currentWeight: 80,
      }),
    ).toBe(87.5);
    // Nach unten ohne Deckel: das Ziel gilt sofort.
    expect(
      anchorForIntensity(RM, 60, {
        bar: { weight: 20 },
        plates: PLATES,
        currentWeight: 120,
      }),
    ).toBe(75);
  });

  it("gibt null zurueck, wenn 1RM oder Start-Intensitaet fehlen", () => {
    expect(anchorForIntensity(null, 77.5)).toBeNull();
    expect(anchorForIntensity(RM, null)).toBeNull();
    expect(anchorForIntensity(0, 77.5)).toBeNull();
  });
});

// --- Wochenanteil aus der Journey ---

function phase(overrides: Partial<PhaseRow> = {}): PhaseRow {
  return {
    id: PHASE_ID,
    user_id: "00000000-0000-0000-0000-0000000000ff",
    journey_id: "00000000-0000-0000-0000-0000000000aa",
    name: "Maximalkraft",
    focus: "strength",
    weeks: 4,
    sets_start: 4,
    sets_end: 4,
    deload_week: 4,
    rep_target_min: 4,
    rep_target_max: 6,
    load_factor: 1,
    intensity_start: 77.5,
    intensity_end: 82.5,
    position: 0,
    ...overrides,
  };
}

describe("derivePhaseContext – Lastrampe", () => {
  const journey: PhaseContextJourney = {
    id: "00000000-0000-0000-0000-0000000000aa",
    user_id: "00000000-0000-0000-0000-0000000000ff",
    name: "Kraftblock",
    active: true,
    status: "active",
    source_template_id: null,
    start_date: "2026-08-01",
    end_date: null,
    created_at: "2026-08-01T00:00:00Z",
    phases: [phase()],
  } as PhaseContextJourney;

  it("leitet Wochenanteil und Intensitaet aus der laufenden Phase ab", () => {
    const ph = derivePhaseContext(journey, [], 3, "2026-08-01");
    expect(ph.intensityStart).toBe(77.5);
    expect(ph.intensityPct).toBeCloseTo(77.5, 5);
    expect(ph.loadShare).toBeCloseTo(1, 5);
    // Der Lastfaktor-Pfad bleibt unberuehrt.
    expect(ph.loadFactor).toBeNull();
  });

  it("laesst alles leer, wenn die Phase keine Prozentwerte traegt", () => {
    const ohne: PhaseContextJourney = {
      ...journey,
      phases: [phase({ intensity_start: null, intensity_end: null })],
    };
    const ph = derivePhaseContext(ohne, [], 3, "2026-08-01");
    expect(ph.loadShare).toBeNull();
    expect(ph.intensityPct).toBeNull();
    expect(ph.intensityStart).toBeNull();
  });
});

// --- Vorgabe im Coach ---

describe("rampLoad – Lastrampe", () => {
  const exo = {
    key: "squat",
    profile: "strength" as const,
    equipment: "barbell" as const,
    repRange: [4, 6] as [number, number],
    workWeight: 95,
    targetScore: 3,
    barId: "bar1",
    referenceWeight: 95,
    referencePhaseId: PHASE_ID,
  };

  it("rechnet Anker x Wochenanteil und deckelt", () => {
    const r = rampLoad(exo, { loadShare: 80 / 77.5, phaseId: PHASE_ID });
    expect(r).not.toBeNull();
    expect(r!.weight).toBeCloseTo(95 * (80 / 77.5), 5);
    expect(r!.cap).toBe(true);
  });

  it("greift nicht, wenn der Anker aus einer anderen Phase stammt", () => {
    expect(
      rampLoad(
        { ...exo, referencePhaseId: "00000000-0000-0000-0000-0000000000c2" },
        { loadShare: 1, phaseId: PHASE_ID },
      ),
    ).toBeNull();
  });

  it("greift nicht ohne Anker", () => {
    expect(
      rampLoad({ ...exo, referenceWeight: null }, { loadShare: 1, phaseId: PHASE_ID }),
    ).toBeNull();
  });

  it("laesst den Lastfaktor-Weg unveraendert", () => {
    const r = rampLoad({ ...exo, referenceWeight: 60 }, { loadFactor: 0.65 });
    expect(r).toEqual({ weight: 60 * 0.65, cap: true });
  });
});

// --- Ganze Kette ---

describe("buildLiveEntries – Lastrampe", () => {
  it("steigt in Woche 1 auf dem Anker ein und meldet ihn zurueck", () => {
    const res = buildLiveEntries(input());
    expect(res.anchorByExercise.squat).toBe(95);
    expect(res.entries[0]!.sets[0]!.weight).toBe(95);
    expect(res.entries[0]!.phaseEntry).toBe(true);
  });

  it("traegt die Rampe ueber die Phasenwochen: 95 / 97,5 / 100 / 85", () => {
    // Anker steht (Woche 1 hat ihn gesetzt), ab jetzt rechnet die Rampe.
    const verankert = {
      squat: { ...squat, referenceWeight: 95, referencePhaseId: PHASE_ID },
    };
    const gewicht = (wi: number): number => {
      const res = buildLiveEntries(
        input({
          exercisesById: verankert,
          weekInPhase: wi,
          loadShare: loadShareForWeek(KRAFT, wi),
        }),
      );
      return res.entries[0]!.sets[0]!.weight as number;
    };
    expect(gewicht(0)).toBe(95);
    expect(gewicht(1)).toBe(97.5);
    expect(gewicht(2)).toBe(100);
    // Entlastungswoche: rund 70 Prozent des 1RM statt 82,5.
    expect(gewicht(3)).toBe(85);
  });

  it("ohne 1RM bleibt die Uebung beim Coach", () => {
    const res = buildLiveEntries(
      input({ exercisesById: { squat: { ...squat, rm: null } } }),
    );
    expect(res.anchorByExercise.squat).toBeUndefined();
    expect(res.entries[0]!.phaseEntry).toBe(false);
  });

  it("ohne Lastrampe aendert sich am Aufbau nichts", () => {
    const res = buildLiveEntries(
      input({ loadShare: null, intensityStart: null, phaseId: null }),
    );
    expect(res.anchorByExercise).toEqual({});
  });
});

// --- Coach senkt: die Rampe zieht mit nach unten ---

describe("katalogPatch – Anker nachziehen", () => {
  const basis = {
    exerciseId: "squat",
    tracksRm: true,
    currentRm: RM,
    record1RM: null,
    est1RM: null,
    date: "2026-08-08",
  };

  it("zieht den Anker nach unten, wenn der Coach gesenkt hat", () => {
    // Woche 2 (Anteil 80/77,5): geplant waeren 98,06, gestemmt wurden 92,5.
    const share = 80 / 77.5;
    const patch = katalogPatch({
      ...basis,
      workWeight: 92.5,
      anchor: { phaseId: PHASE_ID, loadShare: share, weight: 95 },
    });
    expect(patch.reference_weight).toBeCloseTo(92.5 / share, 5);
    expect(patch.reference_weight as number).toBeLessThan(95);
    expect(patch.reference_phase_id).toBe(PHASE_ID);
  });

  it("laesst den Anker stehen, wenn der Plan gehalten wurde", () => {
    const share = 80 / 77.5;
    const patch = katalogPatch({
      ...basis,
      workWeight: 95 * share,
      anchor: { phaseId: PHASE_ID, loadShare: share, weight: 95 },
    });
    expect(patch.reference_weight).toBe(95);
  });

  it("hebt den Anker nicht an, wenn mehr gestemmt wurde als geplant", () => {
    const patch = katalogPatch({
      ...basis,
      workWeight: 120,
      anchor: { phaseId: PHASE_ID, loadShare: 1, weight: 95 },
    });
    expect(patch.reference_weight).toBe(95);
  });

  it("laesst den Anker unberuehrt, wenn die Phase die Last nicht plant", () => {
    const patch = katalogPatch({ ...basis, workWeight: 100 });
    expect(patch.reference_weight).toBeUndefined();
    expect(patch.reference_phase_id).toBeUndefined();
  });
});

// --- Der Coach steuert weiter die Wiederholungen ---

describe("Rollenverteilung unter der Lastrampe", () => {
  const work = (o: Partial<EngineSet>): EngineSet => ({
    type: "work",
    weight: 95,
    reps: 4,
    done: true,
    targetReps: 4,
    targetWeight: 95,
    score: 3,
    ...o,
  });
  const entry = (sets: EngineSet[]): SetEntry => ({ sets });

  it("erhoeht die Wiederholungen statt das Gewicht, solange die Woche laeuft", () => {
    const verankert = {
      squat: { ...squat, referenceWeight: 95, referencePhaseId: PHASE_ID },
    };
    const res = buildLiveEntries(
      input({
        exercisesById: verankert,
        lastEntryByExercise: { squat: entry([work({}), work({}), work({})]) },
      }),
    );
    // sets sind die Arbeitssaetze; Aufwaermen liegt getrennt in warmupSets.
    const satz = res.entries[0]!.sets[0]!;
    expect(satz.weight).toBe(95);
    expect(satz.targetReps).toBeGreaterThan(4);
  });
});

// --- Anzeige ---

describe("Anzeige der Lastrampe", () => {
  it("formatiert die Rampe als Spanne, bei gleichem Wert als eine Zahl", () => {
    expect(intensityRange(77.5, 82.5)).toBe("77,5 % → 82,5 %");
    expect(intensityRange(90, 90)).toBe("90 %");
    expect(intensityRange(null, 82.5)).toBeNull();
    expect(intensityRange(77.5, null)).toBeNull();
  });

  it("rundet krumme Wochenwerte auf eine halbe Stufe", () => {
    // Woche 2 einer Fuenf-Wochen-Phase landet auf 79,1666...
    expect(intensityPercent(79.16666)).toBe("79 %");
    expect(intensityPercent(80.25)).toBe("80,5 %");
  });

  it("erklaert die Wochenlast und benennt die Entlastungswoche eigens", () => {
    const normal = intensityNote(80, false);
    expect(normal).toContain("80 %");
    expect(normal).toContain("Wiederholungen steuert der Coach");
    const deload = intensityNote(70, true);
    expect(deload).toContain("Entlastungswoche");
    expect(deload).toContain("gewollt");
    expect(intensityNote(null, false)).toBeNull();
  });

  it("gibt der laufenden Phase den Wochenhinweis und jeder Phase die Spanne", () => {
    const phasen = [
      {
        name: "Maximalkraft",
        focus: "strength" as const,
        weeks: 4,
        setsStart: 4,
        setsEnd: 4,
        deloadWeek: 4,
        repTargetMin: 4,
        repTargetMax: 6,
        loadFactor: 1,
        intensityStart: 77.5,
        intensityEnd: 82.5,
      },
    ];
    const views = buildPhaseViews(phasen, {
      phaseIndex: 0,
      weekInPhase: 2,
      done: false,
    });
    const v = views[0]!;
    expect(v.detail.some((d) => d.k === "Geplante Last / Woche")).toBe(true);
    expect(v.detail.find((d) => d.k === "Geplante Last / Woche")!.v).toBe(
      "77,5 % → 82,5 %",
    );
    // Woche 2 der Rampe: 80 Prozent.
    expect(v.loadNote).toContain("80 %");
  });

  it("laesst Phasen ohne Lastrampe unveraendert", () => {
    const phasen = [
      {
        name: "Hypertrophie",
        focus: "hypertrophy" as const,
        weeks: 4,
        setsStart: 3,
        setsEnd: 5,
        deloadWeek: 4,
        repTargetMin: 8,
        repTargetMax: 12,
        loadFactor: 1,
        intensityStart: null,
        intensityEnd: null,
      },
    ];
    const v = buildPhaseViews(phasen, {
      phaseIndex: 0,
      weekInPhase: 1,
      done: false,
    })[0]!;
    expect(v.detail.some((d) => d.k.includes("Last"))).toBe(false);
    expect(v.loadNote).toBeNull();
  });

  it("zeichnet die Intensitaetslinie innerhalb der Phase wellenfoermig", () => {
    const daten = buildPeriodization(
      [
        {
          name: "Maximalkraft",
          focus: "strength",
          weeks: 4,
          setsStart: 4,
          setsEnd: 4,
          deloadWeek: 4,
          repTargetMin: 4,
          repTargetMax: 6,
          loadFactor: 1,
          intensityStart: 77.5,
          intensityEnd: 82.5,
        },
      ],
      1,
    );
    const linie = daten.weeks.map((w) => w.intens);
    // Frueher war die Linie ueber die ganze Phase flach; jetzt steigt sie und
    // faellt in der Entlastungswoche deutlich ab.
    expect(linie[1]!).toBeGreaterThan(linie[0]!);
    expect(linie[2]!).toBeGreaterThan(linie[1]!);
    expect(linie[3]!).toBeLessThan(linie[0]!);
    expect(daten.bands[0]!.loadLabel).toBe("77,5 % → 82,5 %");
  });
});
