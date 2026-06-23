import { useExercises } from "./useExercises";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useSettings } from "./useSettings";
import {
  buildExerciseHistory,
  exBestSet,
  exSixWeekPct,
  type ExHistoryEntry,
} from "@/lib/exerciseHistory";
import { fmtNum, fmtWeight } from "@/lib/format";
import type { ExerciseRow } from "@/schemas";
import type { StatCell } from "@/components/ui/stat-row";

export interface VerlaufRow {
  date: string;
  line: string; // bester Satz dieser Einheit, z. B. "80 kg × 5"
  right: string; // 1RM bzw. Ø-Score dieser Einheit
}

export interface ExerciseDetailView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  exercise: ExerciseRow | null;
  isBodyweight: boolean;
  stats: StatCell[];
  verlauf: VerlaufRow[];
}

// Beste-Satz-Zeile einer Einheit: hoechstes Gewicht, dann meiste Wiederholungen.
function bestSetLine(e: ExHistoryEntry, unit: string): string {
  let bs: { weight: number; reps: number } | null = null;
  for (const s of e.sets) {
    if (s.weight == null) continue;
    const reps = s.reps ?? 0;
    if (!bs || s.weight > bs.weight || (s.weight === bs.weight && reps > bs.reps)) {
      bs = { weight: s.weight, reps };
    }
  }
  if (!bs) return "";
  return fmtNum(bs.weight) + " " + unit + " × " + bs.reps;
}

export function useExerciseDetail(exerciseId: string): ExerciseDetailView {
  const exercisesQ = useExercises();
  const sessionsQ = useSessionsDetailed();
  const settingsQ = useSettings();

  const isLoading =
    exercisesQ.isLoading || sessionsQ.isLoading || settingsQ.isLoading;
  const isError = exercisesQ.isError || sessionsQ.isError || settingsQ.isError;
  const error = exercisesQ.error ?? sessionsQ.error ?? settingsQ.error;

  const unit = settingsQ.data?.unit ?? "kg";
  const rmFormula = settingsQ.data?.rm_formula ?? "mean";
  const exercise =
    exercisesQ.data?.find((e) => e.id === exerciseId) ?? null;

  const history =
    exercise && sessionsQ.data
      ? buildExerciseHistory(exercise.id, sessionsQ.data, rmFormula)
      : [];

  const isBodyweight = exercise?.profile === "bodyweight";

  let stats: StatCell[] = [];
  if (exercise) {
    if (isBodyweight) {
      const u = exercise.metric === "duration" ? "Sek." : "Wdh";
      const min = exercise.rep_range_min ?? 0;
      const max = exercise.rep_range_max ?? 0;
      stats = [
        { value: `${min}–${max} ${u}`, label: "Ziel" },
        {
          value: exercise.metric === "duration" ? "Dauer" : "Wiederholungen",
          label: "Metrik",
        },
        { value: String(history.length), label: "Sessions" },
      ];
    } else {
      const best = exBestSet(history);
      const pct = exSixWeekPct(history);
      stats = [
        {
          value: exercise.rm != null ? fmtWeight(exercise.rm, unit) : "–",
          label: "geschätztes 1RM",
        },
        {
          value: best ? `${fmtNum(best.weight)}×${best.reps}` : "–",
          label: "bestes Set",
        },
        { value: pct ?? "–", label: "6 Wochen", accent: pct != null },
      ];
    }
  }

  // Verlauf neueste zuerst (history ist aelteste zuerst).
  const verlauf: VerlaufRow[] = history
    .slice()
    .reverse()
    .map((e) => ({
      date: e.date,
      line: bestSetLine(e, unit),
      right:
        e.est1RM != null
          ? fmtWeight(e.est1RM, unit)
          : e.score != null
            ? "Ø " + (Math.round(e.score * 10) / 10).toString()
            : "",
    }));

  return {
    isLoading,
    isError,
    error,
    exercise,
    isBodyweight,
    stats,
    verlauf,
  };
}
