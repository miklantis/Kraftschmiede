// Sitzungsaufbau (Phase 11, Lieferung 2). Reine Funktion ohne DB-/DOM-Bezug:
// nimmt Vorlage, Uebungen, Phase und Inventar als Daten herein und gibt die
// fertigen Live-Eintraege heraus (1:1 aus V1 live.js buildLive). Die einzelnen
// Coach-Entscheidungen (Vorschlag, Aufwaermen, Satzzahl) liegen in lib/coach.ts,
// die Kette dahinter (Plan-Bezug, Repband, Vorschlag, Phasenwechsel-Einstieg) in
// lib/coachStand.ts; hier nur das Zusammensetzen. Die Zustandsbeschaffung
// (letzter Eintrag, Phase, Stangen/Scheiben) macht der Daten-Hook useLiveBuilder.

import type { PhaseMark, SetEntry, VolumePhase } from "@/engine/types";
import {
  warmupFor,
  plannedSets,
  lastWorkSetCount,
  planSetCount,
  planTargetScore,
  type CoachBuildExercise,
} from "./coach";
import { coachStandFor } from "./coachStand";
import { type PlanSource } from "./planContext";
import { fmtNum } from "./format";
import type {
  LiveEntry,
  LiveGeneralWarmupSet,
  LiveSet,
} from "./liveSession";

// Uebung in der Form, die der Aufbau braucht (Coach-Felder + Anzeige).
export interface LiveBuildExercise extends CoachBuildExercise {
  id: string;
  name: string;
  rm: number | null;
  muscleGroups: string[];
}

export interface LiveBuildBar {
  id: string;
  name: string;
  weight: number;
}

export interface LiveBuildInput {
  // Uebungs-Ids der Vorlage in Reihenfolge.
  exerciseIds: string[];
  exercisesById: Record<string, LiveBuildExercise>;
  // Phasen-Fokus (nur focus noetig; steuert z. B. den Wiedereinstieg) und das
  // fertig gerechnete Ziel-Repband der Phase (derivePhaseContext).
  phaseFocus: PhaseMark | null;
  phaseRepTarget: [number, number] | null;
  // Volumensteuerung der aktuellen Phase (Satzrampe/Deload) oder null.
  volumePhase: VolumePhase | null;
  // Woche innerhalb der Phase, 0-basiert.
  weekInPhase: number;
  recoveryGreen: boolean;
  // Freies Training: keine aktive Journey. Der Coach gibt dann nichts vor -
  // Gewicht, Wdh. und Satzzahl kommen unveraendert aus der letzten Einheit.
  freeMode: boolean;
  // Lastanteil der laufenden Woche; null ohne Lastvorgabe an der Phase.
  loadFactor: number | null;
  // Wochenplan-Stand der laufenden Phase; null = die Phase laeuft ueber die
  // Doppelprogression des Coaches wie bisher.
  planSource?: PlanSource | null;
  // Letzter Krafteintrag je Uebung (Saetze) als Vordaten fuer den Vorschlag.
  lastEntryByExercise: Record<string, SetEntry | null>;
  // Der Eintrag davor je Uebung – nur fuer die Rueckwaertsregel des Coaches
  // (zweimal in Folge am selben Gewicht das Ziel verfehlt). Fehlt er, verhaelt
  // sich der Coach wie bisher.
  prevEntryByExercise?: Record<string, SetEntry | null>;
  // Schrittweite eines Gewichtssprungs aus den Einstellungen; null = Standard.
  weightStep?: number | null;
  bars: LiveBuildBar[];
  plates: number[];
  dumbbells: number[];
  unit: string;
}

export interface LiveBuildResult {
  generalWarmup: { sets: LiveGeneralWarmupSet[] };
  entries: LiveEntry[];
}

// Kartenkopf-Tag: getestetes 1RM, sonst die Muskelgruppen.
function tagFor(exo: LiveBuildExercise, unit: string): string {
  if (exo.rm != null) return "1RM " + fmtNum(exo.rm) + " " + unit;
  return (exo.muscleGroups || []).join(" · ");
}

export function buildLiveEntries(input: LiveBuildInput): LiveBuildResult {
  const hasPhase = input.volumePhase != null;
  // Empfohlene Arbeitssatzzahl der Woche (Core ist fix 3, s. u.).
  const setNDefault = plannedSets(
    input.volumePhase,
    input.weekInPhase,
    input.recoveryGreen,
  );

  const entries: LiveEntry[] = [];
  input.exerciseIds.forEach((id, idx) => {
    const exo = input.exercisesById[id];
    if (!exo) return;

    // Die ganze Coach-Kette (Plan-Bezug, geltendes Repband, Vorschlag samt
    // Stange, Phasenwechsel-Einstieg) liegt in lib/coachStand.ts - dieselbe
    // Fassung, die Uebungsseite und Trainings-Vorschau lesen.
    const lastEntry = input.lastEntryByExercise[id] ?? null;
    const stand = coachStandFor({
      exo: { ...exo, id },
      planSource: input.planSource,
      phaseFocus: input.phaseFocus,
      phaseRepTarget: input.phaseRepTarget,
      hasPhase,
      freeMode: input.freeMode,
      loadFactor: input.loadFactor,
      weightStep: input.weightStep ?? null,
      bars: input.bars,
      plates: input.plates,
      dumbbells: input.dumbbells,
      lastEntry,
      prevEntry: input.prevEntryByExercise?.[id] ?? null,
    });
    // Ohne laufende Einheit rechnet die Kette immer - der Zweig kann hier nicht
    // eintreten (s. coachStandFor).
    if (!stand) return;
    const { plan, bar } = stand;
    const wWeight = stand.weight;
    const wReps = stand.targetReps;
    const phaseEntry = stand.phaseEntry;

    // Satzzahl: Core fix 3; im freien Training die Satzzahl der letzten Einheit
    // dieser Uebung (ohne Vordaten der Standard); gibt der Wochenplan sie vor,
    // gilt seine feste Zahl, sonst die Phasen-Rampe.
    let setN = planSetCount(exo, plan, setNDefault);
    if (exo.profile === "core") setN = 3;
    else if (input.freeMode) setN = lastWorkSetCount(lastEntry) ?? setNDefault;
    const warm = warmupFor(
      exo,
      wWeight,
      bar ? { weight: bar.weight } : null,
      idx === 0,
      input.plates,
    ).map((w) => ({ reps: w.reps, weight: w.weight, done: false }));

    // Ziel-Anstrengung: in einer Phase mit Wochenplan die der Planwoche (RIR),
    // sonst der systemweite Standard (Issue #298).
    const targetScore = planTargetScore(exo, plan);
    const sets: LiveSet[] = [];
    for (let k = 0; k < Math.max(1, setN); k++) {
      sets.push({
        reps: wReps,
        weight: wWeight,
        score: targetScore,
        targetScore,
        targetReps: wReps,
        targetWeight: wWeight,
        done: false,
        failed: false,
        adjusted: false,
        adjustNote: "",
      });
    }

    entries.push({
      exerciseId: id,
      exerciseName: exo.name,
      equipment: exo.equipment,
      tag: tagFor(exo, input.unit),
      phaseEntry,
      barId: bar?.id ?? null,
      barName: bar?.name ?? null,
      barWeight: bar?.weight ?? null,
      warmupSets: warm,
      sets,
      note: "",
    });
  });

  return {
    // Ein Cardio-Satz (7 min) vorbelegt; Art standardmaessig Vario.
    generalWarmup: { sets: [{ minutes: 7, mode: "vario", done: false }] },
    entries,
  };
}
