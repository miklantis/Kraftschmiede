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

/** Fortschritts-Schreiben der skill_progress-Zeile. `isNew=true` legt die Zeile
 *  an (erste abgeschlossene Einheit eines noch nie trainierten Skills), sonst
 *  wird die bestehende Zeile (per id) fortgeschrieben. Fuer den Insert braucht
 *  es user_id und skill_id; die id ist dann clientseitig vergeben. */
export interface SkillProgressWrite {
  id: string;
  isNew?: boolean;
  userId?: string;
  skillId?: string;
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
