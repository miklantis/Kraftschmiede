import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { todayISO } from "@/lib/format";
import { buildSkillFinishRows } from "@/lib/skillFinish";
import {
  FINISH_SKILL_MUTATION_KEY,
  type FinishSkillPayload,
} from "@/lib/finishSkillMutation";
import type { SkillSession } from "@/lib/liveSession";
import { useUserId } from "./useUserId";
import { useSkills, useSkillProgress } from "./useSkills";

// Beendet die laufende Skill-Einheit: schreibt die abgehakten Saetze normalisiert
// in den Verlauf und schreibt den Fortschritt fort (Konsekutiv-Logik). Bei
// fehlendem Netz pausiert die Mutation und wird spaeter nachgeholt (wie beim
// Kraft-Workout). Plandaten (Phasen-Uebungen, Aufstiegsschwelle, Phasenanzahl)
// und der Fortschritt kommen aus den Skill-Hooks.

export interface UseFinishSkill {
  finishSkill: (session: SkillSession) => void;
  isSaving: boolean;
}

export function useFinishSkill(): UseFinishSkill {
  const userId = useUserId();
  const skillsQ = useSkills();
  const progressQ = useSkillProgress();

  const mutation = useMutation<void, Error, FinishSkillPayload>({
    mutationKey: FINISH_SKILL_MUTATION_KEY,
  });

  const finishSkill = useCallback(
    (session: SkillSession): void => {
      if (!userId) return;
      const def = (skillsQ.data ?? []).find((s) => s.id === session.skillId);
      if (!def) return;
      const phase = def.phases[session.phaseIndex];
      if (!phase) return;

      const row = (progressQ.data ?? []).find(
        (p) => p.skill_id === session.skillId,
      );
      const progress = {
        currentPhase: row?.current_phase ?? session.phaseIndex,
        consecutiveCount: row?.counter ?? 0,
        mastered: row?.mastered ?? false,
      };

      const rows = buildSkillFinishRows({
        session,
        userId,
        planExercises: phase.exercises.map((e) => ({
          metric: e.metric === "duration" ? "duration" : "reps",
          target: e.target,
          sets: e.sets,
        })),
        consecutiveSessions: phase.consecutiveSessions,
        phasesLength: def.phases.length,
        progress,
        date: todayISO(),
        endedAt: Date.now(),
        newId: () => crypto.randomUUID(),
      });

      mutation.mutate({
        sessionRow: rows.sessionRow,
        exerciseRows: rows.exerciseRows,
        setRows: rows.setRows,
        progressWrite: row
          ? {
              id: row.id,
              isNew: false,
              currentPhase: rows.progressPatch.currentPhase,
              consecutiveCount: rows.progressPatch.consecutiveCount,
              mastered: rows.progressPatch.mastered,
            }
          : {
              id: crypto.randomUUID(),
              isNew: true,
              userId,
              skillId: session.skillId,
              currentPhase: rows.progressPatch.currentPhase,
              consecutiveCount: rows.progressPatch.consecutiveCount,
              mastered: rows.progressPatch.mastered,
            },
      });
    },
    [userId, skillsQ.data, progressQ.data, mutation],
  );

  return { finishSkill, isSaving: mutation.isPending };
}
