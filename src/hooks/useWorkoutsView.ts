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

// Ansichtsmodell der Workouts-Bibliothek: aktive Workouts (useTemplates) mit
// Kurzform ihrer Uebungen und abgeleiteter Journey-Faehigkeit. Die Uebungsnamen
// und -profile kommen aus dem Katalog (useExercises). Reine Aufbereitung liegt
// in lib/workouts.ts.
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

  const workouts =
    templatesQ.data && exercisesQ.data
      ? buildWorkoutList(templatesQ.data as WorkoutInput[], lookup)
      : [];

  return { isLoading, isError, error, workouts };
}
