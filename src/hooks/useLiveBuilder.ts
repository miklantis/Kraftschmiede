import { useCallback, useMemo } from "react";
import { recoveryGreen } from "@/lib/coach";
import { buildLiveEntries } from "@/lib/liveBuild";
import type {
  LiveBuildExercise,
  LiveBuildBar,
  LiveBuildResult,
} from "@/lib/liveBuild";
import { todayISO } from "@/lib/format";
import { buildLastEntries, buildPrevEntries, buildWeekEntries } from "@/lib/lastEntries";
import { derivePhaseContext, toPlacementSessions } from "@/lib/phaseContext";
import { journeyWeekLookup } from "@/engine";
import type { PlanSource } from "@/lib/planContext";
import { buildPlanNote, type PlanNote } from "@/lib/planNote";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates, useDumbbells } from "./useInventory";
import { useLatestBody } from "./useBody";
import { useTestDates } from "./useTestDates";

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
  /** Hinweis zur vorgegebenen Last der laufenden Phase; null im Normalfall. */
  loadNote: string | null;
  /** Hinweis zur laufenden Woche des Wochenplans; null ohne Plan-Phase. */
  planNote: PlanNote | null;
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
  const dumbbellsQ = useDumbbells();
  const bodyQ = useLatestBody();
  const testDates = useTestDates();

  const ready =
    exercisesQ.data != null &&
    templatesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null &&
    dumbbellsQ.data != null;

  // Vom Vorlagen-/Phasenbezug unabhaengige Eingaben einmal aufbereiten.
  const base = useMemo(() => {
    const exercisesById: Record<string, LiveBuildExercise> = {};
    (exercisesQ.data ?? []).forEach((e) => {
      exercisesById[e.id] = {
        id: e.id,
        key: e.key,
        name: e.name,
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
    const dumbbells = (dumbbellsQ.data ?? []).map((d) => d.weight);
    const lastEntryByExercise = buildLastEntries(detailedQ.data ?? []);
    // Die Einheit davor je Uebung – Grundlage der Rueckwaertsregel des Coaches.
    const prevEntryByExercise = buildPrevEntries(detailedQ.data ?? []);

    const body = bodyQ.data;
    const green = recoveryGreen({
      legs: body?.legs ?? 0,
      upper_body: body?.upper_body ?? 0,
      overall: body?.overall ?? 0,
      readiness: body?.readiness ?? 3,
    });

    const unit = settingsQ.data?.unit ?? "kg";
    const weightStep = settingsQ.data?.weight_step ?? null;
    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

    // Phasenbezug aus der trainingsgetriebenen Platzierung (lib/phaseContext).
    const ph = derivePhaseContext(
      journeyQ.data ?? null,
      sessionsQ.data ?? [],
      freqTarget,
      todayISO(),
      testDates,
    );

    // Wochenplan-Stand der laufenden Phase: welche Planwoche gilt und welche
    // Einheiten liegen in dieser bzw. der vorigen Journey-Woche (#225).
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

    // Hinweistext der laufenden Planwoche fuer den Trainingsbildschirm: er wird
    // beim Start auf die Einheit eingefroren, wie der Lastfaktor-Hinweis (#225,
    // Schritt 5). Schrittweite und Einheit kommen aus den Einstellungen und
    // stehen erst hier zur Verfuegung.
    const planNote =
      ph.planWeek && ph.phase
        ? buildPlanNote({
            phaseName: ph.phase.name,
            weekInPhase: ph.placement?.weekInPhase ?? 1,
            phaseWeeks: ph.phase.weeks,
            week: ph.planWeek,
            deload: ph.deload,
            weightStep,
            unit,
          })
        : null;

    return {
      exercisesById,
      bars,
      plates,
      dumbbells,
      lastEntryByExercise,
      prevEntryByExercise,
      green,
      unit,
      weightStep,
      planSource,
      planNote,
      ...ph,
    };
  }, [
    exercisesQ.data,
    barsQ.data,
    platesQ.data,
    dumbbellsQ.data,
    detailedQ.data,
    bodyQ.data,
    settingsQ.data,
    journeyQ.data,
    sessionsQ.data,
    testDates,
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
        freeMode: base.journeyId === null,
        loadFactor: base.loadFactor,
        planSource: base.planSource,
        lastEntryByExercise: base.lastEntryByExercise,
        prevEntryByExercise: base.prevEntryByExercise,
        weightStep: base.weightStep,
        bars: base.bars,
        plates: base.plates,
        dumbbells: base.dumbbells,
        unit: base.unit,
      });
    },
    [templates, base],
  );

  return {
    ready,
    buildWorkout,
    journeyId: base.journeyId,
    phaseId: base.phaseId,
    loadNote: base.loadNote,
    planNote: base.planNote,
  };
}
