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
} from "@/lib/journeyChart";
import {
  buildJourneyTestView,
  journeyTestPoints,
  type JourneyRmTestInput,
  type JourneyTestView,
} from "@/lib/journeyTest";
import {
  derivePhaseContext,
  type PhaseContextJourney,
} from "@/lib/phaseContext";
import { fuehrtRekord } from "@/lib/testWeek";
import { todayISO } from "@/lib/format";
import type { WorkoutExerciseInfo, WorkoutInput } from "@/lib/workouts";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useCoachStatuses } from "./useCoachStatuses";
import { useJourneyWorkouts } from "./useJourneyWorkouts";
import { useAllRmTests } from "./useRmTests";
import { useSessions } from "./useSessions";
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
  /** Steht in den Kacheln das Testergebnis statt der Coach-Vorgabe? Waehrend
   *  der reinen Testwoche einer laufenden Journey (#480) – und dauerhaft im
   *  Archiv, wo eine Vorgabe fuer die naechste Einheit falscher Rat waere. */
  showTest: boolean;
}

// Ansichtsmodell des Abschnitts "Uebungen in dieser Journey": welche Uebungen
// gehoeren zu dieser Journey, und wie oft ist jede darin gelaufen. Die Journey
// kommt samt Phasen als Parameter herein (nicht "die aktive" fest verdrahtet) –
// dieselbe Form liefern useActiveJourney und useArchivedJourney. Ohne Journey
// bleibt alles leer.
//
// Ob die Journey laeuft oder abgeschlossen ist, sagt sie selbst (active). Im
// Archiv aendert das drei Dinge: der Abschnitt zeigt nur, was wirklich
// trainiert wurde (keine Platzhalter, keine "nicht mehr im Workout"-Zeilen),
// der Coach schweigt (eine Vorgabe fuer die naechste Einheit waere falscher
// Rat), und statt seiner steht das Testergebnis der Journey in der Kachel.
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
// Im Archiv nur ein Testergebnis durchlassen, das es wirklich gibt.
function archiveTest(
  view: JourneyTestView,
  archived: boolean,
): JourneyTestView | null {
  if (!archived) return view;
  return view.result === null ? null : view;
}

export function useJourneyExercises(
  journey: PhaseContextJourney | null,
): JourneyExercisesView {
  const journeyId = journey?.id ?? null;
  // Abgeschlossen = nicht mehr die aktive Journey. Das Kennzeichen der Journey
  // entscheidet, nicht ein Schalter von aussen.
  const archived = journey !== null && !journey.active;
  const exercisesQ = useExercises();
  const templatesQ = useTemplates();
  const assignedQ = useJourneyWorkouts(journeyId);
  const sessionsQ = useSessionsDetailed();
  // Flache Einheitenliste – nur fuer den Standort in der Journey (Testwoche).
  // Dieselbe Abfrage wie auf der uebrigen Journey-Seite, also aus dem Cache.
  const placementSessionsQ = useSessions();
  const settingsQ = useSettings();
  // Bewusste 1RM-Tests: sie sind keine Einheiten und stehen deshalb in einer
  // eigenen Quelle (rm_tests). Im Verlauf tauchen sie nicht auf (#480); sie
  // tragen den Block der Kachel waehrend der Testwoche.
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

  // Auf die Tests wird gewartet: in der Testwoche steht das Ergebnis im Block,
  // und ein nachgereichter Test liesse die Kachel dort ein zweites Mal
  // umspringen. Der Coach-Stand darf dagegen nachkommen.
  const ready =
    journeyId !== null &&
    exercisesQ.data != null &&
    templatesQ.data != null &&
    assignedQ.data !== undefined &&
    sessionsQ.data != null &&
    rmTestsQ.data != null;

  const rmFormula = settingsQ.data?.rm_formula ?? "mean";
  const unit = settingsQ.data?.unit ?? "kg";

  // Phasennamen fuer die Trennlinien im Chart – aus der Journey selbst, egal ob
  // sie laeuft oder abgeschlossen ist.
  const phaseNames = useMemo<Record<string, string>>(() => {
    if (journey == null) return {};
    const out: Record<string, string> = {};
    for (const p of journey.phases) out[p.id] = p.name;
    return out;
  }, [journey]);

  // Zeitraum der Journey – die Zuordnung der Tests haengt daran (rm_tests
  // traegt keinen Journey-Stempel). Ohne Journey bleibt er leer, dann werden
  // keine Tests zugeordnet, statt fremde einzusammeln.
  const testRange = useMemo<{ start: string | null; end: string | null }>(
    () =>
      journey == null
        ? { start: null, end: null }
        : { start: journey.start_date, end: journey.end_date },
    [journey],
  );

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

    // Im Archiv gibt es keinen heutigen Plan: was zaehlt, ist was trainiert
    // wurde. Die Zuordnung koennte laengst anders aussehen als damals, und eine
    // Platzhalter-Zeile "noch keine Einheit" waere in einer beendeten Journey
    // eine Zusage, die nie mehr eingeloest wird.
    const planIds = archived
      ? journeyTrainedExerciseIds(journeySessions)
      : journeyExerciseIds(
          (templatesQ.data ?? []) as WorkoutInput[],
          lookup,
          new Set(assigned),
        );
    const planSet = new Set(planIds);
    // Zweite Quelle (nur in der laufenden Journey): hier trainiert, heute nicht
    // mehr im Plan (ausgetauschte Uebung, deaktiviertes oder abgezogenes
    // Workout). Ohne sie faellt der bereits gelaufene Verlauf aus dem Abschnitt
    // heraus. Im Archiv sind beide Quellen dieselbe - dort gibt es nichts zu
    // trennen.
    const removedIds = archived
      ? []
      : journeyTrainedExerciseIds(journeySessions).filter(
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
          dates: journeyChartDates(history),
          series: buildJourneySeries(history, exercise.metric),
          marks: journeyPhaseMarks(history, phaseNames),
        },
        sessionCount: history.length,
        // Statistikzeile aus derselben journey-gefilterten Liste: bestes Set,
        // Veraenderung seit Journey-Start, Einheiten in dieser Journey.
        stats: buildJourneyStats(history),
        // Im Archiv schweigt der Coach: sein Vorschlag gilt der naechsten
        // Einheit, und die kommt in dieser Journey nicht mehr.
        coach: archived ? null : (coachByExercise[id] ?? null),
        // Ergebnis des 1RM-Tests dieser Journey. Gerechnet wird es nur fuer
        // Uebungen, die ueberhaupt ein 1RM fuehren (dieselbe Regel wie die
        // Testliste auf dem Trainingsbildschirm): Core, Haltezeit und
        // Koerpergewicht werden nie getestet, dort waere ein "noch nicht
        // getestet" eine falsche Offenheit. Gezeigt wird es in der Testwoche
        // (#480) und im Archiv – beide Male anstelle der Coach-Vorgabe.
        //
        // Im Archiv zaehlt nur ein wirklich gemessener Test: der leere Block
        // ("Noch nicht getestet", "in dieser Woche steht der Test an") spricht
        // von einer Woche, die nie wiederkommt. Ohne Ergebnis bleibt es dort
        // bei der blossen Statistikzeile.
        test: fuehrtRekord(exercise)
          ? archiveTest(buildJourneyTestView(tests, history, unit), archived)
          : null,
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
    archived,
    exercisesQ.data,
    templatesQ.data,
    assignedQ.data,
    sessionsQ.data,
    rmFormula,
    phaseNames,
    coachByExercise,
    rmTests,
    testRange,
    unit,
  ]);

  // Steht rechts in der Kachel das Testergebnis statt der Coach-Vorgabe? Im
  // Archiv immer (dort gibt der Coach nichts mehr vor), in der laufenden
  // Journey nur in der reinen Testwoche. Der Standort kommt aus der einen
  // Stelle (derivePhaseContext) – dieselbe Rechnung, die auch der
  // Trainingsbildschirm benutzt.
  const showTest = useMemo<boolean>(() => {
    if (journey == null) return false;
    if (archived) return true;
    return derivePhaseContext(
      journey,
      placementSessionsQ.data ?? [],
      settingsQ.data?.weekly_frequency_target || 3,
      todayISO(),
    ).testWeek;
  }, [journey, archived, placementSessionsQ.data, settingsQ.data]);

  return {
    isLoading,
    isError,
    error,
    ready,
    groups,
    unit,
    showTest,
  };
}
