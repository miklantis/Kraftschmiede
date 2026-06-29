import { useCallback, useMemo } from "react";
import { recoveryGreen } from "@/lib/coach";
import { buildLiveEntries } from "@/lib/liveBuild";
import type {
  LiveBuildExercise,
  LiveBuildBar,
  LiveBuildResult,
} from "@/lib/liveBuild";
import { todayISO } from "@/lib/format";
import { buildLastEntries } from "@/lib/lastEntries";
import { derivePhaseContext } from "@/lib/phaseContext";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates } from "./useInventory";
import { useLatestBody } from "./useBody";

// Stellt die laufende Einheit aus einer Vorlage zusammen (Phase 11, Lieferung 2).
// Buendelt die Daten-Hooks, formt sie in die reine Build-Eingabe und ruft den
// getesteten Aufbau (lib/liveBuild). Die Komponenten kennen so weder Supabase
// noch die Engine; die Trainingsseite ruft nur buildWorkout(templateId, title).
// Letzter Eintrag je Uebung (lib/lastEntries) und Phasen-Kontext (lib/phaseContext)
// sind herausgezogen, damit die Uebungs-Statusanzeige dieselbe Quelle nutzt.

export interface UseLiveBuilder {
  /** Alle noetigen Daten geladen. */
  ready: boolean;
  /** Baut die Einheit aus der Vorlage; null, wenn die Vorlage fehlt. */
  buildWorkout: (templateId: string) => LiveBuildResult | null;
  /** Aktive Journey und aktuelle Phase (zum Einfrieren auf die Einheit). */
  journeyId: string | null;
  phaseId: string | null;
}

export function useLiveBuilder(): UseLiveBuilder {
  const exercisesQ = useExercises();
  const templatesQ = useTemplates();
  const sessionsQ = useSessions();
  const detailedQ = useSessionsDetailed();
  const journeyQ = useActiveJourney();
  const settingsQ = useSettings();
  const barsQ = useBars();
  const platesQ = usePlates();
  const bodyQ = useLatestBody();

  const ready =
    exercisesQ.data != null &&
    templatesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null;

  // Vom Vorlagen-/Phasenbezug unabhaengige Eingaben einmal aufbereiten.
  const base = useMemo(() => {
    const exercisesById: Record<string, LiveBuildExercise> = {};
    (exercisesQ.data ?? []).forEach((e) => {
      exercisesById[e.id] = {
        id: e.id,
        key: e.key,
        name: e.name,
        profile: e.profile,
        category: e.category,
        repRange:
          e.rep_range_min != null && e.rep_range_max != null
            ? [e.rep_range_min, e.rep_range_max]
            : null,
        workWeight: e.work_weight,
        targetScore: e.target_score,
        barId: e.bar_id,
        rm: e.rm,
        muscleGroups: e.muscle_groups,
      };
    });

    const bars: LiveBuildBar[] = (barsQ.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
    }));
    const plates = (platesQ.data ?? []).map((p) => p.weight);
    const lastEntryByExercise = buildLastEntries(detailedQ.data ?? []);

    const body = bodyQ.data;
    const green = recoveryGreen({
      legs: body?.legs ?? 0,
      upper_body: body?.upper_body ?? 0,
      overall: body?.overall ?? 0,
      readiness: body?.readiness ?? 3,
    });

    const unit = settingsQ.data?.unit ?? "kg";
    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

    // Phasenbezug aus der trainingsgetriebenen Platzierung (lib/phaseContext).
    const ph = derivePhaseContext(
      journeyQ.data ?? null,
      sessionsQ.data ?? [],
      freqTarget,
      todayISO(),
    );

    return {
      exercisesById,
      bars,
      plates,
      lastEntryByExercise,
      green,
      unit,
      ...ph,
    };
  }, [
    exercisesQ.data,
    barsQ.data,
    platesQ.data,
    detailedQ.data,
    bodyQ.data,
    settingsQ.data,
    journeyQ.data,
    sessionsQ.data,
  ]);

  const templates = templatesQ.data;

  const buildWorkout = useCallback(
    (templateId: string): LiveBuildResult | null => {
      const tpl = (templates ?? []).find((t) => t.id === templateId);
      if (!tpl) return null;
      return buildLiveEntries({
        exerciseIds: tpl.exerciseIds,
        exercisesById: base.exercisesById,
        phaseFocus: base.phaseFocus,
        phaseRepTarget: base.phaseRepTarget,
        volumePhase: base.volumePhase,
        weekInPhase: base.weekInPhase,
        recoveryGreen: base.green,
        lastEntryByExercise: base.lastEntryByExercise,
        bars: base.bars,
        plates: base.plates,
        unit: base.unit,
      });
    },
    [templates, base],
  );

  return { ready, buildWorkout, journeyId: base.journeyId, phaseId: base.phaseId };
}
