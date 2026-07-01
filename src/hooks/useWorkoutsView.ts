import { useTemplates } from "./useTemplates";
import { useExercises } from "./useExercises";
import {
  buildArchivedList,
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
  archived: WorkoutRowModel[];
}

// Ansichtsmodell der Workouts-Bibliothek: aktive Workouts (useTemplates) mit
// Kurzform ihrer Uebungen und abgeleiteter Journey-Faehigkeit, dazu die
// archivierten fuer den ausklappbaren Archiv-Abschnitt. Die Uebungsnamen und
// -profile kommen aus dem Katalog (useExercises). Reine Aufbereitung liegt in
// lib/workouts.ts.
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
  const archived = ready
    ? buildArchivedList(templatesQ.data as WorkoutInput[], lookup)
    : [];

  return { isLoading, isError, error, workouts, archived };
}
