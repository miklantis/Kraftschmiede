import { useMemo } from "react";
import { journeyPlacement } from "@/engine";
import {
  buildPhaseViews,
  type JourneyPhaseInput,
  type PhaseView,
} from "@/lib/journey";
import { buildPeriodization, type PeriodizationData } from "@/lib/periodization";
import { longDateYearDE, todayISO } from "@/lib/format";
import { useActiveJourney } from "./useJourney";
import { useSessions } from "./useSessions";
import { useSettings } from "./useSettings";
import { useJourneyTemplates } from "./useJourneyTemplates";

// Anzeigefertiges Modell der Journey-Seite. Komponenten kennen weder Supabase
// noch die Engine – sie bekommen Name, Meta-Zeile, fertige Phasen-Modelle und das
// fertige Kurven-Modell (Periodisierung).
export interface JourneyView {
  name: string;
  templateName: string | null;
  startLong: string | null;
  phases: PhaseView[];
  periodization: PeriodizationData;
}

// Bezieht aktive Journey, Einheiten, Einstellungen und Vorlagen und setzt daraus
// das Anzeige-Modell zusammen. Die aktuelle Platzierung kommt aus der Engine.
export function useJourneyView(): {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: JourneyView | null;
  hasJourney: boolean;
} {
  const journeyQ = useActiveJourney();
  const sessionsQ = useSessions();
  const settingsQ = useSettings();
  const templatesQ = useJourneyTemplates();

  const queries = [journeyQ, sessionsQ, settingsQ, templatesQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const journey = journeyQ.data ?? null;

  const data = useMemo<JourneyView | null>(() => {
    if (isLoading || isError || !journey) return null;

    const sessions = sessionsQ.data ?? [];
    const settings = settingsQ.data ?? null;
    const templates = templatesQ.data ?? [];
    const freqTarget = settings?.weekly_frequency_target || 3;
    const today = todayISO();

    const placement = journeyPlacement(
      { id: journey.id, phases: journey.phases },
      sessions.map((s) => ({
        date: s.date,
        status: s.status,
        type: s.type,
        journeyId: s.journey_id,
      })),
      freqTarget,
      today,
    );

    const templateName =
      templates.find((t) => t.id === journey.source_template_id)?.name ?? null;

    const phaseInputs: JourneyPhaseInput[] = journey.phases.map((p) => ({
      name: p.name,
      focus: p.focus,
      weeks: p.weeks,
      setsStart: p.sets_start,
      setsEnd: p.sets_end,
      deloadWeek: p.deload_week,
      repTargetMin: p.rep_target_min,
      repTargetMax: p.rep_target_max,
    }));

    const phases = buildPhaseViews(phaseInputs, placement);
    const periodization = buildPeriodization(phaseInputs, placement.globalWeek);

    return {
      name: journey.name,
      templateName,
      startLong: journey.start_date ? longDateYearDE(journey.start_date) : null,
      phases,
      periodization,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    isError,
    journey,
    sessionsQ.data,
    settingsQ.data,
    templatesQ.data,
  ]);

  return {
    isLoading,
    isError,
    error,
    data,
    hasJourney: !isLoading && !isError && journey !== null,
  };
}
