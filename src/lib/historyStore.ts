// Naht zum Verlauf-Speicher: die schmale Schnittstelle, ueber die alle drei
// Verlauf-Schreiber (Kraft beenden, Skill beenden, Einheit bearbeiten) ihre
// Datenbank-Handgriffe abspielen. Zwei Gesichter dieser Naht: der echte
// Supabase-Speicher im Betrieb und ein Speicher im Arbeitsspeicher fuer Tests –
// damit ist der Schreibpfad erstmals automatisch pruefbar. Die Pruefung "lief
// der Schritt durch?" sitzt hier an genau einer Stelle (`must`), statt verstreut
// bei jedem Aufrufer.
//
// Unterste Schicht: kennt nur Supabase und die Schema-Typen, niemals die
// Mutationen oder Hooks darueber. Der einzige Bezug nach oben ist der reine
// Typ SkillProgressWrite (zur Laufzeit geloescht), damit der Modulgraph
// kreisfrei bleibt.

import { supabase } from "@/lib/supabase";
import type {
  SessionInsert,
  SessionExerciseInsert,
  SetInsert,
} from "@/schemas";
import type { SkillProgressWrite } from "./finishSkillMutation";

type SessionRowIns = SessionInsert & { id: string };
type ExerciseRowIns = SessionExerciseInsert & { id: string };
type SetRowIns = SetInsert & { id: string };

/** Schmale Schnittstelle fuer alle Verlauf-Schreibvorgaenge. Jede Methode kapselt
 *  genau einen Datenbank-Handgriff und wirft bei Fehler – Fehlerbehandlung an
 *  einem Ort. Reihenfolge und Bedingungen (leere Listen ueberspringen) liegen
 *  beim Aufrufer (historyWrite), nicht hier. */
export interface HistoryStore {
  insertSession(row: SessionRowIns): Promise<void>;
  insertSessionExercises(rows: ExerciseRowIns[]): Promise<void>;
  insertSets(rows: SetRowIns[]): Promise<void>;
  /** Arbeitssaetze einer Uebung ersetzen: vorhandene work-Saetze loeschen, dann
   *  die neuen einfuegen. Aufwaermsaetze bleiben unberuehrt. */
  replaceWorkSets(sessionExerciseId: string, rows: SetRowIns[]): Promise<void>;
  /** Einheit-Felder aktualisieren (Aufrufer reicht nur die gesetzten Felder). */
  updateSession(id: string, patch: Record<string, unknown>): Promise<void>;
  /** tested_1rm einer session_exercises-Zeile setzen. */
  setTested1RM(sessionExerciseId: string, value: number | null): Promise<void>;
  /** Katalog-Zeile fortschreiben (Arbeitsgewicht, optional 1RM). */
  updateExercise(id: string, patch: Record<string, unknown>): Promise<void>;
  /** Skill-Fortschritt schreiben: anlegen (isNew) oder fortschreiben. */
  writeSkillProgress(write: SkillProgressWrite): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird (zuvor je Aufrufer einzeln). */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseHistoryStore: HistoryStore = {
  async insertSession(row) {
    must(await supabase.from("sessions").insert(row));
  },
  async insertSessionExercises(rows) {
    must(await supabase.from("session_exercises").insert(rows));
  },
  async insertSets(rows) {
    must(await supabase.from("sets").insert(rows));
  },
  async replaceWorkSets(sessionExerciseId, rows) {
    must(
      await supabase
        .from("sets")
        .delete()
        .eq("session_exercise_id", sessionExerciseId)
        .eq("kind", "work"),
    );
    if (rows.length) must(await supabase.from("sets").insert(rows));
  },
  async updateSession(id, patch) {
    must(await supabase.from("sessions").update(patch).eq("id", id));
  },
  async setTested1RM(sessionExerciseId, value) {
    must(
      await supabase
        .from("session_exercises")
        .update({ tested_1rm: value })
        .eq("id", sessionExerciseId),
    );
  },
  async updateExercise(id, patch) {
    must(await supabase.from("exercises").update(patch).eq("id", id));
  },
  async writeSkillProgress(write) {
    if (write.isNew) {
      must(
        await supabase.from("skill_progress").insert({
          id: write.id,
          user_id: write.userId,
          skill_id: write.skillId,
          active: true,
          current_phase: write.currentPhase,
          counter: write.consecutiveCount,
          mastered: write.mastered,
          log: [],
        }),
      );
      return;
    }
    must(
      await supabase
        .from("skill_progress")
        .update({
          current_phase: write.currentPhase,
          counter: write.consecutiveCount,
          mastered: write.mastered,
        })
        .eq("id", write.id),
    );
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe. */
export interface MemoryHistoryLog {
  sessions: SessionRowIns[];
  sessionExercises: ExerciseRowIns[];
  sets: SetRowIns[];
  replacedWorkSets: Array<{ sessionExerciseId: string; rows: SetRowIns[] }>;
  sessionPatches: Array<{ id: string; patch: Record<string, unknown> }>;
  tested1RM: Array<{ sessionExerciseId: string; value: number | null }>;
  exercisePatches: Array<{ id: string; patch: Record<string, unknown> }>;
  skillProgress: SkillProgressWrite[];
}

/** Erzeugt einen Verlauf-Speicher, der nichts schreibt, sondern jeden Handgriff
 *  protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank. */
export function createMemoryHistoryStore(): {
  store: HistoryStore;
  log: MemoryHistoryLog;
} {
  const log: MemoryHistoryLog = {
    sessions: [],
    sessionExercises: [],
    sets: [],
    replacedWorkSets: [],
    sessionPatches: [],
    tested1RM: [],
    exercisePatches: [],
    skillProgress: [],
  };
  const store: HistoryStore = {
    async insertSession(row) {
      log.sessions.push(row);
    },
    async insertSessionExercises(rows) {
      log.sessionExercises.push(...rows);
    },
    async insertSets(rows) {
      log.sets.push(...rows);
    },
    async replaceWorkSets(sessionExerciseId, rows) {
      log.replacedWorkSets.push({ sessionExerciseId, rows });
    },
    async updateSession(id, patch) {
      log.sessionPatches.push({ id, patch });
    },
    async setTested1RM(sessionExerciseId, value) {
      log.tested1RM.push({ sessionExerciseId, value });
    },
    async updateExercise(id, patch) {
      log.exercisePatches.push({ id, patch });
    },
    async writeSkillProgress(write) {
      log.skillProgress.push(write);
    },
  };
  return { store, log };
}
