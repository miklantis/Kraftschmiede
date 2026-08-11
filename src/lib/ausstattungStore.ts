// Naht zum Ausstattungs-Speicher: die schmale Schnittstelle, ueber die die
// Schreiber der Ausstattungs-Seite ihre Datenbank-Handgriffe abspielen – das
// Inventar (inventory_plates, inventory_kettlebells, inventory_dumbbells,
// inventory_equipment) und die Einstellungen (settings). Ein Store fuer beide
// Bereiche, weil sie fachlich zusammengehoeren und in derselben Ansicht
// gepflegt werden: was steht mir zur Verfuegung und wie soll die App damit
// rechnen. Stangen sind ein festes Set und bleiben bewusst aussen vor.
//
// Zwei Gesichter dieser Naht: der echte Supabase-Speicher im Betrieb und ein
// Speicher im Arbeitsspeicher fuer Tests – damit ist der Schreibpfad automatisch
// pruefbar. Die Pruefung "lief der Schritt durch?" sitzt hier an genau einer
// Stelle (`must`), statt bei jedem Aufrufer.
//
// Vorbild und Form: `zeitraumStore.ts`, `compositionStore.ts`. Unterste
// Schicht: kennt nur Supabase und die Schema-Typen, niemals die Mutationen oder
// Hooks darueber. Insbesondere weiss diese Datei nichts von pausierbaren
// Mutationen – die Registrierung und ihre Reihenfolge (ADR-0009) bleiben
// unberuehrt bei den Aufrufern.

import { supabase } from "@/lib/supabase";
import type {
  InventoryDumbbellInsert,
  InventoryKettlebellInsert,
  InventoryPlateInsert,
  SettingsRow,
} from "@/schemas";

/** Zeile beim Anlegen einer Scheibe: Gewicht und Nutzer-Kennung. */
export type ScheibeRowIns = InventoryPlateInsert;

/** Zeile beim Anlegen einer Kettlebell. */
export type KettlebellRowIns = InventoryKettlebellInsert;

/** Zeile beim Anlegen einer Kurzhantel. */
export type KurzhantelRowIns = InventoryDumbbellInsert;

/** Aenderbare Felder der Einstellungen. Die Nutzer-Kennung ist der
 *  Primaerschluessel der Zeile und wandert nie als Feld mit; die jsonb-Felder
 *  kommen immer als vollstaendiges Objekt herein. */
export type EinstellungenPatch = Partial<Omit<SettingsRow, "user_id">>;

/** Schmale Schnittstelle fuer alle Schreibvorgaenge rund um Ausstattung und
 *  Einstellungen. Jede Methode kapselt genau einen Datenbank-Handgriff und
 *  wirft bei Fehler – Fehlerbehandlung an einem Ort. Welche Aktion welchen
 *  Handgriff ausloest, liegt beim Aufrufer (ausstattungWrite), nicht hier. */
export interface AusstattungStore {
  insertScheibe(row: ScheibeRowIns): Promise<void>;
  deleteScheibe(id: string): Promise<void>;
  insertKettlebell(row: KettlebellRowIns): Promise<void>;
  deleteKettlebell(id: string): Promise<void>;
  insertKurzhantel(row: KurzhantelRowIns): Promise<void>;
  deleteKurzhantel(id: string): Promise<void>;
  /** Equipment-Tor umlegen. Der Schluessel ist je Nutzer eindeutig. */
  setEquipmentAktiv(key: string, aktiv: boolean): Promise<void>;
  /** Einstellungen fortschreiben. Die Zeile existiert immer (Seed beim ersten
   *  Start), daher ein gezieltes Update auf die eigene Nutzer-Kennung – so
   *  bleibt es bei genau einer Zeile pro Nutzer. */
  updateEinstellungen(
    userId: string,
    patch: EinstellungenPatch,
  ): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseAusstattungStore: AusstattungStore = {
  async insertScheibe(row) {
    must(await supabase.from("inventory_plates").insert(row));
  },
  async deleteScheibe(id) {
    must(await supabase.from("inventory_plates").delete().eq("id", id));
  },
  async insertKettlebell(row) {
    must(await supabase.from("inventory_kettlebells").insert(row));
  },
  async deleteKettlebell(id) {
    must(await supabase.from("inventory_kettlebells").delete().eq("id", id));
  },
  async insertKurzhantel(row) {
    must(await supabase.from("inventory_dumbbells").insert(row));
  },
  async deleteKurzhantel(id) {
    must(await supabase.from("inventory_dumbbells").delete().eq("id", id));
  },
  async setEquipmentAktiv(key, aktiv) {
    must(
      await supabase
        .from("inventory_equipment")
        .update({ active: aktiv })
        .eq("key", key),
    );
  },
  async updateEinstellungen(userId, patch) {
    must(await supabase.from("settings").update(patch).eq("user_id", userId));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe. */
export interface MemoryAusstattungLog {
  scheibenInsert: ScheibeRowIns[];
  scheibenDeleted: string[];
  kettlebellsInsert: KettlebellRowIns[];
  kettlebellsDeleted: string[];
  kurzhantelnInsert: KurzhantelRowIns[];
  kurzhantelnDeleted: string[];
  equipment: Array<{ key: string; aktiv: boolean }>;
  einstellungen: Array<{ userId: string; patch: EinstellungenPatch }>;
}

/** Erzeugt einen Ausstattungs-Speicher, der nichts schreibt, sondern jeden
 *  Handgriff protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank. */
export function createMemoryAusstattungStore(): {
  store: AusstattungStore;
  log: MemoryAusstattungLog;
} {
  const log: MemoryAusstattungLog = {
    scheibenInsert: [],
    scheibenDeleted: [],
    kettlebellsInsert: [],
    kettlebellsDeleted: [],
    kurzhantelnInsert: [],
    kurzhantelnDeleted: [],
    equipment: [],
    einstellungen: [],
  };
  const store: AusstattungStore = {
    async insertScheibe(row) {
      log.scheibenInsert.push(row);
    },
    async deleteScheibe(id) {
      log.scheibenDeleted.push(id);
    },
    async insertKettlebell(row) {
      log.kettlebellsInsert.push(row);
    },
    async deleteKettlebell(id) {
      log.kettlebellsDeleted.push(id);
    },
    async insertKurzhantel(row) {
      log.kurzhantelnInsert.push(row);
    },
    async deleteKurzhantel(id) {
      log.kurzhantelnDeleted.push(id);
    },
    async setEquipmentAktiv(key, aktiv) {
      log.equipment.push({ key, aktiv });
    },
    async updateEinstellungen(userId, patch) {
      log.einstellungen.push({ userId, patch });
    },
  };
  return { store, log };
}
