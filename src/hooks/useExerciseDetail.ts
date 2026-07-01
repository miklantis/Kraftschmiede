import { useExercises } from "./useExercises";
import { useExerciseMuscles } from "./useExerciseMuscles";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useSettings } from "./useSettings";
import { useSkills } from "./useSkills";
import { useCoachStatuses } from "./useCoachStatuses";
import { skillSeeds } from "@/seed/definitions";
import { muscleValuesFromRows } from "@/lib/muscles";
import type { CoachStatus } from "@/lib/coach";
import {
  buildExerciseHistory,
  exBestSet,
  exSixWeekPct,
  exMetricOptions,
  exDefaultMetric,
  type ExHistoryEntry,
  type ExMetric,
  type ExMetricOption,
  type SkillExResolve,
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
  // Chart-Daten (Schritt 3): Verlaufseintraege + Metrik-Umschalter.
  chartHistory: ExHistoryEntry[];
  metricOptions: ExMetricOption[];
  defaultMetric: ExMetric;
  unit: string;
  // Region->Intensitaet (0..1) fuer die MuscleMap; leer = nur graue Silhouette.
  muscleValues: Record<string, number>;
  // Coach-Lesart fuer die naechste Einheit dieser Uebung (null = noch nicht
  // berechnet oder keine Uebung).
  coach: CoachStatus | null;
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

// Skill-Einheit im Verlauf (wie V1): geleistete Saetze als Werte verbunden,
// Einheit "Wdh" bzw. "s". Rechts steht das Ziel der Skill-Uebung.
function skillUnit(e: ExHistoryEntry): string {
  return e.metric === "duration" ? "s" : "Wdh";
}
function skillLine(e: ExHistoryEntry): string {
  const u = skillUnit(e);
  const vals = e.sets.map((s) =>
    e.metric === "duration" ? (s.durationSec ?? 0) : (s.reps ?? 0),
  );
  return vals.map((v) => v + " " + u).join(" · ");
}
function skillTargetLabel(e: ExHistoryEntry): string {
  if (e.target == null) return "";
  return "Ziel " + e.target + " " + skillUnit(e);
}

export function useExerciseDetail(exerciseId: string): ExerciseDetailView {
  const exercisesQ = useExercises();
  const musclesQ = useExerciseMuscles();
  const sessionsQ = useSessionsDetailed();
  const settingsQ = useSettings();
  const skillsQ = useSkills();
  const coachStatuses = useCoachStatuses();

  const isLoading =
    exercisesQ.isLoading ||
    musclesQ.isLoading ||
    sessionsQ.isLoading ||
    settingsQ.isLoading ||
    skillsQ.isLoading;
  const isError =
    exercisesQ.isError ||
    musclesQ.isError ||
    sessionsQ.isError ||
    settingsQ.isError ||
    skillsQ.isError;
  const error =
    exercisesQ.error ??
    musclesQ.error ??
    sessionsQ.error ??
    settingsQ.error ??
    skillsQ.error;

  const unit = settingsQ.data?.unit ?? "kg";
  const rmFormula = settingsQ.data?.rm_formula ?? "mean";
  const exercise =
    exercisesQ.data?.find((e) => e.id === exerciseId) ?? null;

  // Skill-Zuordnung: skillId (DB-UUID) -> Definitions-Schluessel (useSkills),
  // Schluessel -> Skill-Definition (Code-Seed), darin Phase + Position ->
  // exerciseKey/target/metric. So findet der Verlauf der Katalog-Uebung auch
  // die Skill-Saetze (1:1 wie V1 exerciseHistory).
  const skillResolve: SkillExResolve = (skillId, phase, position) => {
    const def = skillsQ.data?.find((d) => d.id === skillId);
    if (!def || def.key == null) return null;
    const seed = skillSeeds.find((s) => s.key === def.key);
    const ex = seed?.phases[phase]?.exercises[position];
    if (!ex || ex.exerciseKey == null) return null;
    return {
      exerciseKey: ex.exerciseKey,
      metric: ex.metric === "duration" ? "duration" : "reps",
      target: ex.target,
    };
  };

  const history =
    exercise && sessionsQ.data && skillsQ.data
      ? buildExerciseHistory(
          exercise.id,
          sessionsQ.data,
          rmFormula,
          exercise.key,
          skillResolve,
        )
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
          label: "1RM",
        },
        {
          value: best ? `${fmtNum(best.weight)}×${best.reps}` : "–",
          label: "bestes Set",
        },
        { value: pct ?? "–", label: "in 6 Wo.", accent: pct != null },
      ];
    }
  }

  // Verlauf neueste zuerst (history ist aelteste zuerst). Skill-Einheiten zeigen
  // die geleisteten Werte als Zeile und das Ziel rechts (kein Gewicht/1RM/Score).
  const verlauf: VerlaufRow[] = history
    .slice()
    .reverse()
    .map((e) =>
      e.skill
        ? {
            date: e.date,
            line: skillLine(e),
            right: skillTargetLabel(e),
          }
        : {
            date: e.date,
            line: bestSetLine(e, unit),
            right:
              e.est1RM != null
                ? fmtWeight(e.est1RM, unit)
                : e.score != null
                  ? "Ø " + (Math.round(e.score * 10) / 10).toString()
                  : "",
          },
    );

  const metricOptions = exercise
    ? exMetricOptions(exercise.profile, exercise.metric)
    : [];
  const defaultMetric: ExMetric = exercise
    ? exDefaultMetric(exercise.profile, exercise.metric)
    : "rm";

  // Feine Beteiligung der aktuellen Uebung (region_id -> kategorie) in die
  // Werte-Map fuer die MuscleMap uebersetzen. Leer, wenn nichts hinterlegt ist.
  const muscleValues =
    exercise && musclesQ.data
      ? muscleValuesFromRows(
          musclesQ.data.filter((r) => r.exercise_id === exercise.id),
        )
      : {};

  return {
    isLoading,
    isError,
    error,
    exercise,
    isBodyweight,
    stats,
    verlauf,
    chartHistory: history,
    metricOptions,
    defaultMetric,
    unit,
    muscleValues,
    coach: exercise ? (coachStatuses.byExercise[exercise.id] ?? null) : null,
  };
}
