import { useMemo } from "react";
import { workSets } from "@/engine";
import {
  suggestWithBar,
  coachStatusFromSuggestion,
  type CoachBuildExercise,
  type CoachStatus,
} from "@/lib/coach";
import { activeRepTarget } from "@/lib/liveBuild";
import { buildLastEntries } from "@/lib/lastEntries";
import { derivePhaseContext } from "@/lib/phaseContext";
import { todayISO } from "@/lib/format";
import { useExercises } from "./useExercises";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates } from "./useInventory";

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

  const ready =
    exercisesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null;

  const isLoading =
    exercisesQ.isLoading ||
    sessionsQ.isLoading ||
    detailedQ.isLoading ||
    barsQ.isLoading ||
    platesQ.isLoading;

  const byExercise = useMemo<Record<string, CoachStatus>>(() => {
    const out: Record<string, CoachStatus> = {};
    if (!ready) return out;

    const bars: CoachBar[] = (barsQ.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
    }));
    const plates = (platesQ.data ?? []).map((p) => p.weight);
    const lastEntryByExercise = buildLastEntries(detailedQ.data ?? []);
    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

    const ph = derivePhaseContext(
      journeyQ.data ?? null,
      sessionsQ.data ?? [],
      freqTarget,
      todayISO(),
    );
    const hasPhase = ph.volumePhase != null;

    for (const e of exercisesQ.data ?? []) {
      const exo: CoachBuildExercise = {
        key: e.key,
        profile: e.profile,
        equipment: e.equipment,
        repRange:
          e.rep_range_min != null && e.rep_range_max != null
            ? [e.rep_range_min, e.rep_range_max]
            : null,
        workWeight: e.work_weight,
        targetScore: e.target_score,
        barId: e.bar_id,
      };
      const lastEntry = lastEntryByExercise[e.id] ?? null;
      const hadPriorData = workSets(lastEntry).length > 0;
      const repTarget = activeRepTarget(
        exo,
        ph.phaseFocus,
        ph.phaseRepTarget,
        hasPhase,
      );
      const { suggestion } = suggestWithBar(exo, {
        phaseFocus: ph.phaseFocus,
        lastEntry,
        bars,
        plates,
        repTarget,
      });
      out[e.id] = coachStatusFromSuggestion(suggestion, hadPriorData);
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
  ]);

  return { isLoading, ready, byExercise };
}
