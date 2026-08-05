// 1RM-Test: die reine Logik hinter dem Test-Block auf der Uebungs-Detailseite.
// Von Supabase und DOM unabhaengig, damit sie fuer sich pruefbar bleibt.
//
// Zwei Aufgaben:
//   - Vorbelegung: aus dem aktuellen Rekord ein realistisches Testgewicht
//     ableiten (Anteil TEST_SHARE, auf eine ladbare Stufe gerundet) und daraus
//     die Startsaetze bauen (5 und 3 Wiederholungen).
//   - Vorschau/Ergebnis: aus den abgehakten Saetzen den besten Satz und das
//     daraus geschaetzte neue 1RM bestimmen - Grundlage fuer die Live-Anzeige
//     „altes → neues 1RM“ und fuer die gespeicherte Test-Zeile.
//
// Der Test darf den Rekord bewusst nach oben UND nach unten setzen; die
// Rekord-Regel des normalen Trainings (nur anheben) gilt hier nicht.

import { oneRM, RECORD_MAX_REPS } from "@/engine/oneRM";
import { nearestLoadable, nearestDumbbell } from "@/engine/plates";
import { round2 } from "@/engine/math";
import type { RmFormula } from "@/engine/types";

/** Anteil des aktuellen Rekords, mit dem der Test vorbelegt wird. Bei ~90 %
 *  sind 3-5 saubere Wiederholungen realistisch; der Nutzer pegelt frei nach. */
export const TEST_SHARE = 0.9;

/** Wiederholungen der beiden Startsaetze (schwerer werdend tastet der Nutzer
 *  selbst; Reihenfolge bewusst 5 dann 3). */
export const TEST_START_REPS = [5, 3];

export interface TestWeightContext {
  /** Uebungsart - entscheidet ueber die Rundung auf eine ladbare Stufe. */
  equipment: string;
  /** Gewicht der Stange (nur Langhantel). */
  barWeight: number | null;
  /** Verfuegbare Scheiben (nur Langhantel). */
  plates: number[];
  /** Verfuegbare Kurzhantel-Stufen (nur Kurzhantel). */
  dumbbells: number[];
  /** Kleinste Schrittweite als Rueckfall, wenn nichts geladen wird. */
  step: number;
}

/** Vorbelegtes Testgewicht aus dem aktuellen Rekord: Anteil TEST_SHARE, auf die
 *  naechste tatsaechlich ladbare Stufe gerundet. Ohne Rekord 0 (der Nutzer
 *  traegt dann selbst ein). */
export function testWeight(
  currentRm: number | null,
  ctx: TestWeightContext,
): number {
  if (currentRm == null || currentRm <= 0) return 0;
  const raw = currentRm * TEST_SHARE;
  if (ctx.equipment === "barbell" && ctx.barWeight != null) {
    return nearestLoadable(raw, ctx.barWeight, ctx.plates);
  }
  if (ctx.equipment === "dumbbell") {
    return nearestDumbbell(raw, ctx.dumbbells);
  }
  const step = ctx.step > 0 ? ctx.step : 0.5;
  return round2(Math.round(raw / step) * step);
}

export interface TestSetDraft {
  reps: number;
  weight: number;
  done: boolean;
}

/** Die beiden Startsaetze eines Tests (gleiches Gewicht, 5 und 3 Wdh). */
export function buildTestSets(weight: number): TestSetDraft[] {
  return TEST_START_REPS.map((reps) => ({ reps, weight, done: false }));
}

export interface TestResult {
  /** Bester abgehakter Satz (nach geschaetztem 1RM). */
  best: TestSetDraft | null;
  /** Geschaetztes 1RM aus dem besten Satz; null, wenn kein Satz zaehlt. */
  estRm: number | null;
}

/** Ergebnis eines Tests aus den abgehakten Saetzen. Es zaehlen nur Saetze mit
 *  Gewicht und hoechstens RECORD_MAX_REPS Wiederholungen - genau der Bereich,
 *  in dem eine 1RM-Schaetzung belastbar ist. */
export function testResult(
  sets: TestSetDraft[],
  formula?: RmFormula,
): TestResult {
  let best: TestSetDraft | null = null;
  let estRm = 0;
  (sets || []).forEach((s) => {
    if (!s.done || !s.weight || !s.reps) return;
    if (s.reps > RECORD_MAX_REPS) return;
    const e = oneRM(s.weight, s.reps, formula);
    if (e > estRm) {
      estRm = e;
      best = s;
    }
  });
  return { best, estRm: estRm ? round2(estRm) : null };
}

/** Begrenzt eine eingegebene Wiederholungszahl auf den Test-Bereich (1 bis
 *  RECORD_MAX_REPS). */
export function clampTestReps(reps: number): number {
  if (!Number.isFinite(reps)) return 1;
  const r = Math.round(reps);
  if (r < 1) return 1;
  if (r > RECORD_MAX_REPS) return RECORD_MAX_REPS;
  return r;
}

const RM_FORMULAS: RmFormula[] = ["brzycki", "epley", "wathan", "mean"];

/** Formel aus den Einstellungen absichern (Rueckfall auf den Mittelwert). */
export function asRmFormula(v: string | null | undefined): RmFormula {
  return RM_FORMULAS.includes(v as RmFormula) ? (v as RmFormula) : "mean";
}
