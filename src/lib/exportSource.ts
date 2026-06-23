import { supabase } from "@/lib/supabase";
import type {
  RawExportData,
  RawSession,
  RawSessionExercise,
  RawSet,
  Row,
} from "@/lib/exportData";

// Eine Quelle fuer alle Export-Wege: holt den kompletten Bestand des Nutzers
// (RLS schraenkt automatisch auf die eigene user_id ein). Bewusst kein Hook,
// damit Voll-Export und Coach-Export dieselbe Abfrage teilen.

async function selectAll(table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

export async function fetchAllData(): Promise<RawExportData> {
  const [
    bars,
    plates,
    kettlebells,
    equipment,
    exercises,
    exerciseMuscles,
    templates,
    templateExercises,
    journeyTemplates,
    journeyTemplatePhases,
    skills,
    skillPhases,
    skillPhaseExercises,
    skillPhaseEquipment,
    journeys,
    phases,
    sessions,
    sessionExercises,
    sets,
    skillProgress,
    bodyLog,
    composition,
    settingsRows,
  ] = await Promise.all([
    selectAll("inventory_bars"),
    selectAll("inventory_plates"),
    selectAll("inventory_kettlebells"),
    selectAll("inventory_equipment"),
    selectAll("exercises"),
    selectAll("exercise_muscles"),
    selectAll("templates"),
    selectAll("template_exercises"),
    selectAll("journey_templates"),
    selectAll("journey_template_phases"),
    selectAll("skills"),
    selectAll("skill_phases"),
    selectAll("skill_phase_exercises"),
    selectAll("skill_phase_equipment"),
    selectAll("journeys"),
    selectAll("phases"),
    selectAll("sessions"),
    selectAll("session_exercises"),
    selectAll("sets"),
    selectAll("skill_progress"),
    selectAll("body_log"),
    selectAll("composition"),
    selectAll("settings"),
  ]);

  return {
    bars,
    plates,
    kettlebells,
    equipment,
    exercises,
    exerciseMuscles,
    templates,
    templateExercises,
    journeyTemplates,
    journeyTemplatePhases,
    skills,
    skillPhases,
    skillPhaseExercises,
    skillPhaseEquipment,
    journeys,
    phases,
    sessions: sessions as RawSession[],
    sessionExercises: sessionExercises as RawSessionExercise[],
    sets: sets as RawSet[],
    skillProgress,
    bodyLog,
    composition,
    settings: settingsRows[0] ?? null,
  };
}
