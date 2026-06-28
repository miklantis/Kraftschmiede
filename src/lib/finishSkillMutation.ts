// Skill-Einheit beenden: wie die Kraft-Mutation (finishMutation) ein
// registrierter Mutations-Default, damit ein ohne Netz pausierter
// Speichervorgang den App-Neustart uebersteht und automatisch nachgeschickt
// wird (resumePausedMutations in main.tsx). Kennung (FINISH_SKILL_MUTATION_KEY)
// und Registrier-Reihenfolge bleiben dafuer stabil.
//
// Das eigentliche Schreiben liegt im gemeinsamen Schreib-Baustein
// (historyWrite.writeFinishSkill) ueber der Naht HistoryStore.

import type { QueryClient } from "@tanstack/react-query";
import type {
  SessionInsert,
  SessionExerciseInsert,
  SetInsert,
} from "@/schemas";
import { supabaseHistoryStore } from "./historyStore";
import { writeFinishSkill, HISTORY_INVALIDATE } from "./historyWrite";

export const FINISH_SKILL_MUTATION_KEY = ["finishSkill"] as const;

/** Fortschritts-Update der skill_progress-Zeile (id schon bekannt). Null, wenn
 *  keine Zeile existiert (sollte bei aktivem Skill nicht vorkommen). */
export interface SkillProgressWrite {
  id: string;
  currentPhase: number;
  consecutiveCount: number;
  mastered: boolean;
}

export interface FinishSkillPayload {
  sessionRow: SessionInsert & { id: string };
  exerciseRows: Array<SessionExerciseInsert & { id: string }>;
  setRows: Array<SetInsert & { id: string }>;
  progressWrite: SkillProgressWrite | null;
}

/** Default-mutationFn + Auffrischung registrieren. Greift auch fuer nach einem
 *  Neustart fortgesetzte (pausierte) Mutationen. */
export function registerFinishSkillMutation(qc: QueryClient): void {
  qc.setMutationDefaults(FINISH_SKILL_MUTATION_KEY, {
    mutationFn: (vars: unknown) =>
      writeFinishSkill(supabaseHistoryStore, vars as FinishSkillPayload),
    onSuccess: () => {
      for (const key of HISTORY_INVALIDATE.finishSkill) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
