import { useExercises } from "./useExercises";
import { useSettings } from "./useSettings";
import { useCoachStatuses } from "./useCoachStatuses";
import { groupExercises, type ExerciseGroup } from "@/lib/exercises";

export interface ExercisesView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  groups: ExerciseGroup[];
}

// Die Uebungsliste als Ansichtsmodell: der Katalog (useExercises) gruppiert in
// die V1-Reihenfolge, mit den Zeilen-Metadaten (Meta = 1RM/Arbeitsgewicht/Wdh,
// braucht die Gewichtseinheit) und der groben Coach-Lesart je Uebung als Pille.
// Der Coach-Status (useCoachStatuses) blockiert die Liste NICHT - die Pillen
// erscheinen, sobald berechnet. Reine Aufbereitung liegt in lib/exercises.ts.
export function useExercisesView(): ExercisesView {
  const exercisesQ = useExercises();
  const settingsQ = useSettings();
  const coach = useCoachStatuses();

  const isLoading = exercisesQ.isLoading || settingsQ.isLoading;
  const isError = exercisesQ.isError || settingsQ.isError;
  const error = exercisesQ.error ?? settingsQ.error;

  const unit = settingsQ.data?.unit ?? "kg";
  const states = Object.fromEntries(
    Object.entries(coach.byExercise).map(([id, s]) => [id, s.state]),
  );
  const groups = exercisesQ.data
    ? groupExercises(exercisesQ.data, unit, states)
    : [];

  return { isLoading, isError, error, groups };
}
