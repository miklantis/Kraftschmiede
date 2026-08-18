import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { completesJourney, journeyWeekForDate } from "@/engine/journey";
import { todayISO } from "@/lib/format";
import { asRmFormula } from "@/lib/rmTest";
import { buildFinishRows } from "@/lib/liveFinish";
import { katalogPatch } from "@/lib/katalogPatch";
import { toPlacementSessions } from "@/lib/phaseContext";
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
import { notifyJourneyDone } from "@/lib/journeyDone";

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

      // Globale Journey-Woche einfrieren (nur Journey-Einheiten). Im selben
      // Zug pruefen, ob diese Einheit das Pensum der letzten Journey-Woche
      // erfuellt und die Journey damit durchlaufen ist.
      let week: number | null = null;
      let journeyArchive: { journeyId: string; endDate: string } | undefined;
      if (session.journeyId) {
        const sessions = toPlacementSessions(sessionsQ.data ?? []);
        week = journeyWeekForDate(date, sessions, session.journeyId, freqTarget);
        const journey = journeyQ.data;
        if (
          journey &&
          journey.id === session.journeyId &&
          completesJourney(
            { id: journey.id, phases: journey.phases },
            sessions,
            freqTarget,
            date,
          )
        ) {
          journeyArchive = { journeyId: journey.id, endDate: date };
        }
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

      // Katalog-Patches: die Regel steht in katalogPatch, hier wird nur der
      // Katalog-Stand der Uebung dazugeholt.
      const byId = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));
      const exercisePatches: ExercisePatch[] = rows.exerciseUpdates.map((u) => {
        const exo = byId.get(u.exerciseId);
        return katalogPatch({
          exerciseId: u.exerciseId,
          workWeight: u.workWeight,
          tracksRm: exo ? exo.profile !== "bodyweight" : false,
          currentRm: exo?.rm ?? null,
          record1RM: u.record1RM,
          est1RM: u.est1RM,
          date,
        });
      });

      mutation.mutate({
        sessionRow: rows.sessionRow,
        exerciseRows: rows.exerciseRows,
        setRows: rows.setRows,
        exercisePatches,
        journeyArchive,
      });

      // Meldung anstossen, sobald das Schreib-Paket abgeschickt ist. Der Hinweis
      // haengt an der Entscheidung, nicht am Netz: offline wird die Journey
      // spaeter archiviert, fuer den Nutzer ist sie jetzt durchlaufen.
      if (journeyArchive && journeyQ.data) {
        notifyJourneyDone(journeyQ.data.name);
      }
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
