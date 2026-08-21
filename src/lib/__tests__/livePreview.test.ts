import { describe, expect, it } from "vitest";
import {
  isBlockComplete,
  liveEntryToSetEntry,
  liveWorkWeight,
  previewProvisional,
  previewWorkWeight,
  type LiveCoachPreview,
} from "../livePreview";
import { suggestWithBar, coachStatusFromSuggestion } from "../coach";
import type { CoachBuildExercise, CoachState } from "../coach";
import type { LiveEntry, LiveSet, LiveWarmupSet } from "../liveSession";
import type { SetEntry } from "@/engine/types";

function set(over: Partial<LiveSet> = {}): LiveSet {
  return {
    reps: 8,
    weight: 60,
    score: 3,
    targetScore: 3,
    targetReps: 8,
    targetWeight: 60,
    done: true,
    failed: false,
    adjusted: false,
    adjustNote: "",
    ...over,
  };
}
function warm(over: Partial<LiveWarmupSet> = {}): LiveWarmupSet {
  return { reps: 5, weight: 40, done: false, ...over };
}
function entry(over: Partial<LiveEntry> = {}): LiveEntry {
  return {
    exerciseId: "e",
    exerciseName: "Uebung",
    equipment: "barbell",
    tag: "",
    barId: "bar1",
    barName: "Standard",
    barWeight: 20,
    warmupSets: [warm()],
    sets: [set(), set(), set()],
    note: "",
    ...over,
  };
}

// isBlockComplete entscheidet nicht, OB gerechnet wird, sondern nur, ob der
// Stand fest ist oder vorlaeufig (#193).
describe("isBlockComplete", () => {
  it("ist fertig, wenn alle Arbeitssaetze abgehakt sind", () => {
    expect(isBlockComplete(entry())).toBe(true);
  });

  it("ist unfertig, solange ein Arbeitssatz offen ist", () => {
    expect(isBlockComplete(entry({ sets: [set(), set({ done: false })] }))).toBe(false);
  });

  it("ist unfertig ohne Arbeitssaetze", () => {
    expect(isBlockComplete(entry({ sets: [] }))).toBe(false);
  });

  it("laesst offene Aufwaermsaetze unberuecksichtigt", () => {
    const e = entry({ warmupSets: [warm({ done: false }), warm({ done: false })] });
    expect(isBlockComplete(e)).toBe(true);
  });
});

describe("liveEntryToSetEntry", () => {
  it("nimmt nur abgehakte Saetze und markiert sie als Arbeitssaetze", () => {
    const e = entry({ sets: [set({ reps: 9 }), set({ done: false, reps: 4 })] });
    const out = liveEntryToSetEntry(e);
    expect(out?.sets).toHaveLength(1);
    expect(out?.sets?.[0]).toMatchObject({ type: "work", reps: 9, weight: 60, score: 3 });
  });

  it("gibt null ohne abgehakten Satz", () => {
    expect(liveEntryToSetEntry(entry({ sets: [set({ done: false })] }))).toBeNull();
  });

  it("uebernimmt Versagen und Zielwerte fuer die Coach-Bewertung", () => {
    const e = entry({ sets: [set({ failed: true, reps: 5, targetReps: 8 })] });
    expect(e.sets[0]).toBeDefined();
    expect(liveEntryToSetEntry(e)?.sets?.[0]).toMatchObject({
      failed: true,
      reps: 5,
      targetReps: 8,
      targetWeight: 60,
    });
  });
});

describe("liveWorkWeight", () => {
  it("nimmt das hoechste abgehakte Arbeitsgewicht", () => {
    const e = entry({ sets: [set({ weight: 60 }), set({ weight: 65 }), set({ weight: 62.5 })] });
    expect(liveWorkWeight(e)).toBe(65);
  });

  it("ignoriert offene Saetze", () => {
    const e = entry({ sets: [set({ weight: 60 }), set({ weight: 90, done: false })] });
    expect(liveWorkWeight(e)).toBe(60);
  });

  it("gibt null ohne abgehakten Satz", () => {
    expect(liveWorkWeight(entry({ sets: [set({ done: false })] }))).toBeNull();
  });
});

// Die eigentliche Aussage des Features: das Ergebnis eines fertigen Blocks in
// die Coach-Naht geben und pruefen, dass dieselbe Tendenz herauskommt, die die
// naechste Einheit vorschlagen wuerde (ADR-0015). Die laufende Einheit spielt
// dabei die Rolle der letzten, der bisher letzte Eintrag die der vorletzten.
function previewState(e: LiveEntry, prevEntry: SetEntry | null = null): CoachState {
  const exo: CoachBuildExercise = {
    key: "bench",
    profile: "strength",
    tier: "main" as const,
    equipment: "barbell",
    repRange: [8, 12],
    workWeight: liveWorkWeight(e)!,
    barId: "bar1",
    referenceWeight: null,
    referencePhaseId: null,
  };
  const { suggestion } = suggestWithBar(exo, {
    phaseFocus: null,
    lastEntry: liveEntryToSetEntry(e),
    prevEntry,
    weightStep: 2.5,
    bars: [{ weight: 20 }],
    plates: [1.25, 2.5, 5, 10, 15, 20],
    dumbbells: [],
    repTarget: null,
  });
  return coachStatusFromSuggestion(suggestion, true, "kg").state;
}

describe("Vorschau auf die Coach-Entscheidung", () => {
  it("steigert am oberen Bandende in Zielanstrengung", () => {
    const sets = [1, 2, 3].map(() => set({ reps: 12, targetReps: 12, score: 3 }));
    expect(previewState(entry({ sets }))).toBe("up");
  });

  it("steigert die Wiederholungen mitten im Band", () => {
    const sets = [1, 2, 3].map(() => set({ reps: 9, targetReps: 9, score: 3 }));
    expect(previewState(entry({ sets }))).toBe("up");
  });

  it("haelt, wenn das Ziel verfehlt wurde", () => {
    const sets = [1, 2, 3].map(() => set({ reps: 6, targetReps: 10, score: 3 }));
    expect(previewState(entry({ sets }))).toBe("hold");
  });

  it("senkt bei Versagen", () => {
    const sets = [
      set({ reps: 10, targetReps: 12, score: 5 }),
      set({ reps: 7, targetReps: 12, score: 5, failed: true }),
      set({ reps: 5, targetReps: 12, score: 5, failed: true }),
    ];
    expect(previewState(entry({ sets }))).toBe("down");
  });

  it("senkt, wenn das Ziel zweimal in Folge am selben Gewicht verfehlt wurde", () => {
    const sets = [1, 2, 3].map(() => set({ reps: 6, targetReps: 10, score: 3 }));
    const prev: SetEntry = {
      sets: [1, 2, 3].map(() => ({
        type: "work" as const,
        weight: 60,
        reps: 6,
        score: 3,
        targetReps: 10,
        targetWeight: 60,
        done: true,
        failed: false,
      })),
    };
    expect(previewState(entry({ sets }), prev)).toBe("down");
  });

  // Der Fall aus #193: vier geplante Saetze, die ersten beiden nicht geschafft
  // (RIR 5), danach Abbruch. Der Block wird nie vollstaendig - eine Bewertung
  // muss es trotzdem geben, und zwar die, die auch beim Beenden herauskaeme:
  // offene Saetze verfallen dort.
  it("bewertet einen abgebrochenen Block nach dem bisher Geleisteten", () => {
    const e = entry({
      sets: [
        set({ reps: 6, targetReps: 12, score: 5, failed: true }),
        set({ reps: 4, targetReps: 12, score: 5, failed: true }),
        set({ done: false, reps: 12, targetReps: 12 }),
        set({ done: false, reps: 12, targetReps: 12 }),
      ],
    });
    expect(isBlockComplete(e)).toBe(false);
    expect(liveEntryToSetEntry(e)?.sets).toHaveLength(2);
    expect(previewState(e)).toBe("down");
  });

  it("rechnet bereits nach dem ersten abgehakten Satz", () => {
    const e = entry({
      sets: [set({ reps: 12, targetReps: 12, score: 3 }), set({ done: false })],
    });
    expect(previewState(e)).toBe("up");
  });

  it("wertet Begleituebungen nicht (carry)", () => {
    const e = entry();
    const exo: CoachBuildExercise = {
      key: "plank",
      profile: "core",
      tier: "accessory" as const,
      equipment: "bodyweight",
      repRange: [12, 20],
      workWeight: liveWorkWeight(e)!,
      barId: null,
      referenceWeight: null,
      referencePhaseId: null,
    };
    const { suggestion } = suggestWithBar(exo, {
      phaseFocus: null,
      lastEntry: liveEntryToSetEntry(e),
      prevEntry: null,
      weightStep: 2.5,
      bars: [{ weight: 20 }],
      plates: [],
      dumbbells: [],
      repTarget: null,
    });
    expect(suggestion.decision).toBe("carry");
  });
});

// Issue #268, Schritt 2: der Zwischenstand-Marker haengt nur noch an der Zeile,
// die noch wandern kann - nicht mehr ueber dem ganzen Block.
describe("previewProvisional – was noch wandern kann", () => {
  const status = {
    state: "hold" as CoachState,
    decision: "hold" as const,
    weight: 50,
    targetReps: 4,
    reason: { code: "plan-held" as const },
    note: "",
  };
  const preview = (over: Partial<LiveCoachPreview> = {}): LiveCoachPreview => ({
    status,
    scope: "week",
    outlook: { weight: 52.5, targetReps: 3 },
    provisional: true,
    ...over,
  });

  it("offene Saetze in der Doppelprogression: der Vorschlag wandert", () => {
    expect(previewProvisional(preview({ scope: "next", outlook: null }))).toBe(true);
  });

  it("offene Saetze in der Kraftphase: nur der Ausblick wandert", () => {
    expect(previewProvisional(preview())).toBe(true);
  });

  it("ohne Ausblick steht in der Kraftphase alles fest", () => {
    expect(previewProvisional(preview({ outlook: null }))).toBe(false);
  });

  it("bei vollstaendigem Block wandert nichts mehr", () => {
    expect(previewProvisional(preview({ provisional: false }))).toBe(false);
  });

  it("vor dem ersten Satz steht in der Kraftphase alles fest", () => {
    // Der Ausblick kommt erst mit dem ersten abgehakten Satz (#268, Schritt 3);
    // bis dahin traegt die Karte nur die feste Wochenvorgabe.
    expect(previewProvisional(preview({ outlook: null }))).toBe(false);
  });
});

// Issue #268, Schritt 3: die Wochenvorgabe braucht nichts Abgehaktes, die
// Doppelprogression schon.
describe("previewWorkWeight – Grundlage der Vorschau", () => {
  it("nimmt im Wochenplan den Katalogstand, auch ohne abgehakten Satz", () => {
    expect(previewWorkWeight("week", 50, null)).toBe(50);
  });

  it("laesst den Katalogstand im Wochenplan nicht mit der Einheit wandern", () => {
    expect(previewWorkWeight("week", 50, 60)).toBe(50);
  });

  it("rechnet sonst mit dem im Block bewegten Gewicht", () => {
    expect(previewWorkWeight("next", 50, 60)).toBe(60);
  });

  it("hat sonst ohne abgehakten Satz keine Grundlage", () => {
    expect(previewWorkWeight("next", 50, null)).toBeNull();
  });
});
