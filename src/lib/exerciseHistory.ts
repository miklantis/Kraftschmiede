// Reine Aufbereitung des Trainingsverlaufs EINER Katalog-Uebung (kein DB-/DOM-
// Bezug, testbar). 1:1 aus V1 (app.js: exerciseHistory, exBestSet, exSixWeekPct),
// umgestellt auf das normalisierte Schema. Beruecksichtigt die Katalog-Uebungen
// (session_exercises mit passender exercise_id); Skill-Einheiten ohne Katalog-
// bezug (exercise_id null) sind hier bewusst nicht dabei – ihre Anbindung ueber
// die Skill-Definition kommt als eigener Schritt.

import type { HistorySessionInput } from "./history";
import { best1RMFromSets } from "@/engine/oneRM";
import type { EngineSet, RmFormula } from "@/engine/types";

export interface ExHistorySet {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
  score: number | null;
}

export interface ExHistoryEntry {
  date: string;
  topW: number; // hoechstes Arbeitssatz-Gewicht
  reps: number; // Summe der Arbeitssatz-Wiederholungen
  vol: number; // Summe reps*weight
  sec: number; // beste Haltezeit (Sek.), 0 wenn keine Dauer
  score: number | null; // Mittel der Arbeitssatz-Scores
  est1RM: number | null; // je Einheit aus den Arbeitssaetzen geschaetztes 1RM
  dev: boolean; // Abweichung (mind. ein angepasster Satz)
  sets: ExHistorySet[];
}

function dateMs(d: string): number {
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

// Verlauf der Uebung aus allen absolvierten Einheiten, aelteste zuerst.
// Das 1RM je Einheit wird – wie in V1 zur Anzeigezeit – aus den sauberen
// Arbeitssaetzen geschaetzt (engine.best1RMFromSets mit der eingestellten
// Formel), nicht aus einem gespeicherten Feld. Das gespeicherte tested1RM
// blieb beim V1-Import leer (V1 fuellte es nie), daher diese Berechnung.
export function buildExerciseHistory(
  exerciseId: string,
  sessions: readonly HistorySessionInput[],
  formula: RmFormula = "mean",
): ExHistoryEntry[] {
  const out: ExHistoryEntry[] = [];

  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const work = ex.sets.filter((x) => x.kind !== "warmup");
      if (work.length === 0) continue;

      const topW = Math.max(...work.map((x) => x.weight ?? 0));
      const reps = work.reduce((a, x) => a + (x.reps ?? 0), 0);
      const vol = work.reduce(
        (a, x) => a + (x.reps ?? 0) * (x.weight ?? 0),
        0,
      );
      const sec = Math.max(0, ...work.map((x) => x.durationSec ?? 0));
      const scores = work
        .map((x) => x.score)
        .filter((v): v is number => typeof v === "number");
      const score =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;

      // 1RM aus allen Saetzen der Uebung (best1RMFromSets ueberspringt
      // Aufwaermen, nicht abgehakte und gescheiterte Saetze selbst).
      const engineSets: EngineSet[] = ex.sets.map((x) => ({
        type: x.kind === "warmup" ? "warmup" : "work",
        done: x.done ?? true,
        failed: x.failed ?? false,
        weight: x.weight ?? 0,
        reps: x.reps ?? 0,
      }));
      const est1RM = best1RMFromSets(engineSets, formula).value;

      out.push({
        date: s.date,
        topW,
        reps,
        vol,
        sec,
        score,
        est1RM,
        dev: work.some((x) => x.adjusted),
        sets: work.map((x) => ({
          weight: x.weight,
          reps: x.reps,
          durationSec: x.durationSec,
          score: x.score ?? null,
        })),
      });
    }
  }

  out.sort((a, b) => dateMs(a.date) - dateMs(b.date));
  return out;
}

// Bester einzelner Arbeitssatz ueber den ganzen Verlauf (hoechstes Gewicht,
// dann meiste Wiederholungen) – fuer die Detail-Statistik "bestes Set".
export function exBestSet(
  h: readonly ExHistoryEntry[],
): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const e of h) {
    for (const s of e.sets) {
      if (s.weight == null) continue;
      const reps = s.reps ?? 0;
      if (
        !best ||
        s.weight > best.weight ||
        (s.weight === best.weight && reps > best.reps)
      ) {
        best = { weight: s.weight, reps };
      }
    }
  }
  return best;
}

// 1RM-Veraenderung ueber ~6 Wochen als Prozent-String; null bei zu wenig Daten.
export function exSixWeekPct(h: readonly ExHistoryEntry[]): string | null {
  const s = h.filter((x) => x.est1RM != null);
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  const cutMs = dateMs(last.date) - 42 * 86400000;
  let base = s[0];
  for (const e of s) {
    if (dateMs(e.date) <= cutMs) base = e;
  }
  if (!base.est1RM || !last.est1RM) return null;
  const pct = (last.est1RM / base.est1RM - 1) * 100;
  return (pct >= 0 ? "+" : "") + Math.round(pct) + "%";
}
