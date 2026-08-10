// Naht zum Messungs-Speicher: die schmale Schnittstelle, ueber die die
// Schreiber der Koerpermessungen (composition) und der Mess-Meilensteine
// (composition_milestones) ihre Datenbank-Handgriffe abspielen. Beide Bereiche
// teilen sich eine Naht, weil sie fachlich zusammengehoeren (Koerperwerte samt
// ihrer Richtwerte) und in derselben Ansicht gepflegt werden.
//
// Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb und ein
// Speicher im Arbeitsspeicher fuer Tests – damit ist der Schreibpfad automatisch
// pruefbar. Die Pruefung "lief der Schritt durch?" sitzt hier an genau einer
// Stelle (`must`), statt bei jedem Aufrufer.
//
// Vorbild und Form: `zeitraumStore.ts`. Unterste Schicht: kennt nur Supabase und
// die Schema-Typen, niemals die Mutationen oder Hooks darueber.

import { supabase } from "@/lib/supabase";
import type { CompositionInsert, CompositionMilestoneInsert } from "@/schemas";

/** Zeile beim Anlegen einer Messung: Datum, Werte und Nutzer-Kennung. */
export type MessungRowIns = CompositionInsert;

/** Aenderbare Felder einer Messung – die Nutzer-Kennung wandert nie mit. */
export type MessungPatch = Omit<CompositionInsert, "user_id">;

/** Zeile beim Anlegen eines Mess-Meilensteins. */
export type MeilensteinRowIns = CompositionMilestoneInsert;

/** Aenderbare Felder eines Mess-Meilensteins. Metrik und Nutzer-Kennung stehen
 *  beim Anlegen fest und werden nie nachtraeglich umgeschrieben. */
export interface MeilensteinPatch {
  name: string;
  target: number;
}

/** Schmale Schnittstelle fuer alle Schreibvorgaenge rund um Messungen und ihre
 *  Meilensteine. Jede Methode kapselt genau einen Datenbank-Handgriff und wirft
 *  bei Fehler – Fehlerbehandlung an einem Ort. Welche Aktion welche Handgriffe
 *  ausloest, liegt beim Aufrufer (compositionWrite), nicht hier. */
export interface CompositionStore {
  insertMessung(row: MessungRowIns): Promise<void>;
  updateMessung(id: string, patch: MessungPatch): Promise<void>;
  deleteMessung(id: string): Promise<void>;
  insertMeilenstein(row: MeilensteinRowIns): Promise<void>;
  updateMeilenstein(id: string, patch: MeilensteinPatch): Promise<void>;
  deleteMeilenstein(id: string): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseCompositionStore: CompositionStore = {
  async insertMessung(row) {
    must(await supabase.from("composition").insert(row));
  },
  async updateMessung(id, patch) {
    must(await supabase.from("composition").update(patch).eq("id", id));
  },
  async deleteMessung(id) {
    must(await supabase.from("composition").delete().eq("id", id));
  },
  async insertMeilenstein(row) {
    must(await supabase.from("composition_milestones").insert(row));
  },
  async updateMeilenstein(id, patch) {
    must(
      await supabase.from("composition_milestones").update(patch).eq("id", id),
    );
  },
  async deleteMeilenstein(id) {
    must(await supabase.from("composition_milestones").delete().eq("id", id));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe, je Bereich
 *  getrennt. `folge` haelt zusaetzlich die Reihenfolge aller Handgriffe fest –
 *  fuer Faelle, in denen eine Aktion mehrere Schritte ausloest. */
export interface MemoryCompositionLog {
  messungInserted: MessungRowIns[];
  messungPatches: Array<{ id: string; patch: MessungPatch }>;
  messungDeleted: string[];
  meilensteinInserted: MeilensteinRowIns[];
  meilensteinPatches: Array<{ id: string; patch: MeilensteinPatch }>;
  meilensteinDeleted: string[];
  folge: string[];
}

/** Erzeugt einen Messungs-Speicher, der nichts schreibt, sondern jeden Handgriff
 *  protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank. */
export function createMemoryCompositionStore(): {
  store: CompositionStore;
  log: MemoryCompositionLog;
} {
  const log: MemoryCompositionLog = {
    messungInserted: [],
    messungPatches: [],
    messungDeleted: [],
    meilensteinInserted: [],
    meilensteinPatches: [],
    meilensteinDeleted: [],
    folge: [],
  };
  const store: CompositionStore = {
    async insertMessung(row) {
      log.messungInserted.push(row);
      log.folge.push("insertMessung");
    },
    async updateMessung(id, patch) {
      log.messungPatches.push({ id, patch });
      log.folge.push("updateMessung");
    },
    async deleteMessung(id) {
      log.messungDeleted.push(id);
      log.folge.push("deleteMessung");
    },
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
  };
  return { store, log };
}
