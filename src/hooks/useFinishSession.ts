import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { journeyWeekForDate } from "@/engine/journey";
import { hasLoadPlanFocus } from "@/engine/weekPlan";
import { todayISO } from "@/lib/format";
import { asRmFormula } from "@/lib/rmTest";
import { buildFinishRows } from "@/lib/liveFinish";
import { katalogPatch } from "@/lib/katalogPatch";
import { toPlacementPhases, toPlacementSessions } from "@/lib/phaseContext";
import {
  FINISH_MUTATION_KEY,
  type ExercisePatch,
  type FinishPayload,
} from "@/lib/finishMutation";
import type { BodySnapshot } from "@/schemas";
import type { WorkoutSession } from "@/lib/liveSession";
import { useUserId } from "./useUserId";
import { useSettings } from "./useSettings";
import { useSessions } from "./useSessions";
import { useExercises } from "./useExercises";
import { useBodyLog } from "./useBodyLog";
import { useActiveJourney } from "./useJourney";

export interface UseFinishSession {
  /** Beendet die Einheit: Verlaufszeilen schreiben + Katalog fortschreiben.
   *  Bei fehlendem Netz wird der Schreibvorgang pausiert und spaeter nachgeholt. */
  finishWorkout: (session: WorkoutSession) => void;
  isSaving: boolean;
}

export function useFinishSession(): UseFinishSession {
  const userId = useUserId();
  const settingsQ = useSettings();
  const sessionsQ = useSessions();
  const exercisesQ = useExercises();
  const bodyQ = useBodyLog();
  const journeyQ = useActiveJourney();

  const mutation = useMutation<void, Error, FinishPayload>({
    mutationKey: FINISH_MUTATION_KEY,
  });

  const finishWorkout = useCallback(
    (session: WorkoutSession): void => {
      if (!userId) return;
      const date = todayISO();
      const rmFormula = asRmFormula(settingsQ.data?.rm_formula);
      const freqTarget = settingsQ.data?.weekly_frequency_target || 3;

      // Body-Snapshot: heutiger Befinden-Eintrag, sonst der letzte, sonst leer.
      const logs = bodyQ.data ?? [];
      const b = logs.find((x) => x.date === date) ?? logs[0] ?? null;
      const body: BodySnapshot = b
        ? {
            legs: b.legs,
            upper_body: b.upper_body,
            overall: b.overall,
            readiness: b.readiness,
            pain_flag: b.pain_flag,
            pain_note: b.pain_note,
            notes: "",
          }
        : { legs: 0, upper_body: 0, overall: 0, readiness: 3, pain_flag: false, pain_note: "", notes: "" };

      // Globale Journey-Woche einfrieren (nur Journey-Einheiten). Ob die Journey
      // damit durchlaufen ist, entscheidet hier nichts mehr: das haengt am
      // Kalender und wird beim naechsten App-Start geprueft (#240).
      let week: number | null = null;
      if (session.journeyId) {
        const journey = journeyQ.data;
        week = journeyWeekForDate(
          date,
          toPlacementSessions(sessionsQ.data ?? []),
          session.journeyId,
          freqTarget,
          // Die Phasen gehoeren zur Wochenrechnung (reine Testwoche); sie
          // passen nur, wenn die Einheit auch in der laufenden Journey liegt.
          journey && journey.id === session.journeyId
            ? toPlacementPhases(journey.phases)
            : [],
        );
      }

      const rows = buildFinishRows({
        session,
        userId,
        rmFormula,
        body,
        week,
        date,
        endedAt: Date.now(),
        newId: () => crypto.randomUUID(),
      });

      // Lief die Einheit in einer Phase mit Wochenplan? Dann fuehrt der Plan
      // die Hauptuebungen mit Kraftprofil, und deren Anker wird nachgezogen.
      const planPhase =
        (journeyQ.data?.phases ?? []).find(
          (p) =>
            p.id === session.phaseId && hasLoadPlanFocus(p.focus) && !!p.week_plan,
        ) ?? null;

      // Katalog-Patches: die Regel steht in katalogPatch, hier wird nur der
      // Katalog-Stand der Uebung dazugeholt.
      const byId = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));
      const exercisePatches: ExercisePatch[] = rows.exerciseUpdates.map((u) => {
        const exo = byId.get(u.exerciseId);
        const planned =
          planPhase && exo && exo.tier === "main" && exo.profile === "strength";
        return katalogPatch({
          exerciseId: u.exerciseId,
          workWeight: u.workWeight,
          tracksRm: exo ? exo.profile !== "bodyweight" : false,
          currentRm: exo?.rm ?? null,
          record1RM: u.record1RM,
          est1RM: u.est1RM,
          date,
          planAnchor: planned
            ? {
                phaseId: planPhase.id,
                plannedWeight: u.targetWeight,
                boundPhaseId: exo?.reference_phase_id ?? null,
              }
            : null,
        });
      });

      mutation.mutate({
        sessionRow: rows.sessionRow,
        exerciseRows: rows.exerciseRows,
        setRows: rows.setRows,
        exercisePatches,
      });
    },
    [
      userId,
      settingsQ.data,
      sessionsQ.data,
      exercisesQ.data,
      bodyQ.data,
      journeyQ.data,
      mutation,
    ],
  );

  return { finishWorkout, isSaving: mutation.isPending };
}
