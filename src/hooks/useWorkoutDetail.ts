import { useTemplates } from "./useTemplates";
import { useExercises } from "./useExercises";
import {
  buildWorkoutDetail,
  type WorkoutDetailModel,
  type WorkoutExerciseInfo,
  type WorkoutInput,
} from "@/lib/workouts";

export interface WorkoutDetailView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** null, sobald geladen und das Workout nicht (mehr) existiert. */
  workout: WorkoutDetailModel | null;
}

// Ein einzelnes Workout lesend: nach Rolle gruppierte Uebungen plus abgeleitete
// Journey-Faehigkeit. Greift auf useTemplates/useExercises zu (kein direkter
// Supabase-Zugriff); die Aufbereitung liegt in lib/workouts.ts.
export function useWorkoutDetail(templateId: string): WorkoutDetailView {
  const templatesQ = useTemplates();
  const exercisesQ = useExercises();

  const isLoading = templatesQ.isLoading || exercisesQ.isLoading;
  const isError = templatesQ.isError || exercisesQ.isError;
  const error = templatesQ.error ?? exercisesQ.error;

  const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
  for (const e of exercisesQ.data ?? []) {
    lookup[e.id] = { name: e.name, profile: e.profile };
  }

  let workout: WorkoutDetailModel | null = null;
  if (templatesQ.data && exercisesQ.data) {
    const found = (templatesQ.data as WorkoutInput[]).find(
      (w) => w.id === templateId,
    );
    workout = found ? buildWorkoutDetail(found, lookup) : null;
  }

  return { isLoading, isError, error, workout };
}
