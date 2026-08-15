import { useMemo } from "react";
import {
  buildHistoryModel,
  type HistoryModel,
  type HistoryRmTestInput,
} from "@/lib/history";
import { useSessionsDetailed } from "./useSessionsDetailed";
import { useExercises } from "./useExercises";
import { useTemplates } from "./useTemplates";
import { useSkills } from "./useSkills";
import { useAllRmTests } from "./useRmTests";

// Anzeigefertiges Verlaufsmodell: erledigte Einheiten als Liste (neueste zuerst)
// und als Datum->Punkte-Karte fuer den Kalender. Die Komponenten kennen weder
// Supabase noch die Aufbereitungslogik – die steckt im reinen history-Modul.
export function useHistory(): {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data: HistoryModel | null;
} {
  const sessionsQ = useSessionsDetailed();
  const exercisesQ = useExercises();
  const templatesQ = useTemplates();
  const skillsQ = useSkills();
  const rmTestsQ = useAllRmTests();

  const queries = [sessionsQ, exercisesQ, templatesQ, skillsQ, rmTestsQ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const data = useMemo<HistoryModel | null>(() => {
    if (isLoading || isError) return null;

    const sessions = sessionsQ.data ?? [];
    const exercises = exercisesQ.data ?? [];
    const templates = templatesQ.data ?? [];
    const skills = skillsQ.data ?? [];
    const rmTests: HistoryRmTestInput[] = (rmTestsQ.data ?? []).map((t) => ({
      id: t.id,
      date: t.date,
      exerciseId: t.exercise_id,
      weight: t.weight,
      reps: t.reps,
      estRm: t.est_rm,
      previousRm: t.previous_rm,
      notiz: t.notiz,
    }));

    const exName: Record<string, string> = {};
    exercises.forEach((e) => (exName[e.id] = e.name));
    const tplName: Record<string, string> = {};
    templates.forEach((t) => (tplName[t.id] = t.name));
    const skName: Record<string, string> = {};
    skills.forEach((s) => (skName[s.id] = s.name));

    return buildHistoryModel(
      sessions,
      {
        exerciseName: (id) => exName[id],
        templateName: (id) => tplName[id],
        skillName: (id) => skName[id],
      },
      rmTests,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    isError,
    sessionsQ.data,
    exercisesQ.data,
    templatesQ.data,
    skillsQ.data,
    rmTestsQ.data,
  ]);

  return { isLoading, isError, error, data };
}
