import { useExercises } from "./useExercises";
import { useSettings } from "./useSettings";
import { useCoachStatuses } from "./useCoachStatuses";
import {
  filterExercises,
  groupExercises,
  type ExerciseGroup,
} from "@/lib/exercises";

export interface ExercisesView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  groups: ExerciseGroup[];
  /**
   * Enthaelt der Katalog ueberhaupt Uebungen? Trennt "noch nichts da" von
   * "Suchbegriff passt auf nichts" – beides ergaebe sonst nur leere Gruppen.
   */
  hasExercises: boolean;
}

// Die Uebungsliste als Ansichtsmodell: der Katalog (useExercises) gruppiert in
// die V1-Reihenfolge, mit den Zeilen-Metadaten (Meta = 1RM/Arbeitsgewicht/Wdh,
// braucht die Gewichtseinheit) und der groben Coach-Lesart je Uebung als Pille.
// Der Coach-Status (useCoachStatuses) blockiert die Liste NICHT - die Pillen
// erscheinen, sobald berechnet. Reine Aufbereitung liegt in lib/exercises.ts.
//
// `query` ist der Suchbegriff der Seite (leer = ganzer Katalog). Gefiltert wird
// vor dem Gruppieren, damit Gruppen ohne Treffer wegfallen.
export function useExercisesView(query = ""): ExercisesView {
  const exercisesQ = useExercises();
  const settingsQ = useSettings();
  const coach = useCoachStatuses();

  const isLoading = exercisesQ.isLoading || settingsQ.isLoading;
  const isError = exercisesQ.isError || settingsQ.isError;
  const error = exercisesQ.error ?? settingsQ.error;

  const unit = settingsQ.data?.unit ?? "kg";
  const states = Object.fromEntries(
    Object.entries(coach.byExercise).map(([id, v]) => [id, v.status.state]),
  );
  const alle = exercisesQ.data ?? [];
  const groups = groupExercises(filterExercises(alle, query), unit, states);

  return { isLoading, isError, error, groups, hasExercises: alle.length > 0 };
}
