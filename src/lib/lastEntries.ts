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

// Die juengsten `count` Krafteintraege je Uebung, neueste zuerst. Neueste
// Einheit zuerst durchgehen und je Uebung sammeln, bis die Zahl erreicht ist.
export function buildRecentEntries(
  detailed: HistorySessionInput[],
  count: number,
): Record<string, SetEntry[]> {
  const map: Record<string, SetEntry[]> = {};
  const desc = detailed.slice().reverse();
  for (const sess of desc) {
    for (const ex of sess.exercises) {
      if (!ex.exerciseId) continue;
      const list = map[ex.exerciseId] ?? (map[ex.exerciseId] = []);
      if (list.length >= count) continue;
      list.push({ sets: ex.sets.map(toEngineSet) });
    }
  }
  return map;
}

// Neueste Einheit zuerst durchgehen, ersten Treffer je Uebung behalten.
export function buildLastEntries(
  detailed: HistorySessionInput[],
): Record<string, SetEntry> {
  const map: Record<string, SetEntry> = {};
  for (const [id, list] of Object.entries(buildRecentEntries(detailed, 1))) {
    const first = list[0];
    if (first) map[id] = first;
  }
  return map;
}

// Vorletzter Krafteintrag je Uebung – die Einheit VOR der letzten. Grundlage
// der Rueckwaertsregel des Coaches (#175): zweimal in Folge am selben Gewicht
// das Ziel verfehlt. Uebungen mit nur einer Einheit fehlen im Ergebnis.
export function buildPrevEntries(
  detailed: HistorySessionInput[],
): Record<string, SetEntry> {
  const map: Record<string, SetEntry> = {};
  for (const [id, list] of Object.entries(buildRecentEntries(detailed, 2))) {
    const second = list[1];
    if (second) map[id] = second;
  }
  return map;
}

// Letzter Krafteintrag je Uebung in einer bestimmten Journey-Woche derselben
// Phase. Grundlage der Wochen-Regel des Wochenplans (#225, Schritt 3):
// gewertet wird die letzte Einheit der Uebung in der Vorwoche, und innerhalb
// einer Woche liegt auf einer Uebung immer dieselbe Vorgabe. Die Phase grenzt
// mit ab, damit eine Einheit aus der Vorgaengerphase die neue Rampe nicht
// anschiebt.
export function buildWeekEntries(
  detailed: HistorySessionInput[],
  weekOf: (date: string) => number,
  week: number,
  phaseId: string | null,
): Record<string, SetEntry> {
  const map: Record<string, SetEntry> = {};
  if (phaseId == null) return map;
  const desc = detailed.slice().reverse();
  for (const sess of desc) {
    if ((sess.phaseId ?? null) !== phaseId) continue;
    if (weekOf(sess.date) !== week) continue;
    for (const ex of sess.exercises) {
      if (!ex.exerciseId || map[ex.exerciseId]) continue;
      map[ex.exerciseId] = { sets: ex.sets.map(toEngineSet) };
    }
  }
  return map;
}
