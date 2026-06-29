// Letzter Krafteintrag je Uebung als Vordaten fuer den Coach-Vorschlag. Reine
// Aufbereitung ohne DB-/DOM-Bezug, aus useLiveBuilder herausgezogen, damit der
// Live-Aufbau und die Uebungs-Statusanzeige dieselbe Quelle nutzen (1:1 wie V1
// lastEntryForExercise).

import type { SetEntry, EngineSet } from "@/engine/types";
import type { HistorySessionInput, HistorySet } from "./history";

// Ein HistorySet in die Engine-Satzform bringen (fuer den Vorschlag).
export function toEngineSet(s: HistorySet): EngineSet {
  return {
    type: s.kind === "warmup" ? "warmup" : "work",
    weight: s.weight ?? 0,
    reps: s.reps ?? 0,
    score: s.score ?? undefined,
    failed: s.failed ?? false,
    done: s.done ?? false,
    targetReps: s.targetReps ?? null,
    targetWeight: s.targetWeight ?? null,
    adjusted: s.adjusted,
  };
}

// Neueste Einheit zuerst durchgehen, ersten Treffer je Uebung behalten.
export function buildLastEntries(
  detailed: HistorySessionInput[],
): Record<string, SetEntry> {
  const map: Record<string, SetEntry> = {};
  const desc = detailed.slice().reverse();
  for (const sess of desc) {
    for (const ex of sess.exercises) {
      if (!ex.exerciseId || map[ex.exerciseId]) continue;
      map[ex.exerciseId] = { sets: ex.sets.map(toEngineSet) };
    }
  }
  return map;
}
