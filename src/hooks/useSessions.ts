import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { SessionRow } from "@/schemas";

// Einheit plus die enthaltenen Uebungs-Ids (aus session_exercises). Reicht fuer
// Platzierung (Datum/Status/Typ/Journey) und fuer das Coach-Ranking (welche
// Uebungen wann zuletzt trainiert wurden).
export interface SessionWithExercises extends SessionRow {
  exerciseIds: string[];
}

interface SessionExerciseLink {
  exercise_id: string | null;
}

export function useSessions() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.sessions(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<SessionWithExercises[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, session_exercises(exercise_id)")
        .order("date", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<
        SessionRow & { session_exercises: SessionExerciseLink[] }
      >;
      return rows.map((row) => {
        const { session_exercises, ...session } = row;
        const exerciseIds = (session_exercises ?? [])
          .map((se) => se.exercise_id)
          .filter((id): id is string => id !== null);
        return { ...session, exerciseIds };
      });
    },
  });
}
