import { useMemo } from "react";
import {
  buildJourneyExerciseGroups,
  journeyExerciseIds,
  journeyTrainedExerciseIds,
  type JourneyExerciseData,
  type JourneyExerciseGroup,
} from "@/lib/journeyExercises";
import { buildJourneyStats } from "@/lib/journeyStats";
import {
  buildExerciseHistory,
  filterJourneySessions,
} from "@/lib/exerciseHistory";
import {
  buildJourneySeries,
  journeyChartDates,
  journeyPhaseMarks,
  journeyTestPoints,
  type JourneyRmTestInput,
} from "@/lib/journeyChart";
import type { WorkoutExerciseInfo, WorkoutInput } from "@/lib/workouts";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useActiveJourney } from "./useJourney";
import { useCoachStatuses } from "./useCoachStatuses";
import { useJourneyWorkouts } from "./useJourneyWorkouts";
import { useAllRmTests } from "./useRmTests";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useSettings } from "./useSettings";

export interface JourneyExercisesView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Alle Quellen da – erst dann ist ein leerer Abschnitt aussagekraeftig. */
  ready: boolean;
  /** Leer, solange weder ein nutzbares Workout zugewiesen noch in dieser
   *  Journey etwas trainiert ist (Leerzustand). */
  groups: JourneyExerciseGroup[];
  /** Gewichtseinheit fuer die Werte im Chart-Tooltip. */
  unit: string;
}

// Ansichtsmodell des Abschnitts "Uebungen in dieser Journey": welche Uebungen
// gehoeren zu dieser Journey, und wie oft ist jede darin gelaufen. Die Journey
// kommt als Parameter herein (nicht "die aktive" fest verdrahtet), damit die
// Rueckschau abgeschlossener Journeys spaeter denselben Hook nutzen kann; ohne
// Journey bleibt alles leer.
//
// Zwei Quellen: der heutige Plan (zugewiesene Workouts) und die Einheiten
// dieser Journey. Die zweite haelt Uebungen im Abschnitt, die hier trainiert
// und danach ausgetauscht oder aus dem Plan genommen wurden – sonst waere ihr
// Verlauf mit dem Wechsel verschwunden.
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
  // Bewusste 1RM-Tests: sie sind keine Einheiten und stehen deshalb in einer
  // eigenen Quelle (rm_tests). Im Chart sind sie der Abschluss der Journey –
  // die Testwoche plant keine Einheit, ohne sie braeche der Verlauf genau vor
  // dem Ergebnis ab.
  const rmTestsQ = useAllRmTests();
  // Coach-Stand je Uebung – dieselbe Quelle wie Uebungsliste und Uebungsseite,
  // damit in der Kachel nichts anderes steht als beim Nachschlagen. Er blockiert
  // die Kacheln nicht: sie stehen, sobald der Verlauf da ist, der Block fuellt
  // sich nach.
  const coachStatuses = useCoachStatuses();

  const queries = [exercisesQ, templatesQ, assignedQ, sessionsQ, settingsQ, rmTestsQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  // Defensiv: nur ein echtes Array wird zur Zuordnung. Ein aelterer, kaputt
  // serialisierter Cachewert darf nicht crashen, sondern gilt als leere
  // Zuweisung (wie in JourneyWorkoutsSection).
  const assigned = Array.isArray(assignedQ.data) ? assignedQ.data : [];

  // Die Tests gehoeren zur Zeitachse: kaemen sie nach, spraenge der Chart ein
  // zweites Mal um. Anders als der Coach-Stand warten die Kacheln deshalb auf
  // sie.
  const ready =
    journeyId !== null &&
    exercisesQ.data != null &&
    templatesQ.data != null &&
    assignedQ.data !== undefined &&
    sessionsQ.data != null &&
    rmTestsQ.data != null;

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

  // Zeitraum der Journey – die Zuordnung der Tests haengt daran (rm_tests
  // traegt keinen Journey-Stempel). Wie bei den Phasennamen nur fuer die
  // gefragte Journey; ist sie nicht die aktive, bleibt der Zeitraum leer und
  // es werden keine Tests zugeordnet, statt fremde einzusammeln.
  const testRange = useMemo<{ start: string | null; end: string | null }>(() => {
    if (journey == null || journey.id !== journeyId) {
      return { start: null, end: null };
    }
    return { start: journey.start_date, end: journey.end_date };
  }, [journey, journeyId]);

  const rmTests = useMemo<JourneyRmTestInput[]>(
    () =>
      (rmTestsQ.data ?? []).map((t) => ({
        exerciseId: t.exercise_id,
        date: t.date,
        weight: t.weight,
        reps: t.reps,
        estRm: t.est_rm,
      })),
    [rmTestsQ.data],
  );

  const coachByExercise = coachStatuses.byExercise;

  const groups = useMemo<JourneyExerciseGroup[]>(() => {
    if (!ready || journeyId === null) return [];

    const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
    for (const e of exercisesQ.data ?? []) {
      lookup[e.id] = { name: e.name, profile: e.profile };
    }

    // Einmal auf die Einheiten dieser Journey eingrenzen, dann je Uebung deren
    // Verlauf bauen – der Journey-Stempel der Einheit entscheidet.
    const journeySessions = filterJourneySessions(
      sessionsQ.data ?? [],
      journeyId,
    );

    const planIds = journeyExerciseIds(
      (templatesQ.data ?? []) as WorkoutInput[],
      lookup,
      new Set(assigned),
    );
    const planSet = new Set(planIds);
    // Zweite Quelle: in dieser Journey trainiert, heute nicht mehr im Plan
    // (ausgetauschte Uebung, deaktiviertes oder abgezogenes Workout). Ohne sie
    // faellt der bereits gelaufene Verlauf aus dem Abschnitt heraus.
    const removedIds = journeyTrainedExerciseIds(journeySessions).filter(
      (id) => !planSet.has(id),
    );
    const ids = [...planIds, ...removedIds];
    if (ids.length === 0) return [];

    const byId = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));
    const data: Record<string, JourneyExerciseData | undefined> = {};
    for (const id of ids) {
      const exercise = byId.get(id);
      if (!exercise) continue;
      const history = buildExerciseHistory(id, journeySessions, rmFormula);
      const tests = journeyTestPoints(
        rmTests,
        id,
        testRange.start,
        testRange.end,
      );
      data[id] = {
        chart: {
          dates: journeyChartDates(history, tests),
          series: buildJourneySeries(history, exercise.metric, tests),
          marks: journeyPhaseMarks(history, phaseNames),
          tests,
        },
        sessionCount: history.length,
        // Statistikzeile aus derselben journey-gefilterten Liste: bestes Set,
        // Veraenderung seit Journey-Start, Einheiten in dieser Journey.
        stats: buildJourneyStats(history),
        coach: coachByExercise[id] ?? null,
      };
    }

    return buildJourneyExerciseGroups(
      exercisesQ.data ?? [],
      planSet,
      data,
      new Set(removedIds),
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
    coachByExercise,
    rmTests,
    testRange,
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
