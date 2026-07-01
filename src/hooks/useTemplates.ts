import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { TemplateRole, TemplateRow } from "@/schemas";

// Eine Uebung in der Vorlage mit ihrer Rolle und Reihenfolge. Die Rolle dient
// als reines Ordnungs-/Anzeigeraster (Haupt -> Assistenz -> Core) und hat keinen
// Einfluss auf Progression oder Journey-Faehigkeit.
export interface TemplateExerciseEntry {
  exerciseId: string;
  role: TemplateRole;
  position: number;
}

// Vorlage plus die geordnete Liste ihrer Uebungen. exerciseIds bleibt als reine
// Id-Liste erhalten (bestehende Nutzer unveraendert); exercises traegt zusaetzlich
// Rolle und Reihenfolge fuer Editor, Workout-Ansicht und aufgebaute Einheit.
export interface TemplateWithExercises extends TemplateRow {
  exerciseIds: string[];
  exercises: TemplateExerciseEntry[];
}

interface TemplateExerciseLink {
  exercise_id: string;
  role: TemplateRole;
  position: number;
}

// Workout-Vorlagen mit ihren Uebungen in Reihenfolge. Eine verschachtelte
// Abfrage holt template_exercises gleich mit; die Reihenfolge wird clientseitig
// nach position sortiert.
export function useTemplates() {
  const userId = useUserId();
  return useQuery({
    queryKey: ["templates", userId],
    enabled: userId !== null,
    queryFn: async (): Promise<TemplateWithExercises[]> => {
      const { data, error } = await supabase
        .from("templates")
        .select("*, template_exercises(exercise_id, role, position)")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<
        TemplateRow & { template_exercises: TemplateExerciseLink[] }
      >;
      return rows.map((row) => {
        const { template_exercises, ...template } = row;
        const exercises = (template_exercises ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map(
            (te): TemplateExerciseEntry => ({
              exerciseId: te.exercise_id,
              role: te.role,
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
