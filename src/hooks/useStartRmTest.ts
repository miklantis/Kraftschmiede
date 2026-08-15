import { useCallback } from "react";
import { useLiveSession } from "./useLiveSession";
import { useBars, usePlates, useDumbbells } from "./useInventory";
import { useSettings } from "./useSettings";
import { buildTestSets, testWeight } from "@/lib/rmTest";
import { fmtWeight } from "@/lib/format";
import type { LiveEntry, LiveSet } from "@/lib/liveSession";
import type { ExerciseRow } from "@/schemas";

// Startet den 1RM-Test als laufende Einheit in derselben Live-Schicht wie ein
// Workout (Panel, Uhr, Mini-Streifen, Ende-Dialog). Der Hook baut nur den
// Startzustand: allgemeines Aufwaermen (ein Cardio-Satz, Art und Dauer frei)
// und die eine getestete Uebung mit zwei Startsaetzen (5 und 3 Wiederholungen)
// bei rund 90 % des aktuellen Rekords.
//
// Bewusst KEINE Aufwaermsaetze an der Uebung selbst - im Test zaehlen nur die
// Testsaetze; aufgewaermt wird ueber den Cardio-Block davor.

function toLiveSet(reps: number, weight: number): LiveSet {
  return {
    reps,
    weight,
    score: 3,
    targetReps: reps,
    targetWeight: weight,
    done: false,
    failed: false,
    adjusted: false,
    adjustNote: "",
  };
}

export function useStartRmTest(): {
  start: (exercise: ExerciseRow) => void;
  /** Laeuft bereits eine Einheit? Dann ist der Start gesperrt. */
  blocked: boolean;
} {
  const live = useLiveSession();
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();
  const settingsQ = useSettings();
  const startRmTest = live.startRmTest;
  const blocked = live.session != null;

  const bars = barsQ.data;
  const plateRows = platesQ.data;
  const dumbbellRows = dumbbellsQ.data;
  const step = settingsQ.data?.weight_step ?? 2.5;
  const unit = settingsQ.data?.unit ?? "kg";

  const start = useCallback(
    (exercise: ExerciseRow): void => {
      const bar = (bars ?? []).find((b) => b.id === exercise.bar_id) ?? null;
      const weight = testWeight(exercise.rm, {
        equipment: exercise.equipment,
        barWeight: bar?.weight ?? null,
        plates: (plateRows ?? []).map((p) => p.weight),
        dumbbells: (dumbbellRows ?? []).map((d) => d.weight),
        step,
      });
      const entry: LiveEntry = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        equipment: exercise.equipment,
        tag:
          exercise.rm != null
            ? "1RM " + fmtWeight(exercise.rm, unit)
            : "noch kein 1RM",
        barId: bar?.id ?? null,
        barName: bar?.name ?? null,
        barWeight: bar?.weight ?? null,
        warmupSets: [],
        sets: buildTestSets(weight).map((s) => toLiveSet(s.reps, s.weight)),
        note: "",
      };
      startRmTest({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        previousRm: exercise.rm,
        entry,
        generalWarmup: { sets: [{ minutes: 5, mode: "vario", done: false }] },
      });
    },
    [bars, plateRows, dumbbellRows, step, unit, startRmTest],
  );

  return { start, blocked };
}
