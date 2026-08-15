// Sitzungsaufbau der Skill-Einheit (Phase 11, Lieferung 5). Reine Funktion ohne
// DB-/DOM-Bezug: nimmt die Skill-Definition und den Fortschritt als Daten herein
// und gibt die fertige Skill-Einheit heraus - 1:1 aus V1 live.js buildSkillLive.
// Die aktuelle Phase bestimmt die Engine (skillAdvice); je Phasen-Uebung werden
// so viele leere Ergebnis-Saetze angelegt, wie die Phase vorsieht. Die
// Zustandsbeschaffung (Definition, Fortschritt) macht der Hook useSkillLiveBuilder.

import { skillAdvice } from "@/engine/skills";
import type { SkillLiveExercise } from "./liveSession";

/** Eine Uebung einer Skill-Phase (Definition). */
export interface SkillBuildPhaseExercise {
  name: string;
  metric: "reps" | "duration";
  target: number;
  sets: number;
  tempo: string | null;
  /** Katalog-Uebung, falls verknuepft - sonst null (dann kein Link im Popup). */
  exerciseId: string | null;
}

/** Eine Phase eines Skills (Definition). */
export interface SkillBuildPhase {
  consecutiveSessions: number;
  equipment: string[];
  exercises: SkillBuildPhaseExercise[];
}

/** Skill-Definition in der Form, die der Aufbau braucht. */
export interface SkillBuildDef {
  id: string;
  name: string;
  phases: SkillBuildPhase[];
}

/** Fortschritt eines Skills (aus skill_progress, in Engine-Begriffe gebracht). */
export interface SkillBuildProgress {
  currentPhase: number;
  consecutiveCount: number;
  mastered: boolean;
}

export interface SkillBuildResult {
  skillId: string;
  skillName: string;
  phaseIndex: number;
  mastered: boolean;
  exercises: SkillLiveExercise[];
}

/** Baut die laufende Skill-Einheit aus Definition + Fortschritt. Null, wenn der
 *  Skill keine Phasen hat (defensiv). */
export function buildSkillLive(
  def: SkillBuildDef,
  progress: SkillBuildProgress,
): SkillBuildResult | null {
  const phases = def.phases ?? [];
  if (phases.length === 0) return null;

  const adv = skillAdvice(
    {
      phases: phases.map((p) => ({
        consecutiveSessions: p.consecutiveSessions,
        equipment: p.equipment,
        exercises: p.exercises.map((e) => ({
          metric: e.metric,
          target: e.target,
          sets: e.sets,
        })),
      })),
    },
    {
      currentPhase: progress.currentPhase,
      consecutiveCount: progress.consecutiveCount,
      mastered: progress.mastered,
    },
    [], // Equipment-Tor greift schon bei der Auswahl, nicht beim Aufbau
  );

  const phase = phases[adv.phaseIndex];
  if (!phase) return null;

  const exercises: SkillLiveExercise[] = phase.exercises.map((e) => ({
    name: e.name,
    metric: e.metric,
    target: e.target,
    tempo: e.tempo ?? null,
    exerciseId: e.exerciseId ?? null,
    sets: Array.from({ length: Math.max(1, e.sets) }, () => ({
      value: null,
      done: false,
      met: false,
    })),
    note: "",
  }));

  return {
    skillId: def.id,
    skillName: def.name,
    phaseIndex: adv.phaseIndex,
    mastered: adv.mastered,
    exercises,
  };
}
