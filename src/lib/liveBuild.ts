// Sitzungsaufbau (Phase 11, Lieferung 2). Reine Funktion ohne DB-/DOM-Bezug:
// nimmt Vorlage, Uebungen, Phase und Inventar als Daten herein und gibt die
// fertigen Live-Eintraege heraus (1:1 aus V1 live.js buildLive). Die einzelnen
// Coach-Entscheidungen (Vorschlag, Aufwaermen, Satzzahl) liegen in lib/coach.ts;
// hier nur das Zusammensetzen. Die Zustandsbeschaffung (letzter Eintrag, Phase,
// Stangen/Scheiben) macht der Daten-Hook useLiveBuilder.

import { repTargetForFocus, workWeightForPhase } from "@/engine";
import type { SetEntry, VolumePhase } from "@/engine/types";
import {
  suggestWithBar,
  warmupFor,
  plannedSets,
  lastWorkSetCount,
  rampLoad,
  type CoachBuildExercise,
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
  // Freies Training: keine aktive Journey. Der Coach gibt dann nichts vor -
  // Gewicht, Wdh. und Satzzahl kommen unveraendert aus der letzten Einheit.
  freeMode: boolean;
  // Lastfaktor der aktiven Phase; null ausserhalb einer Lastfaktor-Journey.
  loadFactor: number | null;
  // Letzter Krafteintrag je Uebung (Saetze) als Vordaten fuer den Vorschlag.
  lastEntryByExercise: Record<string, SetEntry | null>;
  bars: LiveBuildBar[];
  plates: number[];
  dumbbells: number[];
  unit: string;
}

export interface LiveBuildResult {
  generalWarmup: { sets: LiveGeneralWarmupSet[] };
  entries: LiveEntry[];
}

// Ziel-Repband, das gerade gilt: hat die Phase ein Ziel (oder einen Fokus mit
// Band), ueberstimmt es das Uebungs-Repband - aber nur fuer Kraftuebungen.
// Exportiert, damit die Uebungs-Statusanzeige dieselbe Regel nutzt.
export function activeRepTarget(
  exo: { profile: "strength" | "core" | "bodyweight" },
  phaseFocus: { focus?: string } | null,
  phaseRepTarget: [number, number] | null,
  hasPhase: boolean,
): [number, number] | null {
  if (!hasPhase || exo.profile !== "strength") return null;
  return phaseRepTarget ?? repTargetForFocus(phaseFocus?.focus ?? "") ?? null;
}

// Repband, in dem die letzte Einheit gerechnet wurde: Spanne der Ziel-Wdh der
// Arbeitssaetze (Aufwaermen ausgenommen); faellt auf die tatsaechlichen Wdh
// zurueck, wenn keine Ziel-Wdh gespeichert sind. null ohne verwertbaren Satz.
function lastBand(lastEntry: SetEntry | null): [number, number] | null {
  const ws = (lastEntry?.sets ?? []).filter((s) => s.type !== "warmup");
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
  const ws = (lastEntry?.sets ?? []).filter((s) => s.type !== "warmup");
  let top: number | null = null;
  for (const st of ws) {
    const w = typeof st.weight === "number" ? st.weight : null;
    if (w != null && (top == null || w > top)) top = w;
  }
  return top;
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

    const { suggestion: sug, bar } = suggestWithBar(exo, {
      phaseFocus: input.phaseFocus,
      lastEntry,
      bars: input.bars,
      plates: input.plates,
      dumbbells: input.dumbbells,
      repTarget,
      freeMode: input.freeMode,
      loadFactor: input.loadFactor,
    });

    // Phasenwechsel-Einstieg: springt die Zielzone der neuen Phase deutlich (echt
    // getrennt) vom Repband der letzten Einheit weg und liegt ein sauberes 1RM
    // vor, zieht die erste Einheit ihr Startgewicht einmalig aus dem 1RM statt aus
    // der Doppelprogression. Nur Langhantel (Scheiben-Rechnung). Verletzungs-
    // bewusst gedeckelt und abgerundet (workWeightForPhase). Selbstbegrenzt: ab
    // der zweiten Einheit liegt das letzte Band in der neuen Zone -> kein Sprung.
    // Gibt die Journey die Last selbst vor (Lastfaktor-Rampe), steuert sie den
    // Phasenwechsel bereits im Vorschlag - der 1RM-Umweg wuerde dagegenhalten.
    const ramp = rampLoad(exo, input.loadFactor);
    let wWeight = sug.weight;
    let wReps = sug.targetReps;
    let phaseEntry = false;
    if (
      !ramp &&
      exo.profile === "strength" &&
      repTarget &&
      bar &&
      exo.rm != null &&
      exo.rm > 0
    ) {
      const prev = lastBand(lastEntry);
      if (prev && bandsSeparated(prev, repTarget)) {
        const carried = topWorkWeight(lastEntry) ?? sug.weight;
        const res = workWeightForPhase(exo.rm, repTarget, {
          bar: { weight: bar.weight },
          plates: input.plates,
          currentWeight: carried,
        });
        if (res.decision !== "hold") {
          wWeight = res.weight;
          wReps = repTarget[1]; // konservativ am leichteren (oberen) Bandende einsteigen
          phaseEntry = true;
        }
      }
    }

    // Satzzahl: Core fix 3; im freien Training die Satzzahl der letzten Einheit
    // dieser Uebung (ohne Vordaten der Standard), sonst die Phasen-Rampe.
    let setN = setNDefault;
    if (exo.profile === "core") setN = 3;
    else if (input.freeMode) setN = lastWorkSetCount(lastEntry) ?? setNDefault;
    const warm = warmupFor(
      exo,
      wWeight,
      bar ? { weight: bar.weight } : null,
      idx === 0,
      input.plates,
    ).map((w) => ({ reps: w.reps, weight: w.weight, done: false }));

    const sets: LiveSet[] = [];
    for (let k = 0; k < Math.max(1, setN); k++) {
      sets.push({
        reps: wReps,
        weight: wWeight,
        score: exo.targetScore,
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
    });
  });

  return {
    // Ein Cardio-Satz (7 min) vorbelegt; Art standardmaessig Vario.
    generalWarmup: { sets: [{ minutes: 7, mode: "vario", done: false }] },
    entries,
  };
}
