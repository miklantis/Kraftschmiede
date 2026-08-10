import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { SessionRow } from "@/schemas";
import type { HistorySessionInput } from "@/lib/history";

// Verlauf braucht – anders als die Trainings-Uebersicht – die volle Tiefe einer
// Einheit: jede Uebung mit ihren Saetzen. Diese Abfrage holt sessions samt
// verschachtelten session_exercises und deren sets in einem Zug; die Umformung
// in das anzeigefertige HistorySessionInput passiert hier, damit der View-Model-
// Hook und das reine history-Modul Supabase nicht kennen.

interface SetRowLite {
  kind: "warmup" | "work";
  reps: number | null;
  weight: number | null;
  duration_sec: number | null;
  score: number | null;
  adjusted: boolean;
  done: boolean;
  failed: boolean;
  met: boolean | null;
  target_reps: number | null;
  target_weight: number | null;
}

interface SessionExerciseLite {
  id: string;
  exercise_id: string | null;
  name: string | null;
  metric: "reps" | "duration" | null;
  position: number;
  tested_1rm: number | null;
  sets: SetRowLite[];
}

export function useSessionsDetailed() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.sessionsDetailed(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<HistorySessionInput[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "*, session_exercises(id, exercise_id, name, metric, position, tested_1rm, sets(kind, reps, weight, duration_sec, score, adjusted, done, failed, met, target_reps, target_weight))",
        )
        .eq("status", "done")
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as Array<
        SessionRow & { session_exercises: SessionExerciseLite[] }
      >;

      return rows.map((row) => ({
        id: row.id,
        date: row.date,
        type: row.type,
        templateId: row.template_id,
        skillId: row.skill_id,
        skillPhase: row.skill_phase,
        durationSec: row.duration_sec,
        minutes: row.minutes,
        notes: row.notes,
        exercises: (row.session_exercises ?? []).map((se) => ({
          sessionExerciseId: se.id,
          exerciseId: se.exercise_id,
          name: se.name,
          metric: se.metric,
          position: se.position,
          tested1RM: se.tested_1rm,
          sets: (se.sets ?? []).map((s) => ({
            kind: s.kind,
            reps: s.reps,
            weight: s.weight,
            durationSec: s.duration_sec,
            score: s.score,
            adjusted: s.adjusted,
            done: s.done,
            failed: s.failed,
            met: s.met,
            targetReps: s.target_reps,
            targetWeight: s.target_weight,
          })),
        })),
      }));
    },
  });
}
