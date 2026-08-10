// Naht zum Zeitraum-Speicher: die schmale Schnittstelle, ueber die die drei
// Zeitraum-Schreiber (anlegen, aendern, loeschen) ihre Datenbank-Handgriffe
// abspielen. Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb
// und ein Speicher im Arbeitsspeicher fuer Tests – damit ist der Schreibpfad
// automatisch pruefbar. Die Pruefung "lief der Schritt durch?" sitzt hier an
// genau einer Stelle (`must`), statt bei jedem Aufrufer.
//
// Vorbild und Form: `historyStore.ts`. Unterste Schicht: kennt nur Supabase und
// die Schema-Typen, niemals die Mutationen oder Hooks darueber.

import { supabase } from "@/lib/supabase";
import type { ZeitraumInsert } from "@/schemas";

/** Zeile beim Anlegen: alle Felder des Markers samt Nutzer-Kennung. */
export type ZeitraumRowIns = ZeitraumInsert;

/** Aenderbare Felder eines Markers – die Nutzer-Kennung wandert nie mit. */
export type ZeitraumPatch = Omit<ZeitraumInsert, "user_id">;

/** Schmale Schnittstelle fuer alle Zeitraum-Schreibvorgaenge. Jede Methode
 *  kapselt genau einen Datenbank-Handgriff und wirft bei Fehler –
 *  Fehlerbehandlung an einem Ort. Welche Aktion welche Handgriffe ausloest,
 *  liegt beim Aufrufer (zeitraumWrite), nicht hier. */
export interface ZeitraumStore {
  insertZeitraum(row: ZeitraumRowIns): Promise<void>;
  updateZeitraum(id: string, patch: ZeitraumPatch): Promise<void>;
  deleteZeitraum(id: string): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseZeitraumStore: ZeitraumStore = {
  async insertZeitraum(row) {
    must(await supabase.from("zeitraeume").insert(row));
  },
  async updateZeitraum(id, patch) {
    must(await supabase.from("zeitraeume").update(patch).eq("id", id));
  },
  async deleteZeitraum(id) {
    must(await supabase.from("zeitraeume").delete().eq("id", id));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe. */
export interface MemoryZeitraumLog {
  inserted: ZeitraumRowIns[];
  patches: Array<{ id: string; patch: ZeitraumPatch }>;
  deleted: string[];
}

/** Erzeugt einen Zeitraum-Speicher, der nichts schreibt, sondern jeden Handgriff
 *  protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank. */
export function createMemoryZeitraumStore(): {
  store: ZeitraumStore;
  log: MemoryZeitraumLog;
} {
  const log: MemoryZeitraumLog = {
    inserted: [],
    patches: [],
    deleted: [],
  };
  const store: ZeitraumStore = {
    async insertZeitraum(row) {
      log.inserted.push(row);
    },
    async updateZeitraum(id, patch) {
      log.patches.push({ id, patch });
    },
    async deleteZeitraum(id) {
      log.deleted.push(id);
    },
  };
  return { store, log };
}
