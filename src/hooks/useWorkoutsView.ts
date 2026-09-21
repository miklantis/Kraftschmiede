import { useTemplates } from "./useTemplates";
import { useExercises } from "./useExercises";
import {
  buildWorkoutList,
  type WorkoutExerciseInfo,
  type WorkoutInput,
  type WorkoutRowModel,
} from "@/lib/workouts";

export interface WorkoutsView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  workouts: WorkoutRowModel[];
}

// Ansichtsmodell der Workouts-Bibliothek: die Workouts (useTemplates) mit
// Kurzform ihrer Uebungen und abgeleiteter Journey-Faehigkeit. Die Uebungsnamen
// und -profile kommen aus dem Katalog (useExercises). Reine Aufbereitung liegt
// in lib/workouts.ts. Ein Archiv gibt es nicht mehr (Issue #491) – eine Liste,
// sonst nichts.
export function useWorkoutsView(): WorkoutsView {
  const templatesQ = useTemplates();
  const exercisesQ = useExercises();

  const isLoading = templatesQ.isLoading || exercisesQ.isLoading;
  const isError = templatesQ.isError || exercisesQ.isError;
  const error = templatesQ.error ?? exercisesQ.error;

  const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
  for (const e of exercisesQ.data ?? []) {
    lookup[e.id] = { name: e.name, profile: e.profile };
  }

  const ready = templatesQ.data && exercisesQ.data;
  const workouts = ready
    ? buildWorkoutList(templatesQ.data as WorkoutInput[], lookup)
    : [];

  return { isLoading, isError, error, workouts };
}
