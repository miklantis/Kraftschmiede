// Naht zum Erfassungs-Speicher: die schmale Schnittstelle fuer die kurzen
// Schreibpfade, mit denen der Nutzer seinen eigenen Verlauf von Hand pflegt –
// das Tages-Befinden (body_log), einzelne Einheiten ausserhalb des gefuehrten
// Ablaufs (sessions: Yoga eintragen, Einheit loeschen) und die manuellen
// Eingriffe in den Skill-Fortschritt (skill_progress: Phase zurueck,
// zuruecksetzen). Ein Store fuer diese drei, weil es jeweils nur ein bis zwei
// Handgriffe sind und sie dieselbe Rolle haben: Eintraege des Nutzers am
// eigenen Verlauf.
//
// Abgrenzung zu `historyStore.ts`: dort liegt der gefuehrte Schreibpfad
// (Einheit beenden, Skill beenden, Einheit bearbeiten) mit seinen mehrstufigen
// Ablaeufen. Hier liegen die Handgriffe daneben, damit jene Naht schmal bleibt.
//
// Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb und ein
// Speicher im Arbeitsspeicher fuer Tests – damit ist der Schreibpfad automatisch
// pruefbar. Die Pruefung "lief der Schritt durch?" sitzt hier an genau einer
// Stelle (`must`), statt bei jedem Aufrufer.
//
// Vorbild und Form: `zeitraumStore.ts`, `compositionStore.ts`. Unterste
// Schicht: kennt nur Supabase und die Schema-Typen, niemals die Mutationen oder
// Hooks darueber.

import { supabase } from "@/lib/supabase";
import type {
  BodyLogInsert,
  SessionInsert,
  SkillLog,
  SkillProgressRow,
} from "@/schemas";

/** Zeile des Tages-Befindens: genau eine pro Nutzer und Tag. */
export type BefindenRowIns = BodyLogInsert;

/** Zeile einer Einheit (Id vergibt die Datenbank). */
export type EinheitRowIns = SessionInsert;

/** Aenderbare Felder eines Skill-Fortschritts bei einem manuellen Eingriff.
 *  Beide Eingriffe setzen denselben Satz Felder, deshalb ein fester Zuschnitt
 *  statt eines freien Patches. */
export interface SkillFortschrittPatch {
  current_phase: number;
  counter: number;
  mastered: boolean;
  log: SkillLog;
}

/** Schmale Schnittstelle fuer die Erfassungs-Schreibvorgaenge. Jede Methode
 *  kapselt genau einen Datenbank-Handgriff und wirft bei Fehler –
 *  Fehlerbehandlung an einem Ort. Welche Aktion welche Handgriffe ausloest,
 *  liegt beim Aufrufer (erfassungWrite), nicht hier. */
export interface ErfassungStore {
  /** Befinden des Tages anlegen oder ueberschreiben (eine Zeile je Tag). */
  upsertBefinden(row: BefindenRowIns): Promise<void>;
  insertEinheit(row: EinheitRowIns): Promise<void>;
  /** Einheit loeschen. Die Fremdschluessel stehen auf ON DELETE CASCADE, die
   *  Datenbank raeumt session_exercises und sets selbst mit weg. */
  deleteEinheit(id: string): Promise<void>;
  /** Bestehenden Skill-Fortschritt lesen, oder null wenn es noch keinen gibt. */
  findSkillFortschritt(skillId: string): Promise<SkillProgressRow | null>;
  updateSkillFortschritt(
    id: string,
    patch: SkillFortschrittPatch,
  ): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseErfassungStore: ErfassungStore = {
  async upsertBefinden(row) {
    must(
      await supabase
        .from("body_log")
        .upsert(row, { onConflict: "user_id,date" }),
    );
  },
  async insertEinheit(row) {
    must(await supabase.from("sessions").insert(row));
  },
  async deleteEinheit(id) {
    must(await supabase.from("sessions").delete().eq("id", id));
  },
  async findSkillFortschritt(skillId) {
    const { data, error } = await supabase
      .from("skill_progress")
      .select("*")
      .eq("skill_id", skillId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as SkillProgressRow | null) ?? null;
  },
  async updateSkillFortschritt(id, patch) {
    must(await supabase.from("skill_progress").update(patch).eq("id", id));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe. */
export interface MemoryErfassungLog {
  befinden: BefindenRowIns[];
  einheitenInsert: EinheitRowIns[];
  einheitenDeleted: string[];
  skillPatches: Array<{ id: string; patch: SkillFortschrittPatch }>;
}

/** Erzeugt einen Erfassungs-Speicher, der nichts schreibt, sondern jeden
 *  Handgriff protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank.
 *  Der vorhandene Skill-Fortschritt wird als Ausgangslage hereingereicht;
 *  ohne Eintrag verhaelt sich der Speicher wie ein Skill ohne Fortschritt. */
export function createMemoryErfassungStore(
  fortschritt: Record<string, SkillProgressRow> = {},
): {
  store: ErfassungStore;
  log: MemoryErfassungLog;
} {
  const log: MemoryErfassungLog = {
    befinden: [],
    einheitenInsert: [],
    einheitenDeleted: [],
    skillPatches: [],
  };
  const store: ErfassungStore = {
    async upsertBefinden(row) {
      log.befinden.push(row);
    },
    async insertEinheit(row) {
      log.einheitenInsert.push(row);
    },
    async deleteEinheit(id) {
      log.einheitenDeleted.push(id);
    },
    async findSkillFortschritt(skillId) {
      return fortschritt[skillId] ?? null;
    },
    async updateSkillFortschritt(id, patch) {
      log.skillPatches.push({ id, patch });
    },
  };
  return { store, log };
}
