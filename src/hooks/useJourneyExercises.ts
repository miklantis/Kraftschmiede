import { useMemo } from "react";
import {
  buildJourneyExerciseGroups,
  journeyExerciseIds,
  type JourneyExerciseChart,
  type JourneyExerciseGroup,
} from "@/lib/journeyExercises";
import {
  buildExerciseHistory,
  filterJourneySessions,
} from "@/lib/exerciseHistory";
import { buildJourneySeries, journeyPhaseMarks } from "@/lib/journeyChart";
import type { WorkoutExerciseInfo, WorkoutInput } from "@/lib/workouts";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useActiveJourney } from "./useJourney";
import { useJourneyWorkouts } from "./useJourneyWorkouts";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useSettings } from "./useSettings";

export interface JourneyExercisesView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Alle Quellen da – erst dann ist ein leerer Abschnitt aussagekraeftig. */
  ready: boolean;
  /** Leer, solange kein nutzbares Workout zugewiesen ist (Leerzustand). */
  groups: JourneyExerciseGroup[];
  /** Gewichtseinheit fuer die Werte im Chart-Tooltip. */
  unit: string;
}

// Ansichtsmodell des Abschnitts "Uebungen in dieser Journey": welche Uebungen
// gehoeren ueber die zugewiesenen Workouts zu dieser Journey, und wie oft ist
// jede darin gelaufen. Die Journey kommt als Parameter herein (nicht "die
// aktive" fest verdrahtet), damit die Rueckschau abgeschlossener Journeys
// spaeter denselben Hook nutzen kann; ohne Journey bleibt alles leer.
//
// Alle Quellen sind bereits gecacht (Katalog, Vorlagen, Zuordnung, Verlauf) –
// die Liste zieht deshalb sofort mit, wenn oben ein Workout an- oder
// abgeschaltet wird, auch offline. Die Zaehlung laeuft ueber denselben Verlauf,
// den die Uebungsseite zeigt (buildExerciseHistory), nur auf die Einheiten
// dieser Journey eingegrenzt – so kann die Zahl hier nicht von der Uebungsseite
// abweichen.
export function useJourneyExercises(
  journeyId: string | null,
): JourneyExercisesView {
  const exercisesQ = useExercises();
  const templatesQ = useTemplates();
  const journeyQ = useActiveJourney();
  const assignedQ = useJourneyWorkouts(journeyId);
  const sessionsQ = useSessionsDetailed();
  const settingsQ = useSettings();

  const queries = [exercisesQ, templatesQ, assignedQ, sessionsQ, settingsQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  // Defensiv: nur ein echtes Array wird zur Zuordnung. Ein aelterer, kaputt
  // serialisierter Cachewert darf nicht crashen, sondern gilt als leere
  // Zuweisung (wie in JourneyWorkoutsSection).
  const assigned = Array.isArray(assignedQ.data) ? assignedQ.data : [];

  const ready =
    journeyId !== null &&
    exercisesQ.data != null &&
    templatesQ.data != null &&
    assignedQ.data !== undefined &&
    sessionsQ.data != null;

  const rmFormula = settingsQ.data?.rm_formula ?? "mean";
  const unit = settingsQ.data?.unit ?? "kg";

  // Phasennamen fuer die Trennlinien im Chart. Sie kommen aus der Journey
  // selbst; ist die gefragte Journey nicht die aktive (spaeter: Rueckschau),
  // bleiben die Namen leer und der Chart zeichnet keine Grenzen, statt fremde
  // Phasen anzuschreiben.
  const journey = journeyQ.data ?? null;
  const phaseNames = useMemo<Record<string, string>>(() => {
    if (journey == null || journey.id !== journeyId) return {};
    const out: Record<string, string> = {};
    for (const p of journey.phases) out[p.id] = p.name;
    return out;
  }, [journey, journeyId]);

  const groups = useMemo<JourneyExerciseGroup[]>(() => {
    if (!ready || journeyId === null) return [];

    const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
    for (const e of exercisesQ.data ?? []) {
      lookup[e.id] = { name: e.name, profile: e.profile };
    }

    const ids = journeyExerciseIds(
      (templatesQ.data ?? []) as WorkoutInput[],
      lookup,
      new Set(assigned),
    );
    if (ids.length === 0) return [];

    // Einmal auf die Einheiten dieser Journey eingrenzen, dann je Uebung deren
    // Verlauf bauen – der Journey-Stempel der Einheit entscheidet.
    const journeySessions = filterJourneySessions(
      sessionsQ.data ?? [],
      journeyId,
    );
    const byId = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));
    const charts: Record<string, JourneyExerciseChart | undefined> = {};
    for (const id of ids) {
      const exercise = byId.get(id);
      if (!exercise) continue;
      const history = buildExerciseHistory(id, journeySessions, rmFormula);
      charts[id] = {
        dates: history.map((e) => e.date),
        series: buildJourneySeries(
          history,
          exercise.profile,
          exercise.metric,
        ),
        marks: journeyPhaseMarks(history, phaseNames),
      };
    }

    return buildJourneyExerciseGroups(
      exercisesQ.data ?? [],
      new Set(ids),
      charts,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    journeyId,
    exercisesQ.data,
    templatesQ.data,
    assignedQ.data,
    sessionsQ.data,
    rmFormula,
    phaseNames,
  ]);

  return {
    isLoading,
    isError,
    error,
    ready,
    groups,
    unit,
  };
}
