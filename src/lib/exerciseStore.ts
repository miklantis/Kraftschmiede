// Naht zum Uebungs-Speicher: die schmale Schnittstelle, ueber die alle
// Schreiber rund um den Uebungskatalog ihre Datenbank-Handgriffe abspielen –
// Uebungs-Meilensteine (exercise_milestones), 1RM-Tests (rm_tests) und die
// Katalog-Pflege selbst (exercises). Ein Store fuer die drei Tabellen, weil sie
// fachlich denselben Bereich betreffen: der 1RM-Test schreibt in einem Zug Test
// und Katalog, die Meilensteine haengen am 1RM derselben Uebung.
//
// Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb und ein
// Speicher im Arbeitsspeicher fuer Tests – damit ist der Schreibpfad automatisch
// pruefbar. Die Pruefung "lief der Schritt durch?" sitzt hier an genau einer
// Stelle (`must`), statt bei jedem Aufrufer.
//
// Vorbild und Form: `zeitraumStore.ts` und `compositionStore.ts`. Unterste
// Schicht: kennt nur Supabase und die Schema-Typen, niemals die Mutationen oder
// Hooks darueber.

import { supabase } from "@/lib/supabase";
import type { ExerciseMilestoneInsert, RmTestInsert } from "@/schemas";

/** Zeile beim Anlegen eines Uebungs-Meilensteins. */
export type UebungMeilensteinRowIns = ExerciseMilestoneInsert;

/** Aenderbare Felder eines Uebungs-Meilensteins. Uebung und Nutzer-Kennung
 *  stehen beim Anlegen fest und werden nie nachtraeglich umgeschrieben; das
 *  Erreichen-Datum laeuft ueber den eigenen Handgriff `markMeilensteinAchieved`. */
export interface UebungMeilensteinPatch {
  name: string;
  target_rm: number;
}

/** Zeile beim Anlegen eines 1RM-Tests. */
export type RmTestRowIns = RmTestInsert;

/** Nachtraeglich aenderbares Feld eines 1RM-Tests: nur die Freitext-Notiz. Die
 *  Messwerte selbst bleiben unangetastet – ein Test wird nicht umgeschrieben,
 *  sondern hoechstens geloescht und neu gemacht. */
export interface RmTestPatch {
  notiz: string;
}

/** Die Felder des Uebungskatalogs, die von diesem Bereich geschrieben werden:
 *  der Rekord samt Beleg-Datum und Veralten-Kennzeichen (1RM-Test) sowie die im
 *  "Uebung anpassen"-Popup gepflegten Werte. Bewusst genau diese Felder – der
 *  Katalog wird von hier aus nicht breiter angefasst. */
export interface UebungPatch {
  rm?: number | null;
  rm_as_of?: string | null;
  rm_stale?: boolean;
  work_weight?: number;
  rep_range_min?: number;
  rep_range_max?: number;
}

/** Schmale Schnittstelle fuer alle Schreibvorgaenge rund um den Uebungskatalog.
 *  Jede Methode kapselt genau einen Datenbank-Handgriff und wirft bei Fehler –
 *  Fehlerbehandlung an einem Ort. Welche Aktion welche Handgriffe in welcher
 *  Reihenfolge ausloest, liegt beim Aufrufer (exerciseWrite), nicht hier. */
export interface ExerciseStore {
  insertMeilenstein(row: UebungMeilensteinRowIns): Promise<void>;
  updateMeilenstein(id: string, patch: UebungMeilensteinPatch): Promise<void>;
  deleteMeilenstein(id: string): Promise<void>;
  /** Erreichen-Datum stempeln, aber nur solange keines steht – idempotent, der
   *  Guard sitzt in der Abfrage selbst und ueberschreibt kein aelteres Datum. */
  markMeilensteinAchieved(id: string, date: string): Promise<void>;
  insertRmTest(row: RmTestRowIns): Promise<void>;
  updateRmTest(id: string, patch: RmTestPatch): Promise<void>;
  deleteRmTest(id: string): Promise<void>;
  updateUebung(id: string, patch: UebungPatch): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseExerciseStore: ExerciseStore = {
  async insertMeilenstein(row) {
    must(await supabase.from("exercise_milestones").insert(row));
  },
  async updateMeilenstein(id, patch) {
    must(await supabase.from("exercise_milestones").update(patch).eq("id", id));
  },
  async deleteMeilenstein(id) {
    must(await supabase.from("exercise_milestones").delete().eq("id", id));
  },
  async markMeilensteinAchieved(id, date) {
    must(
      await supabase
        .from("exercise_milestones")
        .update({ achieved_at: date })
        .eq("id", id)
        .is("achieved_at", null),
    );
  },
  async insertRmTest(row) {
    must(await supabase.from("rm_tests").insert(row));
  },
  async updateRmTest(id, patch) {
    must(await supabase.from("rm_tests").update(patch).eq("id", id));
  },
  async deleteRmTest(id) {
    must(await supabase.from("rm_tests").delete().eq("id", id));
  },
  async updateUebung(id, patch) {
    must(await supabase.from("exercises").update(patch).eq("id", id));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe, je Bereich
 *  getrennt. `folge` haelt zusaetzlich die Reihenfolge aller Handgriffe fest –
 *  entscheidend beim 1RM-Test, der erst den Test und dann den Katalog schreibt. */
export interface MemoryExerciseLog {
  meilensteinInserted: UebungMeilensteinRowIns[];
  meilensteinPatches: Array<{ id: string; patch: UebungMeilensteinPatch }>;
  meilensteinDeleted: string[];
  meilensteinAchieved: Array<{ id: string; date: string }>;
  rmTestInserted: RmTestRowIns[];
  rmTestPatches: Array<{ id: string; patch: RmTestPatch }>;
  rmTestDeleted: string[];
  uebungPatches: Array<{ id: string; patch: UebungPatch }>;
  folge: string[];
}

/** Erzeugt einen Uebungs-Speicher, der nichts schreibt, sondern jeden Handgriff
 *  protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank. */
export function createMemoryExerciseStore(): {
  store: ExerciseStore;
  log: MemoryExerciseLog;
} {
  const log: MemoryExerciseLog = {
    meilensteinInserted: [],
    meilensteinPatches: [],
    meilensteinDeleted: [],
    meilensteinAchieved: [],
    rmTestInserted: [],
    rmTestPatches: [],
    rmTestDeleted: [],
    uebungPatches: [],
    folge: [],
  };
  const store: ExerciseStore = {
    async insertMeilenstein(row) {
      log.meilensteinInserted.push(row);
      log.folge.push("insertMeilenstein");
    },
    async updateMeilenstein(id, patch) {
      log.meilensteinPatches.push({ id, patch });
      log.folge.push("updateMeilenstein");
    },
    async deleteMeilenstein(id) {
      log.meilensteinDeleted.push(id);
      log.folge.push("deleteMeilenstein");
    },
    async markMeilensteinAchieved(id, date) {
      log.meilensteinAchieved.push({ id, date });
      log.folge.push("markMeilensteinAchieved");
    },
    async insertRmTest(row) {
      log.rmTestInserted.push(row);
      log.folge.push("insertRmTest");
    },
    async updateRmTest(id, patch) {
      log.rmTestPatches.push({ id, patch });
      log.folge.push("updateRmTest");
    },
    async deleteRmTest(id) {
      log.rmTestDeleted.push(id);
      log.folge.push("deleteRmTest");
    },
    async updateUebung(id, patch) {
      log.uebungPatches.push({ id, patch });
      log.folge.push("updateUebung");
    },
  };
  return { store, log };
}
