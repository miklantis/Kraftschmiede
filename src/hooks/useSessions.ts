import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
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
      const rows = await leseZeilen<
        SessionRow & { session_exercises: SessionExerciseLink[] }
      >({
        tabelle: "sessions",
        spalten: "*, session_exercises(exercise_id)",
        sortierung: [{ spalte: "date" }],
      });
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
