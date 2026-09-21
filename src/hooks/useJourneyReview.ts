import { useMemo } from "react";
import {
  buildPhaseViews,
  type JourneyPhaseInput,
  type PhaseView,
} from "@/lib/journey";
import { buildPeriodization, type PeriodizationData } from "@/lib/periodization";
import {
  buildArchiveWorkouts,
  type ArchiveWorkoutRow,
} from "@/lib/journeyArchiveWorkouts";
import {
  buildArchivedJourneys,
  type ArchivedJourneyView,
} from "@/lib/journeyArchive";
import { useArchivedJourney, type ArchivedJourneyDetail } from "./useArchivedJourney";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useTemplates } from "./useTemplates";
import { useExercises } from "./useExercises";

// Anzeigefertiges Modell des Archivs einer abgeschlossenen Journey: Kopfzeile
// (Zeitraum, Dauer, Einheiten), die Periodisierungskurve, die Phasen als
// bekannte Phasen-Modelle (alle vergangen) und die trainierten Workouts mit
// ihren Uebungen. Die Komponenten kennen weder Supabase noch die Aufbereitung.
//
// Die Seite folgt bewusst derselben Abfolge wie die laufende Journey-Seite
// (Issue #485): Kurve, Phasen, Workouts, Uebungen. Der Uebungs-Abschnitt haengt
// nicht an diesem Hook – er bekommt die Journey selbst und holt sich seinen
// Verlauf ueber useJourneyExercises, genau wie auf der laufenden Seite. Dafuer
// reicht dieser Hook die geladene Journey mit heraus.
export interface JourneyReviewView {
  name: string;
  /** "5. Januar 2026 – 1. März 2026 · 8 Wochen · 24 Einheiten" */
  metaLine: string;
  phases: PhaseView[];
  periodization: PeriodizationData;
  workouts: ArchiveWorkoutRow[];
}

export function useJourneyReview(journeyId: string): {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  notFound: boolean;
  data: JourneyReviewView | null;
  /** Die geladene Journey samt Phasen – fuer den Uebungs-Abschnitt. */
  journey: ArchivedJourneyDetail | null;
} {
  const journeyQ = useArchivedJourney(journeyId);
  const sessionsQ = useSessions();
  const detailedQ = useSessionsDetailed();
  const templatesQ = useTemplates();
  const exercisesQ = useExercises();

  const queries = [journeyQ, sessionsQ, detailedQ, templatesQ, exercisesQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const journey = journeyQ.data ?? null;

  const data = useMemo<JourneyReviewView | null>(() => {
    if (isLoading || isError || !journey) return null;

    const tplName: Record<string, string> = {};
    (templatesQ.data ?? []).forEach((t) => (tplName[t.id] = t.name));
    const exName: Record<string, string> = {};
    (exercisesQ.data ?? []).forEach((e) => (exName[e.id] = e.name));

    const { workouts, totalUnits } = buildArchiveWorkouts(
      journey.id,
      detailedQ.data ?? [],
      {
        templateName: (id) => tplName[id],
        exerciseName: (id) => exName[id],
      },
    );

    // Zeitraum und Dauer aus derselben Quelle wie die Archiv-Liste, damit
    // Liste und Detailseite nie auseinanderlaufen.
    const [archived]: ArchivedJourneyView[] = buildArchivedJourneys(
      [
        {
          id: journey.id,
          name: journey.name,
          startDate: journey.start_date,
          endDate: journey.end_date,
        },
      ],
      (sessionsQ.data ?? []).map((s) => ({
        date: s.date,
        status: s.status,
        journeyId: s.journey_id,
      })),
    );

    const metaLine = [
      archived?.range ?? "",
      archived?.duration ?? "",
      totalUnits === 1 ? "1 Einheit" : totalUnits + " Einheiten",
    ]
      .filter((x) => x !== "")
      .join(" · ");

    const phaseInputs: JourneyPhaseInput[] = journey.phases.map((p) => ({
      name: p.name,
      focus: p.focus,
      weeks: p.weeks,
      setsStart: p.sets_start,
      setsEnd: p.sets_end,
      deloadWeek: p.deload_week,
      repTargetMin: p.rep_target_min,
      repTargetMax: p.rep_target_max,
      loadPlan: p.load_plan,
      weekPlan: p.week_plan,
    }));

    // Abgeschlossene Journey: alle Phasen sind vergangen (done).
    const phases = buildPhaseViews(phaseInputs, {
      phaseIndex: phaseInputs.length - 1,
      weekInPhase: 0,
      done: true,
    });

    // Dieselbe Kurve wie auf der laufenden Seite, nur ohne "jetzt": die Journey
    // steht auf ihrer letzten Woche, die Marke zeichnet die Seite nicht
    // (showNow={false}).
    const gesamtWochen = phaseInputs.reduce(
      (n, p) => n + Math.max(1, p.weeks || 1),
      0,
    );
    const periodization = buildPeriodization(phaseInputs, gesamtWochen);

    return { name: journey.name, metaLine, phases, periodization, workouts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    isError,
    journey,
    sessionsQ.data,
    detailedQ.data,
    templatesQ.data,
    exercisesQ.data,
  ]);

  return {
    isLoading,
    isError,
    error,
    notFound: !isLoading && !isError && journey === null,
    data,
    journey,
  };
}
