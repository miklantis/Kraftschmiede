// Coach – das deterministische "Gehirn" als eigenes, testbares Modul. Nimmt den
// Zustand explizit herein (Verlauf, Koerper, Phase, Inventar) und gibt
// Entscheidungen heraus. Keine DB- oder DOM-Kenntnis: es komponiert nur die reine
// Engine (suitability). Gleiche Bauform wie die Engine. 1:1 aus V1 (CoachCore +
// Glue), nur die Zustandsbeschaffung wandert in die Daten-Hooks.

import {
  suitability,
  suggestWeight,
  generateWarmup,
  volumeForWeek,
} from "@/engine";
import type { SuitabilityResult, SuggestResult, SuggestExercise } from "@/engine";
import type {
  Exercise,
  SuitabilityCtx,
  EngineSet,
  SetEntry,
  Bar,
  VolumePhase,
} from "@/engine/types";
import { isoWeekKey } from "@/engine/journey";

// Eine abgeschlossene Krafteinheit, reduziert auf das fuer das Ranking Noetige:
// Datum und die enthaltenen Uebungs-Ids.
export interface DoneSessionEntry {
  date: string; // "YYYY-MM-DD"
  exerciseIds: string[];
}

// Koerperzustand (zuletzt erfasst) fuer Kater und Erholung.
export interface BodyReadiness {
  legs: number;
  upper_body: number;
  overall: number;
  readiness: number;
}

// Vorlage in der vom Ranking erwarteten Form (Id + geordnete Uebungs-Ids).
export interface RankableTemplate {
  id: string;
  exerciseIds: string[];
}

export interface RankedWorkout<T extends RankableTemplate> {
  template: T;
  score: number;
  excluded: boolean;
  reasons: string[];
}

function dateMs(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getTime();
}

// Letzter Einsatz je Uebung als Zeitstempel (ms). Aelteste zuerst iterieren,
// damit der spaeteste Einsatz gewinnt.
export function lastByExercise(done: DoneSessionEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  const sorted = (done || []).slice().sort((a, b) => dateMs(a.date) - dateMs(b.date));
  sorted.forEach((s) => {
    s.exerciseIds.forEach((id) => {
      map[id] = dateMs(s.date);
    });
  });
  return map;
}

// Wie oft wurde jede Uebung in der Kalenderwoche von today trainiert?
export function weekCounts(
  done: DoneSessionEntry[],
  today: string,
): Record<string, number> {
  const wk = isoWeekKey(today);
  const map: Record<string, number> = {};
  (done || []).forEach((s) => {
    if (isoWeekKey(s.date) !== wk) return;
    s.exerciseIds.forEach((id) => {
      map[id] = (map[id] || 0) + 1;
    });
  });
  return map;
}

// Erholung "gruen": kein Kater >= 2 in einer Region und Readiness >= 3.
export function recoveryGreen(body: BodyReadiness): boolean {
  return (
    (body.legs || 0) < 2 &&
    (body.upper_body || 0) < 2 &&
    (body.overall || 0) < 2 &&
    (body.readiness || 3) >= 3
  );
}

export interface SuitabilityCtxInput {
  now: number;
  done: DoneSessionEntry[];
  today: string;
  body: BodyReadiness;
  phase: { focus?: string } | null;
  freqTarget: number;
}

// Baut den Eignungs-Kontext fuer die Engine aus dem hereingereichten Zustand.
export function buildSuitabilityCtx(input: SuitabilityCtxInput): SuitabilityCtx {
  return {
    now: input.now,
    lastByExercise: lastByExercise(input.done),
    soreness: {
      legs: input.body.legs,
      upper_body: input.body.upper_body,
      overall: input.body.overall,
    },
    weekCounts: weekCounts(input.done, input.today),
    phase: input.phase ?? undefined,
    freqTarget: input.freqTarget,
  };
}

// Workouts nach Eignung sortiert: ausgeschlossene ans Ende, sonst Score absteigend
// (1:1 wie V1 CoachCore.rankWorkouts).
export function rankWorkouts<T extends RankableTemplate>(
  templates: T[],
  ctx: SuitabilityCtx,
  exMap: Record<string, Exercise>,
): RankedWorkout<T>[] {
  return (templates || [])
    .map((t) => {
      const s: SuitabilityResult = suitability(
        { id: t.id, items: t.exerciseIds },
        ctx,
        { exMap },
      );
      return {
        template: t,
        score: s.score,
        excluded: s.excluded,
        reasons: s.reasons,
      };
    })
    .sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
      return b.score - a.score;
    });
}

// ---------------------------------------------------------------------------
// Sitzungsaufbau (Phase 11, Lieferung 2). Die zweite Haelfte des V1-CoachCore:
// Gewichts-/Wdh.-Vorschlag je Uebung, Begleituebungs-Uebernahme, Aufwaermrampe
// und Wochen-Satzzahl. Wie oben reine Daten herein, Entscheidung heraus - kein
// DB-/DOM-Bezug. Die Zustandsbeschaffung (letzter Eintrag, Phase, Inventar)
// liegt im Daten-Hook useLiveBuilder; hier nur die Rechnung (1:1 aus js/coach.js).
// ---------------------------------------------------------------------------

// Uebung in der vom Aufbau benoetigten Form. `key` traegt die Text-Kennung der
// Uebung (z. B. "deadlift") fuer die Deadlift-Erkennung der Aufwaermrampe.
export interface CoachBuildExercise {
  key: string | null;
  profile: "strength" | "core" | "bodyweight";
  equipment: "barbell" | "plate" | "bar" | "band" | "bodyweight";
  repRange: [number, number] | null;
  workWeight: number;
  targetScore: number;
  barId: string | null;
}

// Coach-Entscheidung mit dem zusaetzlichen "carry" (bewusst keine Wertung) fuer
// Begleit-/Koerpergewichtsuebungen, die nicht progressiv gerechnet werden.
export type CoachDecision = SuggestResult["decision"] | "carry";
export interface CoachSuggestion {
  weight: number;
  targetReps: number;
  decision: CoachDecision;
  note: string;
}

// Begleituebung/Koerpergewicht: keine Doppelprogression. Vorbelegung = letzter
// Arbeitssatz mit dem hoechsten Gewicht samt dessen Wdh.; ohne Vordaten Start-
// gewicht + oberes Repband-Ende.
export function coreCarry(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
): CoachSuggestion {
  const range = exo.repRange ?? [12, 20];
  const ws = lastEntry
    ? (lastEntry.sets ?? []).filter((s) => s.type !== "warmup")
    : [];
  if (ws.length) {
    const top = ws.reduce(
      (a, b) => ((b.weight || 0) >= (a.weight || 0) ? b : a),
      ws[0]!,
    );
    return {
      weight: top.weight != null ? top.weight : exo.workWeight || 0,
      targetReps: top.reps || range[1],
      decision: "carry",
      note: "Begleitübung – letztes Mal übernommen, frei anpassbar",
    };
  }
  return {
    weight: exo.workWeight || 0,
    targetReps: range[1],
    decision: "carry",
    note: "Begleitübung – Startwert, frei anpassbar",
  };
}

export interface SuggestBuildCtx {
  phase: { focus?: string } | null;
  lastEntry: SetEntry | null;
  bar?: Bar;
  plates?: number[];
  // Ueberschreibt das Repband der Uebung (Ziel-Repband der aktiven Phase).
  repTarget?: [number, number] | null;
}

// Gewichts-/Wdh.-Vorschlag. Core/Bodyweight -> coreCarry; sonst Doppelprogression
// ueber die Engine, Wiedereinstiegs-Reduktion bei phase.focus === "reentry". Ein
// gesetztes repTarget ueberschreibt das Repband der Uebung fuer die Rechnung.
export function suggestForExercise(
  exo: CoachBuildExercise,
  ctx: SuggestBuildCtx,
): CoachSuggestion {
  if (exo.profile === "core" || exo.profile === "bodyweight") {
    return coreCarry(exo, ctx.lastEntry);
  }
  const focus = ctx.phase ? ctx.phase.focus : null;
  const exUse: SuggestExercise = {
    workWeight: exo.workWeight,
    repRange: ctx.repTarget
      ? [ctx.repTarget[0], ctx.repTarget[1]]
      : (exo.repRange ?? undefined),
    targetScore: exo.targetScore,
    barId: exo.barId ?? undefined,
  };
  return suggestWeight(exUse, ctx.lastEntry, {
    bar: ctx.bar,
    plates: ctx.plates,
    reentry: focus === "reentry",
  });
}

// Stangenwahl fuer den Vorschlag: die schwerste Stange, die noch <= Zielgewicht
// ist; liegt das Ziel unter der leichtesten, die leichteste. Scheiben kommen oben
// drauf. Generisch ueber alles mit `weight`, damit der Aufbau seine eigene
// Stangen-Form behalten kann (keine Abhaengigkeit zurueck auf liveBuild). Der
// Aufrufer stellt sicher, dass die Liste nicht leer ist.
export function pickBarForTarget<T extends { weight: number }>(
  target: number,
  bars: T[],
): T {
  const sorted = bars.slice().sort((a, b) => a.weight - b.weight);
  let chosen = sorted[0]!;
  for (const b of sorted) {
    if (b.weight <= target + 1e-9) chosen = b;
    else break;
  }
  return chosen;
}

// Vorschlag inklusive Stangenwahl - die gemeinsame Naht fuer den Live-Aufbau
// (liveBuild) und die Uebungs-Statusanzeige (Coach-Label auf der Uebungsseite).
// Henne-Ei wie im Aufbau: bei Langhantel erst das rohe Ziel mit der LEICHTESTEN
// Stange bestimmen (damit die schwerste Stange den Boden nicht hochzieht), dann
// die passende Stange waehlen (schwerste <= Ziel, sonst leichteste), dann
// endgueltig mit dieser Stange ladbar rechnen. Ohne Langhantel/Stangen-Inventar
// ohne Stange. Die Senk-/Halte-/Steiger-Entscheidung haengt nur am Arbeitsgewicht
// und am letzten Eintrag, nicht an der Stange (die wirkt erst beim Ladbar-Machen).
export interface SuggestWithBarInput<B extends { weight: number }> {
  phaseFocus: { focus?: string } | null;
  lastEntry: SetEntry | null;
  bars: B[];
  plates: number[];
  repTarget: [number, number] | null;
}

export interface SuggestWithBarResult<B> {
  suggestion: CoachSuggestion;
  bar: B | null;
}

export function suggestWithBar<B extends { weight: number }>(
  exo: CoachBuildExercise,
  input: SuggestWithBarInput<B>,
): SuggestWithBarResult<B> {
  if (exo.equipment === "barbell" && input.bars.length > 0) {
    const lightest = input.bars.reduce(
      (a, b) => (b.weight < a.weight ? b : a),
      input.bars[0]!,
    );
    const rawSug = suggestForExercise(exo, {
      phase: input.phaseFocus,
      lastEntry: input.lastEntry,
      bar: { weight: lightest.weight },
      plates: input.plates,
      repTarget: input.repTarget,
    });
    const bar = pickBarForTarget(rawSug.weight, input.bars);
    const suggestion = suggestForExercise(exo, {
      phase: input.phaseFocus,
      lastEntry: input.lastEntry,
      bar: { weight: bar.weight },
      plates: input.plates,
      repTarget: input.repTarget,
    });
    return { suggestion, bar };
  }
  const suggestion = suggestForExercise(exo, {
    phase: input.phaseFocus,
    lastEntry: input.lastEntry,
    bar: undefined,
    plates: input.plates,
    repTarget: input.repTarget,
  });
  return { suggestion, bar: null };
}

// ---------------------------------------------------------------------------
// Coach-Status fuer die Uebungsseite. Uebersetzt die Coach-Entscheidung in die
// grobe Auf/Halten/Senken-Lesart fuer Liste und Detail. Reine Abbildung, keine
// neue Rechnung: Begleit-/Koerpergewichtsuebungen werden nicht progressiv
// gerechnet ("carry" -> frei anpassbar); ohne Vordaten "start"; sonst aus der
// decision (increase/increase-reps -> hoch, decrease -> runter, hold -> halten).
// ---------------------------------------------------------------------------

export type CoachState = "up" | "hold" | "down" | "carry" | "start";

export interface CoachStatus {
  state: CoachState;
  // Die feine Engine-Entscheidung (fuer die ausfuehrliche Anzeige im Detail).
  decision: CoachDecision;
  weight: number;
  targetReps: number;
  note: string;
}

export function coachStatusFromSuggestion(
  sug: CoachSuggestion,
  hadPriorData: boolean,
): CoachStatus {
  let state: CoachState;
  if (sug.decision === "carry") state = "carry";
  else if (!hadPriorData) state = "start";
  else if (sug.decision === "increase" || sug.decision === "increase-reps")
    state = "up";
  else if (sug.decision === "decrease") state = "down";
  else state = "hold";
  return {
    state,
    decision: sug.decision,
    weight: sug.weight,
    targetReps: sug.targetReps,
    note: sug.note,
  };
}

// Aufwaermsaetze: nur Langhantel mit Stange bekommt eine Rampe; Deadlift weniger
// Volumen, erste Uebung (isFirst) gruendlicher. Sonst [].
export function warmupFor(
  exo: CoachBuildExercise,
  workWeight: number,
  bar: Bar | null | undefined,
  isFirst: boolean,
  plates: number[],
): EngineSet[] {
  if (!exo || exo.equipment !== "barbell" || !bar) return [];
  const isDeadlift = /deadlift/i.test(exo.key ?? "");
  return generateWarmup(workWeight, bar.weight, plates, {
    isLift1: !!isFirst,
    isDeadlift,
  });
}

// Empfohlene Arbeitssatzzahl der Woche aus der Phasen-Rampe (volumeForWeek);
// weekInPhase ist 0-basiert, green = Erholung gruen. Ohne Phase Default 3.
export function plannedSets(
  phase: VolumePhase | null,
  weekInPhase: number,
  green: boolean,
): number {
  if (!phase) return 3;
  return volumeForWeek(phase, weekInPhase, green);
}
