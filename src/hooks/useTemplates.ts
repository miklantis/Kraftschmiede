import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { TemplateRow } from "@/schemas";

// Eine Uebung in der Vorlage mit ihrer Reihenfolge.
export interface TemplateExerciseEntry {
  exerciseId: string;
  position: number;
}

// Vorlage plus die geordnete Liste ihrer Uebungen. exerciseIds bleibt als reine
// Id-Liste erhalten (bestehende Nutzer unveraendert); exercises traegt zusaetzlich
// die Reihenfolge fuer Editor, Workout-Ansicht und aufgebaute Einheit.
export interface TemplateWithExercises extends TemplateRow {
  exerciseIds: string[];
  exercises: TemplateExerciseEntry[];
}

interface TemplateExerciseLink {
  exercise_id: string;
  position: number;
}

// Workout-Vorlagen mit ihren Uebungen in Reihenfolge. Eine verschachtelte
// Abfrage holt template_exercises gleich mit; die Reihenfolge wird clientseitig
// nach position sortiert.
export function useTemplates() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.templates(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<TemplateWithExercises[]> => {
      const rows = await leseZeilen<
        TemplateRow & { template_exercises: TemplateExerciseLink[] }
      >({
        tabelle: "templates",
        spalten: "*, template_exercises(exercise_id, position)",
        sortierung: [{ spalte: "position" }],
      });
      return rows.map((row) => {
        const { template_exercises, ...template } = row;
        const exercises = (template_exercises ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(
            (te): TemplateExerciseEntry => ({
              exerciseId: te.exercise_id,
              position: te.position,
            }),
          );
        return {
          ...template,
          exercises,
          exerciseIds: exercises.map((e) => e.exerciseId),
        };
      });
    },
  });
}
