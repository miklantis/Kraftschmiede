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
  planWeekLoad,
  anchorAfterSession,
  weekDemandsSession,
  scoreForRir,
} from "@/engine";
import type {
  SuitabilityResult,
  SuggestResult,
  SuggestExercise,
  CoachReason,
  CoachReasonCode,
  CoachScope,
  PlanLoadReason,
  RampLoad,
  WeekPlanWeek,
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
import { coachNote } from "./coachText";
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
  // Rolle der Uebung in der Einheit. Der Wochenplan der Kraftphase gilt nur fuer
  // Hauptuebungen; Zusatzuebungen bleiben beim Coach.
  tier: "main" | "accessory";
  equipment: "barbell" | "plate" | "bar" | "band" | "bodyweight" | "dumbbell";
  repRange: [number, number] | null;
  workWeight: number;
  targetScore: number;
  barId: string | null;
  // Eingefrorenes Arbeitsgewicht vom Start einer Lastfaktor-Journey bzw. Anker
  // einer Phase mit Wochenplan (null, solange keines von beidem laeuft).
  referenceWeight: number | null;
  // Phase, an die der Anker gebunden ist. Ohne diesen Bezug liesse sich „Anker
  // dieser Phase" nicht von „noch kein Anker" unterscheiden, und die Last
  // wuerde pro Einheit statt pro Woche steigen.
  referencePhaseId: string | null;
  // Startgewicht X derselben Phase (Stand beim Eintritt). Bezug der Entlastung
  // in der Entlastungswoche; fehlt es, gilt der Anker.
  planStartWeight?: number | null;
}

// Coach-Entscheidung mit dem zusaetzlichen "carry" (bewusst keine Wertung) fuer
// Begleit-/Koerpergewichtsuebungen, die nicht progressiv gerechnet werden.
export type CoachDecision = SuggestResult["decision"] | "carry";
export interface CoachSuggestion {
  weight: number;
  targetReps: number;
  decision: CoachDecision;
  /** Kennung samt Zahlen; den Satz baut lib/coachText.ts (Issue #268). */
  reason: CoachReason;
}

// Uebernahme ohne Progression: Vorbelegung = letzter Arbeitssatz mit dem
// hoechsten Gewicht samt dessen Wdh.; ohne Vordaten Startgewicht + oberes
// Repband-Ende. Gemeinsamer Kern fuer Begleituebungen (coreCarry) und fuer das
// freie Training ohne Journey (freeCarry) - unterschiedlich ist nur der Text.
function carrySuggestion(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
  codeCarried: CoachReasonCode,
  codeStart: CoachReasonCode,
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
      reason: { code: codeCarried },
    };
  }
  return {
    weight: exo.workWeight || 0,
    targetReps: range[1],
    decision: "carry",
    reason: { code: codeStart },
  };
}

// Begleituebung/Koerpergewicht: keine Doppelprogression.
export function coreCarry(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
): CoachSuggestion {
  return carrySuggestion(exo, lastEntry, "carry-last", "carry-start");
}

// Freies Training (keine aktive Journey): der Coach gibt nichts vor. Jede Uebung
// bekommt die Werte der letzten Einheit als reine Vorbelegung - kein Steigern,
// kein Senken, kein aktives Halten.
export function freeCarry(
  exo: CoachBuildExercise,
  lastEntry: SetEntry | null,
): CoachSuggestion {
  return carrySuggestion(exo, lastEntry, "free-last", "free-start");
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
  // Wochenplan-Bezug der laufenden Phase; null = die Phase laeuft ueber die
  // Doppelprogression wie bisher.
  plan?: PlanContext | null;
}

// Vorgabe der Journey fuer diese Uebung: Referenzgewicht x Lastfaktor. null,
// solange keine Lastfaktor-Journey laeuft oder kein Referenzgewicht eingefroren
// ist – dann rechnet der Coach wie gewohnt aus der letzten Leistung.
export function rampLoad(
  exo: CoachBuildExercise,
  loadFactor: number | null | undefined,
): RampLoad | null {
  if (loadFactor == null || !(loadFactor > 0)) return null;
  const ref = exo.referenceWeight;
  if (ref == null || !(ref > 0)) return null;
  // Gedeckelt wird nur unterhalb der vollen Last; was als "voll" gilt, sagt
  // isNeutralLoad (dort liegt die Toleranz).
  return {
    weight: ref * loadFactor,
    cap: !isNeutralLoad(loadFactor) && loadFactor < 1,
  };
}

// ---------------------------------------------------------------------------
// Wochenplan der Kraftphase (Issue #225, Schritt 3/4). Traegt die laufende Phase
// einen Wochenplan und ist die Uebung eine Hauptuebung mit Profil `strength`,
// gibt der Plan Saetze, Wiederholungen und Ziel-Anstrengung vor; das Gewicht
// kommt aus der Anker-Regel der Engine (planWeekLoad). Das Wiederholungsband
// der Phase ruht dann. Fuer alle anderen Uebungen und Phasen aendert sich
// nichts - der Plan uebersteuert an genau dieser einen Stelle.
//
// In der Entlastungswoche der Testphase gilt derselbe Weg, nur entlastend:
// 2 Saetze zu 3-5 Wiederholungen mit dem loadPct des Plans (60 %) vom
// Startgewicht X der vorangegangenen Kraftphase, ohne Steigerung. Die reine
// Testwoche danach plant nichts und kommt hier gar nicht an.
// ---------------------------------------------------------------------------

/** Alles, was der Plan ueber diese Uebung wissen muss. Die Beschaffung liegt in
 *  den Daten-Hooks (phaseContext + lastEntries), hier nur die Entscheidung. */
export interface PlanContext {
  /** Geltende Zeile des Wochenplans (Saetze, Wiederholungen, RIR). */
  week: WeekPlanWeek;
  /** Zeile der Vorwoche – Massstab fuer die Bewertung der letzten Einheit. */
  prevWeek: WeekPlanWeek;
  /** Zeile der Folgewoche – Grundlage des Ausblicks (planOutlook). null in der
   *  letzten Phasenwoche: dort kommt keine naechste Woche mehr. */
  nextWeek: WeekPlanWeek | null;
  /** Ziel-Wiederholungen der ersten Planwoche (Bezug des Startgewichts). */
  startReps: number;
  /** Anker der Phase (reference_weight, an diese Phase gebunden); null = die
   *  Uebung tritt gerade in die Phase ein. In der Entlastungswoche ist es das
   *  Startgewicht X der vorangegangenen Kraftphase. */
  anchor: number | null;
  /** Entlastungswoche der Testphase: entlasten statt steigern (loadPct). */
  deload?: boolean;
  /** Letzte Einheit dieser Uebung in der laufenden Journey-Woche. */
  currentWeekEntry: SetEntry | null;
  /** Letzte Einheit dieser Uebung in der vorigen Journey-Woche. */
  previousWeekEntry: SetEntry | null;
  /** Geschaetztes 1RM der Uebung (Startgewicht beim Phaseneintritt). */
  rm: number | null;
}

/** Gibt der Wochenplan fuer diese Uebung die Vorgaben? Nur Hauptuebungen mit
 *  Kraftprofil - Zusatzuebungen wie Curl und Pull Over fallen auf ihr eigenes
 *  Band aus dem Uebungskatalog zurueck, Core und Koerpergewicht wie bisher. */
export function planGovernsExercise(
  exo: { profile: string; tier: string },
  plan: PlanContext | null | undefined,
): boolean {
  return !!plan && exo.profile === "strength" && exo.tier === "main";
}

/** Fuer welchen Zeitraum die Coach-Zahlen dieser Uebung gelten: gibt der
 *  Wochenplan die Vorgabe, gilt sie die ganze Journey-Woche ("week"), sonst
 *  bezieht sie sich auf die naechste Einheit ("next"). Die eine Stelle, an der
 *  diese Zuordnung faellt - Trainingskarte und Uebungsseite lesen sie beide. */
export function coachScopeFor(
  exo: { profile: string; tier: string },
  plan: PlanContext | null | undefined,
): CoachScope {
  return planGovernsExercise(exo, plan) ? "week" : "next";
}

/** Satzzahl je Uebung: der Plan setzt sie fest, sonst bleibt es bei der
 *  Wochen-Satzzahl der Phase. */
export function planSetCount(
  exo: { profile: string; tier: string },
  plan: PlanContext | null | undefined,
  fallback: number,
): number {
  return planGovernsExercise(exo, plan) ? plan!.week.sets : fallback;
}

/** Ziel-Anstrengung je Satz als Score: der Plan denkt in RIR, die Saetze tragen
 *  den Score. Ohne Plan bleibt es beim Zielscore der Uebung. */
export function planTargetScore(
  exo: { profile: string; tier: string; targetScore: number },
  plan: PlanContext | null | undefined,
): number {
  return planGovernsExercise(exo, plan)
    ? scoreForRir(plan!.week.rir)
    : exo.targetScore;
}

/** Kennung der Wochenplan-Regel in die Kennung des Textkatalogs. Der Satz dazu
 *  steht in lib/coachText.ts - hier faellt keine Formulierung mehr. */
const PLAN_CODES: Record<PlanLoadReason, CoachReasonCode> = {
  start: "plan-start",
  "same-week": "plan-same-week",
  raised: "plan-raised",
  held: "plan-held",
  deload: "plan-deload",
};

/** Vorschlag aus dem Wochenplan; null, wenn der Plan hier nicht zustaendig ist. */
export function planSuggestion(
  exo: CoachBuildExercise,
  ctx: SuggestBuildCtx,
): CoachSuggestion | null {
  const plan = ctx.plan;
  if (!planGovernsExercise(exo, plan)) return null;
  const p = plan!;
  const load = planWeekLoad({
    anchor: p.anchor,
    currentWeekEntry: p.currentWeekEntry,
    previousWeekEntry: p.previousWeekEntry,
    previousTargetScore: scoreForRir(p.prevWeek.rir),
    est1RM: p.rm,
    fallbackWeight: exo.workWeight,
    startReps: p.startReps,
    loadPct: p.week.loadPct,
    step: ctx.weightStep ?? 2.5,
    deload: p.deload ?? false,
    opts: { bar: ctx.bar, plates: ctx.plates, dumbbells: ctx.dumbbells },
  });
  return {
    weight: load.weight,
    targetReps: p.week.repsMax ?? p.week.reps,
    decision: load.reason === "raised" ? "increase" : "hold",
    reason: { code: PLAN_CODES[load.reason], diff: load.diff },
  };
}

/** Ausblick auf die naechste Planwoche: Gewicht und Wiederholungen, die dort
 *  vorgegeben werden, wenn die gewertete Einheit die letzte dieser Woche bleibt.
 *
 *  Eigene Aussage neben der Wochenvorgabe (Issue #268, Schritt 2). Vorher trug
 *  die Karte beides in einer Zeile: das Gewicht der naechsten Woche neben den
 *  Wiederholungen der laufenden - ein Paar, das real nie vorkommt. Getrennt
 *  gerechnet stimmen beide Zeilen wieder mit dem ueberein, was tatsaechlich auf
 *  der Hantel landet.
 *
 *  Keine neue Regel: dieselbe Anker-Fortschreibung wie beim Beenden
 *  (anchorAfterSession) und dieselbe Wochenrechnung (planWeekLoad), nur eine
 *  Woche weiter gestellt. */
export interface PlanOutlook {
  weight: number;
  targetReps: number;
}

export interface PlanOutlookInput {
  /** Vorgabe der laufenden Woche - das Gewicht, das auf den Saetzen liegt. */
  weekWeight: number;
  /** Hoechstes tatsaechlich bewegtes Arbeitsgewicht der gewerteten Einheit;
   *  null, wenn noch nichts steht. Zieht den Anker nach unten nach. */
  workedWeight: number | null;
  /** Die gewertete Einheit: die letzte dieser Uebung in der laufenden Woche. */
  judged: SetEntry | null;
}

/** null, wo es keinen Ausblick gibt: ausserhalb des Wochenplans, in der letzten
 *  Phasenwoche und in der Entlastungswoche (sie laeuft in die Testwoche und
 *  nicht in den naechsten Schritt der Rampe). */
export function planOutlook(
  exo: CoachBuildExercise,
  ctx: SuggestBuildCtx,
  input: PlanOutlookInput,
): PlanOutlook | null {
  const plan = ctx.plan;
  if (!planGovernsExercise(exo, plan)) return null;
  const p = plan!;
  const next = p.nextWeek;
  if (p.deload || !weekDemandsSession(next)) return null;
  const load = planWeekLoad({
    // Anker nach dieser Einheit - genau die Fortschreibung, die beim Beenden
    // in den Katalog geht.
    anchor: anchorAfterSession(input.weekWeight, input.workedWeight),
    currentWeekEntry: null,
    previousWeekEntry: input.judged,
    // Bewertet wird die laufende Woche, also gilt deren Ziel-Anstrengung.
    previousTargetScore: scoreForRir(p.week.rir),
    est1RM: p.rm,
    fallbackWeight: exo.workWeight,
    startReps: p.startReps,
    loadPct: next!.loadPct,
    step: ctx.weightStep ?? 2.5,
    deload: false,
    // Kurzhantel-Stufen nur bei Kurzhantel-Uebungen: loadableDown fragt sie
    // zuerst ab und laesst Stange und Scheiben dann liegen - eine Langhantel
    // wuerde damit auf die schwerste vorhandene Kurzhantel gerundet (#279).
    opts: {
      bar: ctx.bar,
      plates: ctx.plates,
      dumbbells: exo.equipment === "dumbbell" ? ctx.dumbbells : undefined,
    },
  });
  return { weight: load.weight, targetReps: next!.repsMax ?? next!.reps };
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
  // Der Wochenplan der Kraftphase uebersteuert die Doppelprogression.
  const planned = planSuggestion(exo, ctx);
  if (planned) return planned;
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
    ramp: rampLoad(exo, ctx.loadFactor),
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
  // Wochenplan-Bezug der laufenden Phase; null = Doppelprogression wie bisher.
  plan?: PlanContext | null;
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
      plan: input.plan ?? null,
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
      plan: input.plan ?? null,
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
      plan: input.plan ?? null,
    });
    return { suggestion, bar: null };
  }
  const suggestion = suggestForExercise(exo, {
    phase: input.phaseFocus,
    lastEntry: input.lastEntry,
    prevEntry: input.prevEntry ?? null,
    weightStep: input.weightStep ?? null,
    bar: undefined,
    plates: input.plates,
    repTarget: input.repTarget,
    freeMode: input.freeMode,
    loadFactor: input.loadFactor,
    plan: input.plan ?? null,
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
  // Kennung der Begruendung - fuer alles, was mehr als den Satz braucht.
  reason: CoachReason;
  // Fertiger Satz aus dem Textmodul (lib/coachText.ts).
  note: string;
}

/** Coach-Entscheidung in die Anzeigeform. `unit` kommt aus den Einstellungen
 *  ("kg"/"lb") und wird nur fuer Saetze mit Gewichtsdifferenz gebraucht. */
export function coachStatusFromSuggestion(
  sug: CoachSuggestion,
  hadPriorData: boolean,
  unit: string,
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
    reason: sug.reason,
    note: coachNote(sug.reason, unit),
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
