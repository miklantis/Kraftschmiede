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
  // Skill-Einheiten (ueber die Skill-Definition zugeordnet): kein Gewicht/1RM/
  // Score. metric + target steuern die Anzeige im Verlauf (Chips + "Ziel X").
  skill?: boolean;
  metric?: "reps" | "duration";
  target?: number | null;
}

function dateMs(d: string): number {
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

// Loest eine Skill-Uebung (per Skill-UUID + Phase + Position in der Phase) auf
// die hinterlegte Katalog-Uebung auf. Liefert null, wenn keine Zuordnung
// besteht. exerciseKey ist der V1-Schluessel der Katalog-Uebung (z. B.
// "dead_hang"); target/metric stammen aus der Skill-Definition.
export type SkillExResolve = (
  skillId: string,
  phase: number,
  position: number,
) => { exerciseKey: string; metric: "reps" | "duration"; target: number | null } | null;

// Verlauf der Uebung aus allen absolvierten Einheiten, aelteste zuerst.
// Das 1RM je Einheit wird – wie in V1 zur Anzeigezeit – aus den sauberen
// Arbeitssaetzen geschaetzt (engine.best1RMFromSets mit der eingestellten
// Formel), nicht aus einem gespeicherten Feld. Das gespeicherte tested1RM
// blieb beim V1-Import leer (V1 fuellte es nie), daher diese Berechnung.
//
// exerciseKey + skillResolve binden zusaetzlich die Skill-Saetze an: Skill-
// Einheiten legen ihre Uebungen ohne Katalogbezug ab (exercise_id null), werden
// aber ueber die Skill-Definition (skillId + Phase + Position -> exerciseKey)
// dieser Katalog-Uebung zugeordnet (1:1 wie V1 exerciseHistory). Ohne beide
// Argumente bleiben Skill-Einheiten aussen vor.
export function buildExerciseHistory(
  exerciseId: string,
  sessions: readonly HistorySessionInput[],
  formula: RmFormula = "mean",
  exerciseKey: string | null = null,
  skillResolve?: SkillExResolve,
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

  // Skill-Einheiten: Leistung liegt in Uebungen ohne Katalogbezug. Ueber die
  // Skill-Definition (skillId + Phase + Position) wird jede Skill-Uebung ihrer
  // Katalog-Uebung (exerciseKey) zugeordnet. Nur abgehakte Saetze zaehlen; kein
  // Gewicht/1RM/Score. Abweichung = mind. ein Satz hat das Ziel verfehlt.
  if (exerciseKey != null && skillResolve) {
    for (const s of sessions) {
      if (s.type !== "skill" || s.skillId == null || s.skillPhase == null) {
        continue;
      }
      for (const ex of s.exercises) {
        const def = skillResolve(s.skillId, s.skillPhase, ex.position);
        if (def == null || def.exerciseKey !== exerciseKey) continue;
        const done = ex.sets.filter((x) => x.done === true);
        if (done.length === 0) continue;
        const isDur = def.metric === "duration";
        const vals = done.map((x) =>
          isDur ? (x.durationSec ?? 0) : (x.reps ?? 0),
        );
        const sumReps = isDur ? 0 : vals.reduce((a, b) => a + b, 0);
        const topSec = isDur ? Math.max(0, ...vals) : 0;
        const anyMiss = done.some((x) => x.met === false);
        out.push({
          date: s.date,
          topW: 0,
          reps: sumReps,
          vol: isDur ? topSec : sumReps,
          sec: topSec,
          score: null,
          est1RM: null,
          dev: anyMiss,
          sets: done.map((x) => ({
            weight: null,
            reps: isDur ? null : (x.reps ?? 0),
            durationSec: isDur ? (x.durationSec ?? 0) : null,
            score: null,
          })),
          skill: true,
          metric: isDur ? "duration" : "reps",
          target: def.target,
        });
      }
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

// ---------------------------------------------------------------------------
// Chart-Metriken (1:1 aus V1 app.js: exMetricOptions, METRIC_LABELS,
// exerciseChartData). Reine Aufbereitung; das Zeichnen liegt in der Komponente.

import { isoWeekKey } from "@/engine/journey";

// Linien-Metriken (eine Kurve je Einheit). "volume" ist gesondert (Balken).
export type ExLineMetric = "rm" | "weight" | "reps" | "duration";
export type ExMetric = ExLineMetric | "volume";

export interface ExMetricOption {
  key: ExMetric;
  label: string; // kurzes Chip-Label
}

// Kartentitel je Metrik (V1 METRIC_LABELS).
export const EX_METRIC_TITLE: Record<ExMetric, string> = {
  rm: "1RM-Verlauf",
  weight: "Arbeitsgewicht (Top-Satz)",
  reps: "Wiederholungen (Summe Arbeitssätze)",
  duration: "Haltezeit (Sek., bester Satz)",
  volume: "Wochenvolumen",
};

// Kurzbezeichnung je Metrik fuer den Pin-Titel "Übung · Metrik" (V1 EX_METRIC_SHORT).
export const EX_METRIC_SHORT: Record<ExMetric, string> = {
  rm: "1RM",
  weight: "Arbeitsgewicht",
  reps: "Wiederholungen",
  duration: "Haltezeit",
  volume: "Volumen",
};

// Waehlbare Metriken je Uebungstyp (V1 exMetricOptions).
export function exMetricOptions(
  profile: string,
  metric: "reps" | "duration" | null,
): ExMetricOption[] {
  if (profile === "bodyweight") {
    if (metric === "duration") return [{ key: "duration", label: "Haltezeit" }];
    return [
      { key: "reps", label: "Wdh" },
      { key: "volume", label: "Volumen" },
    ];
  }
  return [
    { key: "rm", label: "1RM" },
    { key: "weight", label: "Top-Gewicht" },
    { key: "reps", label: "Wdh" },
    { key: "volume", label: "Volumen" },
  ];
}

// Standard-Metrik je Uebungstyp (V1 exDetailParts.metric).
export function exDefaultMetric(
  profile: string,
  metric: "reps" | "duration" | null,
): ExMetric {
  if (profile === "bodyweight") return metric === "duration" ? "duration" : "reps";
  return "rm";
}

export interface ExLinePoint {
  y: number;
  flag: boolean; // Abweichung in dieser Einheit
  /** Punkt stammt aus einem bewussten 1RM-Test, nicht aus einer Einheit. */
  test?: boolean;
}

/** Ein 1RM-Test fuer die Chart-Reihe (aus rm_tests). */
export interface ExRmTestPoint {
  date: string;
  estRm: number;
}

export interface ExBar {
  label: string;
  value: number;
}

// Linienpunkte je Einheit (aelteste zuerst). Beim 1RM nur Einheiten mit Wert.
export function exLineSeries(
  h: readonly ExHistoryEntry[],
  metric: ExLineMetric,
  rmTests: readonly ExRmTestPoint[] = [],
): ExLinePoint[] {
  if (metric === "rm") {
    // Einheiten und Tests bilden eine gemeinsame Kurve, chronologisch gemischt.
    // Bei gleichem Datum steht der Test hinter der Einheit (stabile Sortierung),
    // weil er in aller Regel danach gemacht wird.
    const fromSessions = h
      .filter((x) => x.est1RM != null)
      .map((x) => ({
        date: x.date,
        y: x.est1RM as number,
        flag: x.dev,
        test: false,
      }));
    const fromTests = rmTests.map((t) => ({
      date: t.date,
      y: t.estRm,
      flag: false,
      test: true,
    }));
    return [...fromSessions, ...fromTests]
      .sort((a, b) => dateMs(a.date) - dateMs(b.date))
      .map((p) => ({ y: p.y, flag: p.flag, test: p.test }));
  }
  const pick =
    metric === "weight"
      ? (x: ExHistoryEntry) => x.topW
      : metric === "reps"
        ? (x: ExHistoryEntry) => x.reps
        : (x: ExHistoryEntry) => x.sec || 0;
  return h.map((x) => ({ y: pick(x), flag: x.dev }));
}

// Wochenvolumen als Balken (Summe reps*weight je ISO-Woche, chronologisch).
// Label = letzte drei Zeichen des Wochenschluessels (z. B. "W12"), wie V1.
export function exVolumeSeries(h: readonly ExHistoryEntry[]): ExBar[] {
  const byWeek = new Map<string, number>();
  for (const x of h) {
    const wk = isoWeekKey(x.date);
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + x.vol);
  }
  return [...byWeek.keys()]
    .sort()
    .map((wk) => ({ label: wk.slice(-3), value: byWeek.get(wk) as number }));
}
