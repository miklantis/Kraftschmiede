import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { SkillProgressRow } from "@/schemas";
import type { Metric } from "@/schemas/shared";

// Skill-Definition in einer fuer die Engine (skillAdvice) passenden Form:
// Phasen mit Equipment-Toren (als keys), Aufstiegsschwelle und Uebungen.
export interface SkillPhaseAssembled {
  id: string;
  label: string;
  equipment: string[];
  consecutiveSessions: number;
  exercises: Array<{
    name: string;
    metric: Metric;
    target: number;
    sets: number;
    tempo: string | null;
  }>;
}

export interface SkillDefAssembled {
  id: string;
  key: string | null;
  name: string;
  phases: SkillPhaseAssembled[];
}

interface SkillPhaseExerciseLink {
  name: string;
  metric: Metric;
  target: number;
  sets: number;
  tempo: string | null;
  position: number;
}

interface SkillPhaseEquipmentLink {
  equipment_key: string;
}

interface SkillPhaseLink {
  id: string;
  label: string;
  consecutive_sessions: number;
  position: number;
  skill_phase_exercises: SkillPhaseExerciseLink[];
  skill_phase_equipment: SkillPhaseEquipmentLink[];
}

interface SkillLink {
  id: string;
  key: string | null;
  name: string;
  position: number;
  skill_phases: SkillPhaseLink[];
}

// Alle Skill-Definitionen samt Phasen, Phasen-Uebungen und Equipment-Toren.
export function useSkills() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.skills(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<SkillDefAssembled[]> => {
      const { data, error } = await supabase
        .from("skills")
        .select(
          "id, key, name, position, skill_phases(id, label, consecutive_sessions, position, skill_phase_exercises(name, metric, target, sets, tempo, position), skill_phase_equipment(equipment_key))",
        )
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as SkillLink[];
      return rows.map((skill) => ({
        id: skill.id,
        key: skill.key,
        name: skill.name,
        phases: (skill.skill_phases ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((phase) => ({
            id: phase.id,
            label: phase.label,
            consecutiveSessions: phase.consecutive_sessions,
            equipment: (phase.skill_phase_equipment ?? []).map(
              (e) => e.equipment_key,
            ),
            exercises: (phase.skill_phase_exercises ?? [])
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((ex) => ({
                name: ex.name,
                metric: ex.metric,
                target: ex.target,
                sets: ex.sets,
                tempo: ex.tempo,
              })),
          })),
      }));
    },
  });
}

// Fortschritt je Skill (aktiv, aktuelle Phase, Konsekutiv-Zaehler, gemeistert).
export function useSkillProgress() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.skillProgress(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<SkillProgressRow[]> => {
      const { data, error } = await supabase.from("skill_progress").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as SkillProgressRow[];
    },
  });
}
