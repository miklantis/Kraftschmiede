import { useMemo } from "react";
import {
  suggestWithBar,
  coachStatusFromSuggestion,
  type CoachBuildExercise,
  type PlanContext,
} from "@/lib/coach";
import { activeRepTarget } from "@/lib/liveBuild";
import { buildLastEntries } from "@/lib/lastEntries";
import { derivePhaseContext } from "@/lib/phaseContext";
import { planAnchor } from "@/lib/planContext";
import {
  isBlockComplete,
  liveEntryToSetEntry,
  liveWorkWeight,
  type LiveCoachPreview,
} from "@/lib/livePreview";
import { todayISO } from "@/lib/format";
import { useLiveSession } from "./useLiveSession";
import { useExercises } from "./useExercises";
import { useSessions } from "./useSessions";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useActiveJourney } from "./useJourney";
import { useSettings } from "./useSettings";
import { useBars, usePlates, useDumbbells } from "./useInventory";
import { useTestDates } from "./useTestDates";

// Coach-Vorschau waehrend der laufenden Kraft-Einheit (#190): was der Coach aus
// dem bisher Geleisteten eines Uebungsblocks machen wuerde - steigern, halten,
// senken. Zwilling von useCoachStatuses, nur mit der laufenden Einheit als
// Vordaten statt der zuletzt gespeicherten.
//
// Gerechnet wird ab dem ersten abgehakten Satz und danach nach jedem weiteren
// neu (#193); solange offene Saetze im Block stehen, ist der Stand vorlaeufig.
// Die Lesart ist durchgehend "was kaeme heraus, wenn ich jetzt beende" - offene
// Saetze verfallen beim Beenden ohnehin.
//
// Keine neue Rechnung: dieselbe Naht (suggestWithBar), dieselben gecachten
// Daten-Hooks wie der Live-Aufbau, kein zusaetzlicher Netz-Zugriff, kein
// Schreibvorgang.
//
// Bewusst NICHT angewandt wird phaseEntryOverride (anders als in
// useCoachStatuses): ob nach dieser Einheit ein Phasenwechsel ansteht, ist
// waehrend des Trainings noch nicht entschieden - das Override wuerde ein
// Gewicht anzeigen, das so nicht zwingend eintritt.

interface CoachBar {
  id: string;
  name: string;
  weight: number;
}

export interface UseLiveCoachPreview {
  /** Coach-Vorschau je Uebungsblock, adressiert ueber den Entry-Index (ei).
   *  Nach Index und nicht nach Uebungs-ID, weil dieselbe Uebung theoretisch
   *  zweimal in einer Einheit stehen kann. Bloecke ohne abgehakten Satz und
   *  nicht progressiv gerechnete Uebungen ("carry") fehlen im Ergebnis. */
  byEntry: Record<number, LiveCoachPreview>;
}

export function useLiveCoachPreview(): UseLiveCoachPreview {
  const { session } = useLiveSession();
  const exercisesQ = useExercises();
  const sessionsQ = useSessions();
  const detailedQ = useSessionsDetailed();
  const journeyQ = useActiveJourney();
  const settingsQ = useSettings();
  const barsQ = useBars();
  const platesQ = usePlates();
  const dumbbellsQ = useDumbbells();
  const testDates = useTestDates();

  const workout = session?.kind === "workout" ? session : null;

  const ready =
    workout != null &&
    exercisesQ.data != null &&
    sessionsQ.data != null &&
    detailedQ.data != null &&
    barsQ.data != null &&
    platesQ.data != null &&
    dumbbellsQ.data != null;

  const byEntry = useMemo<Record<number, LiveCoachPreview>>(() => {
    const out: Record<number, LiveCoachPreview> = {};
    if (!ready || !workout) return out;

    const bars: CoachBar[] = (barsQ.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      weight: b.weight,
    }));
    const plates = (platesQ.data ?? []).map((p) => p.weight);
    const dumbbells = (dumbbellsQ.data ?? []).map((d) => d.weight);
    // Der bisher letzte gespeicherte Eintrag rueckt in die Rolle der Einheit
    // DAVOR - die laufende Einheit ist ab jetzt die letzte.
    const prevEntryByExercise = buildLastEntries(detailedQ.data ?? []);
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
    const freeMode = ph.journeyId === null;
    const exMap = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));

    workout.entries.forEach((entry, ei) => {
      const e = exMap.get(entry.exerciseId);
      if (!e) return;
      // Kein Tor auf den vollstaendigen Block: ein abgehakter Satz genuegt.
      const lastEntry = liveEntryToSetEntry(entry);
      const workWeight = liveWorkWeight(entry);
      if (!lastEntry || workWeight == null) return;

      const exo: CoachBuildExercise = {
        key: e.key,
        profile: e.profile,
        tier: e.tier,
        equipment: e.equipment,
        repRange:
          e.rep_range_min != null && e.rep_range_max != null
            ? [e.rep_range_min, e.rep_range_max]
            : null,
        // Das im Block tatsaechlich bewegte Gewicht statt des Katalogstands -
        // dieselbe Groesse, die beim Beenden in den Katalog geschrieben wird.
        workWeight,
        targetScore: e.target_score,
        barId: e.bar_id,
        referenceWeight: e.reference_weight,
        referencePhaseId: e.reference_phase_id,
        planStartWeight: e.plan_start_weight,
      };
      // Wochenplan-Vorschau: gewertet wird die laufende Einheit, als waere sie
      // die Vorwoche - die Frage ist ja „was macht der Coach daraus". Anker ist
      // der Phasenanker, solange die Uebung in dieser Phase schon beendet
      // wurde; sonst das gerade bewegte Gewicht. In der Entlastung gibt es
      // keinen Rueckfall auf das bewegte Gewicht: die Entlastung wuerde sonst
      // von der schon entlasteten Last noch einmal heruntergerechnet.
      const anchor = planAnchor(ph.anchorPhaseId, ph.deload, {
        id: e.id,
        referenceWeight: e.reference_weight,
        referencePhaseId: e.reference_phase_id,
        planStartWeight: e.plan_start_weight,
        rm: e.rm,
      });
      const plan: PlanContext | null =
        ph.planWeek && ph.firstPlanWeek
          ? {
              week: ph.planWeek,
              prevWeek: ph.planWeek,
              startReps: ph.firstPlanWeek.reps,
              anchor: anchor ?? (ph.deload ? null : workWeight),
              deload: ph.deload,
              currentWeekEntry: null,
              previousWeekEntry: lastEntry,
              rm: e.rm,
            }
          : null;
      const { suggestion } = suggestWithBar(exo, {
        phaseFocus: ph.phaseFocus,
        lastEntry,
        prevEntry: prevEntryByExercise[e.id] ?? null,
        weightStep,
        bars,
        plates,
        dumbbells,
        repTarget: activeRepTarget(exo, ph.phaseRepTarget, hasPhase, plan),
        freeMode,
        loadFactor: ph.loadFactor,
        plan,
      });
      // Begleit-/Koerpergewichtsuebungen und freies Training rechnen nicht
      // progressiv - dort gibt es nichts zu bewerten, also auch kein Icon.
      if (suggestion.decision === "carry") return;
      out[ei] = {
        // Vordaten liegen hier immer vor - mindestens ein Satz ist abgehakt,
        // sonst waeren wir oben ausgestiegen.
        status: coachStatusFromSuggestion(suggestion, true),
        provisional: !isBlockComplete(entry),
      };
    });
    return out;
  }, [
    ready,
    workout,
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

  return { byEntry };
}
