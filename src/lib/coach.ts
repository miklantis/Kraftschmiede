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
import type {
  SuitabilityResult,
  SuggestResult,
  SuggestExercise,
  RampLoad,
} from "@/engine";
import type {
  Exercise,
  SuitabilityCtx,
  EngineSet,
  SetEntry,
  Bar,
  VolumePhase,
} from "@/engine/types";
import { isoWeekKey } from "@/engine/journey";
import { isNeutralLoad } from "./loadFactor";

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
  equipment: "barbell" | "plate" | "bar" | "band" | "bodyweight" | "dumbbell";
  repRange: [number, number] | null;
  workWeight: number;
  targetScore: number;
  barId: string | null;
  // Eingefrorenes Arbeitsgewicht vom Start einer Lastfaktor-Journey (null,
  // solange keine solche laeuft). Bezugspunkt der Rampe.
  referenceWeight: number | null;
  // Phase, zu der das Referenzgewicht gehoert. Nur wenn sie zur laufenden Phase
  // passt, ist der Anker der Lastrampe gueltig; sonst muss er erst gesetzt
  // werden. Ohne Lastrampe ohne Bedeutung.
  referencePhaseId: string | null;
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

// Uebernahme ohne Progression: Vorbelegung = letzter Arbeitssatz mit dem
// hoechsten Gewicht samt dessen Wdh.; ohne Vordaten Startgewicht + oberes
// Repband-Ende. Gemeinsamer Kern fuer Begleituebungen (coreCarry) und fuer das
// freie Training ohne Journey (freeCarry) - unterschiedlich ist nur der Text.
function carrySuggestion(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
  noteCarried: string,
  noteStart: string,
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
      note: noteCarried,
    };
  }
  return {
    weight: exo.workWeight || 0,
    targetReps: range[1],
    decision: "carry",
    note: noteStart,
  };
}

// Begleituebung/Koerpergewicht: keine Doppelprogression.
export function coreCarry(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
): CoachSuggestion {
  return carrySuggestion(
    exo,
    lastEntry,
    "Begleitübung – letztes Mal übernommen, frei anpassbar",
    "Begleitübung – Startwert, frei anpassbar",
  );
}

// Freies Training (keine aktive Journey): der Coach gibt nichts vor. Jede Uebung
// bekommt die Werte der letzten Einheit als reine Vorbelegung - kein Steigern,
// kein Senken, kein aktives Halten.
export function freeCarry(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
): CoachSuggestion {
  return carrySuggestion(
    exo,
    lastEntry,
    "Freies Training – Werte vom letzten Mal, frei anpassbar",
    "Freies Training – Startwert, frei anpassbar",
  );
}

// Arbeitssatzzahl der letzten Einheit einer Uebung (Aufwaermen ausgenommen).
// null ohne Vordaten. Grundlage der Satzzahl im freien Training.
export function lastWorkSetCount(lastEntry: SetEntry | null): number | null {
  const ws = (lastEntry?.sets ?? []).filter((s) => s.type !== "warmup");
  return ws.length > 0 ? ws.length : null;
}

export interface SuggestBuildCtx {
  phase: { focus?: string } | null;
  lastEntry: SetEntry | null;
  // Einheit davor (Rueckwaertsregel bei zweimal verfehltem Ziel).
  prevEntry?: SetEntry | null;
  // Schrittweite eines Gewichtssprungs aus den Einstellungen; null = Standard.
  weightStep?: number | null;
  bar?: Bar;
  plates?: number[];
  // Vorhandene Kurzhantel-Stufen (nur fuer Kurzhantel-Uebungen gesetzt).
  dumbbells?: number[];
  // Ueberschreibt das Repband der Uebung (Ziel-Repband der aktiven Phase).
  repTarget?: [number, number] | null;
  // Freies Training ohne aktive Journey: keine Progression, nur Uebernahme.
  freeMode?: boolean;
  // Lastfaktor der aktiven Phase; null, wenn die laufende Journey ohne
  // Lastfaktor arbeitet (Normalfall).
  loadFactor?: number | null;
  // Anteil der Wochenlast am Anker der Phase (Lastrampe); null, wenn die
  // laufende Phase die Last nicht plant.
  loadShare?: number | null;
  // Id der laufenden Phase - nur damit laesst sich pruefen, ob der gespeicherte
  // Anker zu dieser Phase gehoert.
  phaseId?: string | null;
}

/** Was die Journey dieser Uebung an Last vorgibt. Zwei Wege, die nie
 *  gleichzeitig an derselben Phase haengen:
 *  - `loadFactor`: ein Faktor je Phase (Vorlage "Wiederaufbau nach Fasten").
 *  - `loadShare` + `phaseId`: die Wochenrampe einer lastgesteuerten Phase. */
export interface RampInput {
  loadFactor?: number | null;
  loadShare?: number | null;
  phaseId?: string | null;
}

// Vorgabe der Journey fuer diese Uebung. Zwei Quellen, in dieser Reihenfolge:
//
// 1. Lastrampe der Phase: Anker x Wochenanteil. Der Anker steckt im
//    Referenzgewicht und gilt nur, wenn er zur laufenden Phase gehoert – beim
//    ersten Einsatz der Uebung in einer neuen Phase gibt es ihn noch nicht,
//    dann setzt ihn der Phaseneinstieg (phaseEntryOverride in liveBuild).
// 2. Lastfaktor der Phase: Referenzgewicht x Faktor.
//
// null, solange keine der beiden greift – dann rechnet der Coach wie gewohnt
// aus der letzten Leistung.
export function rampLoad(
  exo: CoachBuildExercise,
  input: RampInput | number | null | undefined,
): RampLoad | null {
  const o: RampInput =
    input == null || typeof input === "number" ? { loadFactor: input } : input;
  const ref = exo.referenceWeight;

  if (o.loadShare != null && o.loadShare > 0) {
    // Der Anker muss zur laufenden Phase gehoeren; ein Anker aus der Vorphase
    // wuerde die Rampe auf dem alten Niveau festnageln.
    if (
      ref != null &&
      ref > 0 &&
      o.phaseId != null &&
      exo.referencePhaseId === o.phaseId
    ) {
      // Die geplante Last ist Ziel und Obergrenze: der Coach steuert nur noch
      // die Wiederholungen und reagiert nach unten.
      return { weight: ref * o.loadShare, cap: true };
    }
    return null;
  }

  const loadFactor = o.loadFactor;
  if (loadFactor == null || !(loadFactor > 0)) return null;
  if (ref == null || !(ref > 0)) return null;
  // Gedeckelt wird nur unterhalb der vollen Last; was als "voll" gilt, sagt
  // isNeutralLoad (dort liegt die Toleranz).
  return {
    weight: ref * loadFactor,
    cap: !isNeutralLoad(loadFactor) && loadFactor < 1,
  };
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
  if (ctx.freeMode) {
    return freeCarry(exo, ctx.lastEntry);
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
    dumbbells: ctx.dumbbells,
    reentry: focus === "reentry",
    ramp: rampLoad(exo, {
      loadFactor: ctx.loadFactor,
      loadShare: ctx.loadShare,
      phaseId: ctx.phaseId,
    }),
    step: ctx.weightStep,
    prevEntry: ctx.prevEntry ?? null,
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
  // Einheit davor (Rueckwaertsregel bei zweimal verfehltem Ziel).
  prevEntry?: SetEntry | null;
  // Schrittweite eines Gewichtssprungs aus den Einstellungen; null = Standard.
  weightStep?: number | null;
  bars: B[];
  plates: number[];
  // Vorhandene Kurzhantel-Stufen; nur fuer Kurzhantel-Uebungen genutzt.
  dumbbells: number[];
  repTarget: [number, number] | null;
  // Freies Training ohne aktive Journey (Vorbelegung statt Progression).
  freeMode?: boolean;
  // Lastfaktor der aktiven Phase; null ausserhalb einer Lastfaktor-Journey.
  loadFactor?: number | null;
  // Lastrampe der aktiven Phase (Wochenanteil und Phase dazu); null, wenn die
  // Phase die Last nicht plant.
  loadShare?: number | null;
  phaseId?: string | null;
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
      prevEntry: input.prevEntry ?? null,
      weightStep: input.weightStep ?? null,
      bar: { weight: lightest.weight },
      plates: input.plates,
      repTarget: input.repTarget,
      freeMode: input.freeMode,
      loadFactor: input.loadFactor,
      loadShare: input.loadShare,
      phaseId: input.phaseId,
    });
    const bar = pickBarForTarget(rawSug.weight, input.bars);
    const suggestion = suggestForExercise(exo, {
      phase: input.phaseFocus,
      lastEntry: input.lastEntry,
      prevEntry: input.prevEntry ?? null,
      weightStep: input.weightStep ?? null,
      bar: { weight: bar.weight },
      plates: input.plates,
      repTarget: input.repTarget,
      freeMode: input.freeMode,
      loadFactor: input.loadFactor,
      loadShare: input.loadShare,
      phaseId: input.phaseId,
    });
    return { suggestion, bar };
  }
  if (exo.equipment === "dumbbell") {
    // Kurzhantel: keine Stange, keine Scheiben. Der Vorschlag wird auf die
    // naechste vorhandene Kurzhantel-Stufe gerundet (je Hand).
    const suggestion = suggestForExercise(exo, {
      phase: input.phaseFocus,
      lastEntry: input.lastEntry,
      prevEntry: input.prevEntry ?? null,
      weightStep: input.weightStep ?? null,
      bar: undefined,
      plates: input.plates,
      dumbbells: input.dumbbells,
      repTarget: input.repTarget,
      freeMode: input.freeMode,
      loadFactor: input.loadFactor,
      loadShare: input.loadShare,
      phaseId: input.phaseId,
    });
    return { suggestion, bar: null };
  }
  const suggestion = suggestForExercise(exo, {
    phase: input.phaseFocus,
    lastEntry: input.lastEntry,
    bar: undefined,
    plates: input.plates,
    repTarget: input.repTarget,
    freeMode: input.freeMode,
    loadFactor: input.loadFactor,
    loadShare: input.loadShare,
    phaseId: input.phaseId,
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
