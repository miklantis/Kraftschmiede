// Die Coach-Kette an einer Stelle (Issue #380, Kandidat 2 des
// Architektur-Reviews 2026-08). Aus Uebung, Wochenplan-Stand und Phase entsteht
// hier der fertige Coach-Stand: Plan-Bezug, geltendes Repband, Vorschlag samt
// Stange, Phasenwechsel-Einstieg - und darauf aufbauend die Anzeigeform
// (CoachView) mit Status, Geltungsbereich und Ausblick.
//
// Vorher lag diese Kette dreimal von Hand gelegt im Code: im Live-Aufbau
// (lib/liveBuild), in der Uebungs-Statusanzeige (hooks/useCoachStatuses) und in
// der Coach-Vorschau des Trainings (hooks/useLiveCoachPreview). Zwei der drei
// Fassungen lagen in Hooks und damit ausserhalb der Testlinie - es gibt keine
// React-Testbibliothek im Projekt. Dass sie auseinanderlaufen, war kein
// theoretischer Fall: der Phasenwechsel-Einstieg musste nachtraeglich in die
// Statusanzeige kopiert werden, weil sie sonst ein anderes Gewicht zeigte als
// die gestartete Einheit. Jetzt beschaffen die Aufrufer nur noch Daten.
//
// Reine Funktionen ohne DB-/DOM-Bezug: Daten herein, Entscheidung heraus. Die
// einzelnen Coach-Regeln bleiben in lib/coach.ts und in der Engine; hier steht
// nur, in welcher Reihenfolge sie greifen und was die drei Lagen unterscheidet.

import { workWeightForPhase, workSets, type CoachScope } from "@/engine";
import type { PhaseMark, SetEntry } from "@/engine/types";
import {
  suggestWithBar,
  rampLoad,
  planGovernsExercise,
  coachScopeFor,
  coachStatusFromSuggestion,
  entryWorkWeight,
  planOutlook,
  type CoachBuildExercise,
  type CoachSuggestion,
  type CoachView,
  type PlanContext,
} from "./coach";
import { planContextFor, type PlanSource } from "./planContext";
import { previewWorkWeight } from "./livePreview";

// Ziel-Repband, das gerade gilt: das Band der Phase ueberstimmt das
// Uebungs-Repband - aber nur fuer Kraftuebungen. Gerechnet wird das Band nicht
// hier, sondern einmal in derivePhaseContext (ueber phaseRepBand); hier bleibt
// nur das Tor. Exportiert, weil auch der Coach-Export dieselbe Abgrenzung
// braucht.
export function activeRepTarget(
  exo: { profile: "strength" | "core" | "bodyweight"; tier: "main" | "accessory" },
  phaseRepTarget: [number, number] | null,
  hasPhase: boolean,
  plan?: PlanContext | null,
): [number, number] | null {
  // Gibt der Wochenplan die Wiederholungen vor, ruht das Band der Phase.
  if (planGovernsExercise(exo, plan)) return null;
  if (!hasPhase || exo.profile !== "strength") return null;
  return phaseRepTarget;
}

// Repband, in dem die letzte Einheit gerechnet wurde: Spanne der Ziel-Wdh der
// Arbeitssaetze (Aufwaermen ausgenommen); faellt auf die tatsaechlichen Wdh
// zurueck, wenn keine Ziel-Wdh gespeichert sind. null ohne verwertbaren Satz.
function lastBand(lastEntry: SetEntry | null): [number, number] | null {
  const ws = workSets(lastEntry);
  const reps = ws
    .map((s) => (s.targetReps != null && s.targetReps > 0 ? s.targetReps : s.reps))
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (!reps.length) return null;
  return [Math.min(...reps), Math.max(...reps)];
}

// Zwei Repbaender sind echt getrennt, wenn sie sich nicht einmal an einer
// Wiederholung beruehren (Ueberlappung -> kein Sprung).
function bandsSeparated(a: [number, number], b: [number, number]): boolean {
  return Math.max(a[0], b[0]) > Math.min(a[1], b[1]);
}

// Schwerster Arbeitssatz der letzten Einheit (getragenes Gewicht) als Bezug fuer
// die Aufwaerts-Deckelung des Einstiegs. null ohne verwertbaren Satz.
function topWorkWeight(lastEntry: SetEntry | null): number | null {
  const ws = workSets(lastEntry);
  let top: number | null = null;
  for (const st of ws) {
    const w = typeof st.weight === "number" ? st.weight : null;
    if (w != null && (top == null || w > top)) top = w;
  }
  return top;
}

/** Eingabe fuer den Phasenwechsel-Einstieg: der fertige Vorschlag samt der
 *  Vordaten, aus denen der Einstieg entschieden wird. */
export interface PhaseEntryInput {
  exo: CoachBuildExercise;
  /** Getestetes 1RM der Uebung (null = keins). */
  rm: number | null;
  /** Ziel-Repband, das gerade gilt (activeRepTarget). */
  repTarget: [number, number] | null;
  /** Gewaehlte Stange; null ohne Langhantel. */
  bar: { weight: number } | null;
  lastEntry: SetEntry | null;
  plates: number[];
  loadFactor: number | null;
  /** Vorschlag des Coaches (suggestWithBar), der ueberschrieben werden kann. */
  suggestion: { weight: number; targetReps: number };
}

export interface PhaseEntryResult {
  weight: number;
  targetReps: number;
  /** true = der Einstieg hat gegriffen (Kartenhinweis in der Einheit). */
  phaseEntry: boolean;
}

// Phasenwechsel-Einstieg: springt die Zielzone der neuen Phase deutlich (echt
// getrennt) vom Repband der letzten Einheit weg und liegt ein sauberes 1RM
// vor, zieht die erste Einheit ihr Startgewicht einmalig aus dem 1RM statt aus
// der Doppelprogression. Nur Langhantel (Scheiben-Rechnung). Verletzungs-
// bewusst gedeckelt und abgerundet (workWeightForPhase). Selbstbegrenzt: ab
// der zweiten Einheit liegt das letzte Band in der neuen Zone -> kein Sprung.
// Gibt die Journey die Last selbst vor (Lastliste an der Phase), steuert sie den
// Phasenwechsel bereits im Vorschlag - der 1RM-Umweg wuerde dagegenhalten.
//
// Greift der Einstieg nicht, kommt der Vorschlag unveraendert zurueck.
export function phaseEntryOverride(input: PhaseEntryInput): PhaseEntryResult {
  const unchanged: PhaseEntryResult = {
    weight: input.suggestion.weight,
    targetReps: input.suggestion.targetReps,
    phaseEntry: false,
  };

  const ramp = rampLoad(input.exo, input.loadFactor);
  if (
    ramp ||
    input.exo.profile !== "strength" ||
    !input.repTarget ||
    !input.bar ||
    input.rm == null ||
    !(input.rm > 0)
  ) {
    return unchanged;
  }

  const prev = lastBand(input.lastEntry);
  if (!prev || !bandsSeparated(prev, input.repTarget)) return unchanged;

  const carried = topWorkWeight(input.lastEntry) ?? input.suggestion.weight;
  const res = workWeightForPhase(input.rm, input.repTarget, {
    bar: { weight: input.bar.weight },
    plates: input.plates,
    currentWeight: carried,
  });
  if (res.decision === "hold") return unchanged;

  return {
    weight: res.weight,
    // konservativ am leichteren (oberen) Bandende einsteigen
    targetReps: input.repTarget[1],
    phaseEntry: true,
  };
}

/** Uebung, wie die Coach-Kette sie braucht: die Coach-Felder plus die Id
 *  (Schluessel des Plan-Bezugs) und das getestete 1RM (Phasenwechsel-Einstieg). */
export interface CoachStandExercise extends CoachBuildExercise {
  id: string;
  rm: number | null;
}

/** Die laufende Einheit als Vordaten - gesetzt nur von der Coach-Vorschau im
 *  Training. Sie ist die einzige der drei Lagen, die nicht vom gespeicherten
 *  Stand ausgeht, und genau daran haengen beide Abweichungen:
 *
 *  1. Ausserhalb des Wochenplans rechnet sie mit dem heute tatsaechlich
 *     bewegten Gewicht statt mit dem Katalogstand (previewWorkWeight) - und
 *     ohne abgehakten Satz gibt es nichts zu rechnen (Ergebnis null).
 *  2. Der Phasenwechsel-Einstieg ruht: ob nach dieser Einheit ein
 *     Phasenwechsel ansteht, ist waehrend des Trainings noch nicht
 *     entschieden - der Einstieg wuerde ein Gewicht zeigen, das so nicht
 *     zwingend eintritt. */
export interface RunningEntry {
  /** Hoechstes heute bewegtes Arbeitsgewicht (liveWorkWeight); null, solange
   *  kein Arbeitssatz abgehakt ist. */
  workedWeight: number | null;
}

export interface CoachStandInput<B extends { weight: number }> {
  exo: CoachStandExercise;
  /** Wochenplan-Stand der laufenden Phase (buildPlanSource); null/undefined =
   *  die Phase laeuft ueber die Doppelprogression. */
  planSource: PlanSource | null | undefined;
  phaseFocus: PhaseMark | null;
  /** Fertig gerechnetes Ziel-Repband der Phase (derivePhaseContext). */
  phaseRepTarget: [number, number] | null;
  /** Laeuft ueberhaupt eine Phase mit Volumensteuerung? */
  hasPhase: boolean;
  /** Freies Training ohne aktive Journey. */
  freeMode: boolean;
  /** Lastanteil der laufenden Woche; null ohne Lastvorgabe an der Phase. */
  loadFactor: number | null;
  /** Schrittweite eines Gewichtssprungs aus den Einstellungen; null = Standard. */
  weightStep: number | null;
  bars: B[];
  plates: number[];
  dumbbells: number[];
  /** Vordaten des Vorschlags: im Training das heute Abgehakte, sonst die
   *  zuletzt gespeicherte Einheit dieser Uebung. */
  lastEntry: SetEntry | null;
  /** Die Einheit davor - Grundlage der Rueckwaertsregel des Coaches. */
  prevEntry: SetEntry | null;
  /** Nur im Training gesetzt (s. RunningEntry). */
  running?: RunningEntry | null;
}

/** Der fertige Coach-Stand einer Uebung. */
export interface CoachStand<B> {
  /** Die Uebung, mit der gerechnet wurde - im Training mit dem heute bewegten
   *  Arbeitsgewicht statt dem Katalogstand (s. RunningEntry). */
  exo: CoachStandExercise;
  /** Plan-Bezug der Uebung; null ausserhalb des Wochenplans. */
  plan: PlanContext | null;
  /** Fuer welchen Zeitraum die Zahlen gelten (Woche bzw. naechste Einheit). */
  scope: CoachScope;
  /** Ziel-Repband, das gerade gilt. */
  repTarget: [number, number] | null;
  /** Vorschlag des Coaches - ohne den Phasenwechsel-Einstieg. Der Ausblick
   *  rechnet auf ihm weiter, nicht auf dem Einstieg. */
  suggestion: CoachSuggestion;
  /** Gewaehlte Stange; null ohne Langhantel. */
  bar: B | null;
  /** Gewicht nach dem Phasenwechsel-Einstieg (ohne Einstieg: das des Vorschlags). */
  weight: number;
  /** Ziel-Wdh. nach dem Phasenwechsel-Einstieg. */
  targetReps: number;
  /** true = der Einstieg hat gegriffen (Kartenhinweis in der Einheit). */
  phaseEntry: boolean;
  /** Gibt es ueberhaupt Vordaten? Ohne sie steht der Coach auf "Start". */
  hadPriorData: boolean;
  /** Die gewertete Einheit der laufenden Woche: im Training die laufende,
   *  sonst die letzte gespeicherte dieser Woche. Grundlage des Ausblicks. */
  judged: SetEntry | null;
}

/** Der Coach-Stand einer Uebung. null nur im Training, solange die
 *  Doppelprogression nichts zu bewerten hat (kein abgehakter Arbeitssatz) -
 *  dort bleibt die Karte ohne Coach-Zeichen. */
export function coachStandFor<B extends { weight: number }>(
  input: CoachStandInput<B>,
): CoachStand<B> | null {
  const plan = planContextFor(input.planSource, {
    id: input.exo.id,
    referenceWeight: input.exo.referenceWeight,
    referencePhaseId: input.exo.referencePhaseId,
    planStartWeight: input.exo.planStartWeight ?? null,
    rm: input.exo.rm,
  });
  const scope = coachScopeFor(input.exo, plan);

  // Womit gerechnet wird: im Training haengt das Arbeitsgewicht am
  // Geltungsbereich (s. RunningEntry), sonst ist es der Katalogstand.
  let exo = input.exo;
  if (input.running) {
    const workWeight = previewWorkWeight(
      scope,
      input.exo.workWeight,
      input.running.workedWeight,
    );
    if (workWeight == null) return null;
    exo = { ...input.exo, workWeight };
  }

  const repTarget = activeRepTarget(exo, input.phaseRepTarget, input.hasPhase, plan);
  const { suggestion, bar } = suggestWithBar(exo, {
    phaseFocus: input.phaseFocus,
    lastEntry: input.lastEntry,
    prevEntry: input.prevEntry,
    weightStep: input.weightStep,
    bars: input.bars,
    plates: input.plates,
    dumbbells: input.dumbbells,
    repTarget,
    freeMode: input.freeMode,
    loadFactor: input.loadFactor,
    plan,
  });

  // Phasenwechsel-Einstieg (Regel s. phaseEntryOverride); im Training ruht er.
  const entry = input.running
    ? { weight: suggestion.weight, targetReps: suggestion.targetReps, phaseEntry: false }
    : phaseEntryOverride({
        exo,
        rm: exo.rm,
        repTarget,
        bar: bar ? { weight: bar.weight } : null,
        lastEntry: input.lastEntry,
        plates: input.plates,
        loadFactor: input.loadFactor,
        suggestion,
      });

  return {
    exo,
    plan,
    scope,
    repTarget,
    suggestion,
    bar,
    weight: entry.weight,
    targetReps: entry.targetReps,
    phaseEntry: entry.phaseEntry,
    // Vordaten sind da, sobald eine der beiden Einheiten Arbeitssaetze traegt.
    // Im Training ist die "letzte" das heute Abgehakte und die "davor" die
    // zuletzt gespeicherte - dieselbe Lesart wie auf der Uebungsseite, damit
    // dort und hier dasselbe Zeichen steht.
    hadPriorData:
      workSets(input.lastEntry).length > 0 || workSets(input.prevEntry).length > 0,
    // Gewertet wird im Training die laufende Einheit, sonst die letzte
    // gespeicherte der laufenden Journey-Woche.
    judged: input.running ? input.lastEntry : (plan?.currentWeekEntry ?? null),
  };
}

export interface CoachViewInput<B extends { weight: number }>
  extends CoachStandInput<B> {
  /** Einheit aus den Einstellungen ("kg"/"lb") - nur fuer die Saetze mit
   *  Gewichtsdifferenz. */
  unit: string;
}

/** Der Coach-Stand in der Anzeigeform, die Trainingskarte und Uebungsseite
 *  beide lesen (CoachView): Zahlen, Geltungsbereich, Ausblick. null unter
 *  derselben Bedingung wie coachStandFor. */
export function coachViewFor<B extends { weight: number }>(
  input: CoachViewInput<B>,
): CoachView | null {
  const stand = coachStandFor(input);
  if (!stand) return null;
  const { plan, bar, judged, suggestion } = stand;
  return {
    // Die Coach-Entscheidung (steigern/halten/senken) bleibt die des
    // Vorschlags - der Phasenwechsel-Einstieg setzt nur die Last.
    status: coachStatusFromSuggestion(
      { ...suggestion, weight: stand.weight, targetReps: stand.targetReps },
      stand.hadPriorData,
      input.unit,
    ),
    scope: stand.scope,
    // Ausblick: was aus dieser Woche wird, wenn die gewertete Einheit die
    // letzte dieser Uebung in der Woche bleibt. Ohne gewertete Einheit gibt es
    // nichts zu bewerten - dann bleibt es bei der Wochenvorgabe allein.
    outlook: judged
      ? planOutlook(
          stand.exo,
          {
            phase: input.phaseFocus,
            lastEntry: judged,
            weightStep: input.weightStep,
            bar: bar ? { weight: bar.weight } : undefined,
            plates: input.plates,
            dumbbells: input.dumbbells,
            plan,
          },
          {
            // Vorgabe der Woche, nicht der Phasenwechsel-Einstieg: der
            // Ausblick rechnet auf dem Wochenplan weiter.
            weekWeight: suggestion.weight,
            workedWeight: entryWorkWeight(judged),
            judged,
          },
        )
      : null,
  };
}
