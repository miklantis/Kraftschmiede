import { useCallback } from "react";
import { buildSkillLive, type SkillBuildResult } from "@/lib/skillLiveBuild";
import { useSkills, useSkillProgress } from "./useSkills";

// Stellt die laufende Skill-Einheit aus der Definition und dem Fortschritt
// zusammen (Phase 11, Lieferung 5). Buendelt die Daten-Hooks und ruft den reinen,
// getesteten Aufbau (lib/skillLiveBuild). Die Trainingsseite ruft nur
// buildSkill(skillId); die Komponenten kennen weder Supabase noch die Engine.

export interface UseSkillLiveBuilder {
  ready: boolean;
  /** Baut die Skill-Einheit; null, wenn Definition/Phase fehlen. */
  buildSkill: (skillId: string) => SkillBuildResult | null;
}

export function useSkillLiveBuilder(): UseSkillLiveBuilder {
  const skillsQ = useSkills();
  const progressQ = useSkillProgress();

  const ready = skillsQ.data != null && progressQ.data != null;

  const buildSkill = useCallback(
    (skillId: string): SkillBuildResult | null => {
      const def = (skillsQ.data ?? []).find((s) => s.id === skillId);
      if (!def) return null;
      const row = (progressQ.data ?? []).find((p) => p.skill_id === skillId);
      const progress = {
        currentPhase: row?.current_phase ?? 0,
        consecutiveCount: row?.counter ?? 0,
        mastered: row?.mastered ?? false,
      };
      return buildSkillLive(
        {
          id: def.id,
          name: def.name,
          phases: def.phases.map((p) => ({
            consecutiveSessions: p.consecutiveSessions,
            equipment: p.equipment,
            exercises: p.exercises.map((e) => ({
              name: e.name,
              metric: e.metric === "duration" ? "duration" : "reps",
              target: e.target,
              sets: e.sets,
              tempo: e.tempo,
              exerciseId: e.exerciseId,
            })),
          })),
        },
        progress,
      );
    },
    [skillsQ.data, progressQ.data],
  );

  return { ready, buildSkill };
}
