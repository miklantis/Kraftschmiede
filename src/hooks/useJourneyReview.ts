import { useMemo } from "react";
import { buildPhaseViews, type JourneyPhaseInput, type PhaseView } from "@/lib/journey";
import {
  buildJourneyReview,
  type JourneyReview,
} from "@/lib/journeyReview";
import {
  buildArchivedJourneys,
  type ArchivedJourneyView,
} from "@/lib/journeyArchive";
import { useArchivedJourney } from "./useArchivedJourney";
import { useSessions } from "./useSessions";
import { useTemplates } from "./useTemplates";
import { useSkills } from "./useSkills";

// Anzeigefertiges Modell der Rueckschau einer abgeschlossenen Journey: Kopfzeile
// (Zeitraum, Dauer, Einheiten), die Phasen als bekannte Phasen-Modelle (alle
// vergangen) und die absolvierten Einheiten je Phase. Die Komponenten kennen
// weder Supabase noch die Aufbereitung.
export interface JourneyReviewView {
  name: string;
  /** "5. Januar 2026 – 1. März 2026 · 8 Wochen · 24 Einheiten" */
  metaLine: string;
  phases: PhaseView[];
  review: JourneyReview;
}

export function useJourneyReview(journeyId: string): {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  notFound: boolean;
  data: JourneyReviewView | null;
} {
  const journeyQ = useArchivedJourney(journeyId);
  const sessionsQ = useSessions();
  const templatesQ = useTemplates();
  const skillsQ = useSkills();

  const queries = [journeyQ, sessionsQ, templatesQ, skillsQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const journey = journeyQ.data ?? null;

  const data = useMemo<JourneyReviewView | null>(() => {
    if (isLoading || isError || !journey) return null;

    const sessions = sessionsQ.data ?? [];
    const tplName: Record<string, string> = {};
    (templatesQ.data ?? []).forEach((t) => (tplName[t.id] = t.name));
    const skName: Record<string, string> = {};
    (skillsQ.data ?? []).forEach((s) => (skName[s.id] = s.name));

    const review = buildJourneyReview(
      journey.id,
      journey.phases.map((p) => ({
        id: p.id,
        name: p.name,
        weeks: p.weeks,
        loadPlan: p.load_plan,
      })),
      sessions.map((s) => ({
        id: s.id,
        date: s.date,
        type: s.type,
        status: s.status,
        journeyId: s.journey_id,
        phaseId: s.phase_id,
        templateId: s.template_id,
        skillId: s.skill_id,
      })),
      {
        templateName: (id) => tplName[id],
        skillName: (id) => skName[id],
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
      sessions.map((s) => ({
        date: s.date,
        status: s.status,
        journeyId: s.journey_id,
      })),
    );

    const metaLine = [
      archived?.range ?? "",
      archived?.duration ?? "",
      review.totalUnits === 1 ? "1 Einheit" : review.totalUnits + " Einheiten",
    ]
      .filter((x) => x !== "")
      .join(" · ");

    // Abgeschlossene Journey: alle Phasen sind vergangen (done).
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
    const phases = buildPhaseViews(phaseInputs, {
      phaseIndex: phaseInputs.length - 1,
      weekInPhase: 0,
      done: true,
    });

    return { name: journey.name, metaLine, phases, review };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    isError,
    journey,
    sessionsQ.data,
    templatesQ.data,
    skillsQ.data,
  ]);

  return {
    isLoading,
    isError,
    error,
    notFound: !isLoading && !isError && journey === null,
    data,
  };
}
