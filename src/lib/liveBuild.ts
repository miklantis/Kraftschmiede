// Sitzungsaufbau (Phase 11, Lieferung 2). Reine Funktion ohne DB-/DOM-Bezug:
// nimmt Vorlage, Uebungen, Phase und Inventar als Daten herein und gibt die
// fertigen Live-Eintraege heraus (1:1 aus V1 live.js buildLive). Die einzelnen
// Coach-Entscheidungen (Vorschlag, Aufwaermen, Satzzahl) liegen in lib/coach.ts;
// hier nur das Zusammensetzen. Die Zustandsbeschaffung (letzter Eintrag, Phase,
// Stangen/Scheiben) macht der Daten-Hook useLiveBuilder.

import { repTargetForFocus } from "@/engine";
import type { SetEntry, VolumePhase } from "@/engine/types";
import {
  suggestForExercise,
  warmupFor,
  plannedSets,
  pickBarForTarget,
  type CoachBuildExercise,
  type CoachSuggestion,
} from "./coach";
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
  // Phasen-Fokus (nur focus noetig) und das explizite Ziel-Repband der Phase.
  phaseFocus: { focus?: string } | null;
  phaseRepTarget: [number, number] | null;
  // Volumensteuerung der aktuellen Phase (Satzrampe/Deload) oder null.
  volumePhase: VolumePhase | null;
  // Woche innerhalb der Phase, 0-basiert.
  weekInPhase: number;
  recoveryGreen: boolean;
  // Letzter Krafteintrag je Uebung (Saetze) als Vordaten fuer den Vorschlag.
  lastEntryByExercise: Record<string, SetEntry | null>;
  bars: LiveBuildBar[];
  plates: number[];
  unit: string;
}

export interface LiveBuildResult {
  generalWarmup: { sets: LiveGeneralWarmupSet[] };
  entries: LiveEntry[];
}

// Ziel-Repband, das gerade gilt: hat die Phase ein Ziel (oder einen Fokus mit
// Band), ueberstimmt es das Uebungs-Repband - aber nur fuer Kraftuebungen.
function activeRepTarget(
  exo: LiveBuildExercise,
  phaseFocus: { focus?: string } | null,
  phaseRepTarget: [number, number] | null,
  hasPhase: boolean,
): [number, number] | null {
  if (!hasPhase || exo.profile !== "strength") return null;
  return phaseRepTarget ?? repTargetForFocus(phaseFocus?.focus ?? "") ?? null;
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

    // Stange + Vorschlag. Henne-Ei: Die Senk-/Halte-/Steiger-Entscheidung haengt
    // nur am Arbeitsgewicht und am letzten Eintrag, nicht an der Stange (die wirkt
    // erst beim Ladbar-Machen). Darum bei Langhantel in drei Schritten: (1) rohes
    // Zielgewicht mit der LEICHTESTEN Stange bestimmen, damit die schwerste Stange
    // den Boden nicht hochzieht; (2) die passende Stange dazu waehlen - die
    // schwerste, die noch <= Ziel ist, sonst die leichteste; (3) mit dieser Stange
    // endgueltig rechnen (Gewicht ladbar + Aufwaermrampe). So klebt eine leichte
    // Uebung nicht mehr am Gewicht der schwersten Stange.
    const repTarget = activeRepTarget(
      exo,
      input.phaseFocus,
      input.phaseRepTarget,
      hasPhase,
    );
    const lastEntry = input.lastEntryByExercise[id] ?? null;

    let bar: LiveBuildBar | null = null;
    let sug: CoachSuggestion;
    if (exo.category === "barbell" && input.bars.length > 0) {
      const lightest = input.bars.reduce(
        (a, b) => (b.weight < a.weight ? b : a),
        input.bars[0]!,
      );
      const rawSug = suggestForExercise(exo, {
        phase: input.phaseFocus,
        lastEntry,
        bar: { weight: lightest.weight },
        plates: input.plates,
        repTarget,
      });
      bar = pickBarForTarget(rawSug.weight, input.bars);
      sug = suggestForExercise(exo, {
        phase: input.phaseFocus,
        lastEntry,
        bar: { weight: bar.weight },
        plates: input.plates,
        repTarget,
      });
    } else {
      // Keine Langhantel (oder kein Stangen-Inventar): wie bisher ohne Stange.
      sug = suggestForExercise(exo, {
        phase: input.phaseFocus,
        lastEntry,
        bar: undefined,
        plates: input.plates,
        repTarget,
      });
    }

    const setN = exo.profile === "core" ? 3 : setNDefault;
    const warm = warmupFor(
      exo,
      sug.weight,
      bar ? { weight: bar.weight } : null,
      idx === 0,
      input.plates,
    ).map((w) => ({ reps: w.reps, weight: w.weight, done: false }));

    const sets: LiveSet[] = [];
    for (let k = 0; k < Math.max(1, setN); k++) {
      sets.push({
        reps: sug.targetReps,
        weight: sug.weight,
        score: exo.targetScore,
        targetReps: sug.targetReps,
        targetWeight: sug.weight,
        done: false,
        failed: false,
        adjusted: false,
        adjustNote: "",
      });
    }

    entries.push({
      exerciseId: id,
      exerciseName: exo.name,
      category: exo.category,
      tag: tagFor(exo, input.unit),
      barId: bar?.id ?? null,
      barName: bar?.name ?? null,
      barWeight: bar?.weight ?? null,
      warmupSets: warm,
      sets,
    });
  });

  return {
    // Wie V1 buildLive: ein Cardio-Satz (7 min Rad) vorbelegt.
    generalWarmup: { sets: [{ minutes: 7, mode: "bike", done: false }] },
    entries,
  };
}
