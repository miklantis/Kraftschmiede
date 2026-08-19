import { useMemo } from "react";
import { workSets } from "@/engine";
import {
  suggestWithBar,
  coachStatusFromSuggestion,
  type CoachBuildExercise,
  type CoachStatus,
} from "@/lib/coach";
import { activeRepTarget, phaseEntryOverride } from "@/lib/liveBuild";
import { planContextFor, type PlanSource } from "@/lib/planContext";
import { buildLastEntries, buildPrevEntries, buildWeekEntries } from "@/lib/lastEntries";
import { derivePhaseContext, toPlacementSessions } from "@/lib/phaseContext";
import { journeyWeekLookup } from "@/engine";
import { todayISO } from "@/lib/format";
import { useExercises } from "./useExercises";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates, useDumbbells } from "./useInventory";
import { useTestDates } from "./useTestDates";

// Coach-Status je Uebung fuer die Uebungsseite (Liste + Detail): was der Coach
// fuer die naechste Einheit dieser Uebung entscheiden wuerde - steigern, halten,
// senken (bzw. Begleituebung "frei" / ohne Vordaten "Start"). Buendelt dieselben
// Daten-Hooks wie der Live-Aufbau (gecacht, kein zusaetzlicher Netz-Zugriff),
// formt sie ueber die geteilten Bausteine (lastEntries, phaseContext) und ruft die
// gemeinsame Coach-Naht suggestWithBar - so ist der Status deckungsgleich mit dem
// Vorschlag, den eine gestartete Einheit zeigen wuerde. Reine Anzeige, kein
// Schreibvorgang.

interface CoachBar {
  id: string;
  name: string;
  weight: number;
}

export interface UseCoachStatuses {
  isLoading: boolean;
  ready: boolean;
  byExercise: Record<string, CoachStatus>;
}

export function useCoachStatuses(): UseCoachStatuses {
  const exercisesQ = useExercises();
  const sessionsQ = useSessions();
  const detailedQ = useSessionsDetailed();
  const journeyQ = useActiveJourney();
  const settingsQ = useSettings();
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();
  const testDates = useTestDates();

  const ready =
    exercisesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null &&
    dumbbellsQ.data != null;

  const isLoading =
    exercisesQ.isLoading ||
    sessionsQ.isLoading ||
    detailedQ.isLoading ||
    barsQ.isLoading ||
    platesQ.isLoading ||
    dumbbellsQ.isLoading;

  const byExercise = useMemo<Record<string, CoachStatus>>(() => {
    const out: Record<string, CoachStatus> = {};
    if (!ready) return out;

    const bars: CoachBar[] = (barsQ.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
    }));
    const plates = (platesQ.data ?? []).map((p) => p.weight);
    const dumbbells = (dumbbellsQ.data ?? []).map((d) => d.weight);
    const lastEntryByExercise = buildLastEntries(detailedQ.data ?? []);
    // Die Einheit davor je Uebung – Grundlage der Rueckwaertsregel des Coaches.
    const prevEntryByExercise = buildPrevEntries(detailedQ.data ?? []);
    const weightStep = settingsQ.data?.weight_step ?? null;
    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

    const ph = derivePhaseContext(
      journeyQ.data ?? null,
      sessionsQ.data ?? [],
      freqTarget,
      todayISO(),
      testDates,
    );
    const hasPhase = ph.volumePhase != null;
    // Ohne aktive Journey trainiert der Nutzer frei: der Coach gibt nichts vor,
    // die Statusanzeige zeigt entsprechend "frei anpassbar".
    const freeMode = ph.journeyId === null;

    // Wochenplan-Stand der laufenden Phase - dieselbe Quelle wie der Live-Aufbau.
    const planSource: PlanSource | null = ph.planWeek
      ? (() => {
          const weekOf = journeyWeekLookup(
            toPlacementSessions(sessionsQ.data ?? []),
            ph.journeyId ?? "",
            freqTarget,
            testDates,
          );
          const current = ph.placement?.globalWeek ?? 1;
          return {
            week: ph.planWeek,
            prevWeek: ph.prevPlanWeek,
            startReps: ph.firstPlanWeek?.reps ?? null,
            anchorPhaseId: ph.anchorPhaseId,
            deload: ph.deload,
            currentWeekEntryByExercise: buildWeekEntries(
              detailedQ.data ?? [],
              weekOf,
              current,
              ph.phaseId,
            ),
            previousWeekEntryByExercise: buildWeekEntries(
              detailedQ.data ?? [],
              weekOf,
              current - 1,
              ph.phaseId,
            ),
          };
        })()
      : null;

    for (const e of exercisesQ.data ?? []) {
      const exo: CoachBuildExercise = {
        key: e.key,
        profile: e.profile,
        tier: e.tier,
        equipment: e.equipment,
        repRange:
          e.rep_range_min != null && e.rep_range_max != null
            ? [e.rep_range_min, e.rep_range_max]
            : null,
        workWeight: e.work_weight,
        targetScore: e.target_score,
        barId: e.bar_id,
        referenceWeight: e.reference_weight,
        referencePhaseId: e.reference_phase_id,
        planStartWeight: e.plan_start_weight,
      };
      const plan = planContextFor(planSource, {
        id: e.id,
        referenceWeight: e.reference_weight,
        referencePhaseId: e.reference_phase_id,
        planStartWeight: e.plan_start_weight,
        rm: e.rm,
      });
      const lastEntry = lastEntryByExercise[e.id] ?? null;
      const hadPriorData = workSets(lastEntry).length > 0;
      const repTarget = activeRepTarget(exo, ph.phaseRepTarget, hasPhase, plan);
      const { suggestion, bar } = suggestWithBar(exo, {
        phaseFocus: ph.phaseFocus,
        lastEntry,
        prevEntry: prevEntryByExercise[e.id] ?? null,
        weightStep,
        bars,
        plates,
        dumbbells,
        repTarget,
        freeMode,
        loadFactor: ph.loadFactor,
        plan,
      });
      // Denselben Phasenwechsel-Einstieg anwenden wie der Live-Aufbau, sonst
      // zeigt die Statusanzeige bei getrennten Repbaendern ein anderes Gewicht
      // als die gestartete Einheit. Die Coach-Entscheidung (steigern/halten/
      // senken) bleibt die des Vorschlags - der Einstieg setzt nur die Last.
      const entry = phaseEntryOverride({
        exo,
        rm: e.rm,
        repTarget,
        bar: bar ? { weight: bar.weight } : null,
        lastEntry,
        plates,
        loadFactor: ph.loadFactor,
        suggestion,
      });
      out[e.id] = coachStatusFromSuggestion(
        { ...suggestion, weight: entry.weight, targetReps: entry.targetReps },
        hadPriorData,
      );
    }
    return out;
  }, [
    ready,
    exercisesQ.data,
    sessionsQ.data,
    detailedQ.data,
    journeyQ.data,
    settingsQ.data,
    barsQ.data,
    platesQ.data,
    dumbbellsQ.data,
    testDates,
  ]);

  return { isLoading, ready, byExercise };
}
