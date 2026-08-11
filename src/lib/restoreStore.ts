// Naht zum Wiederherstellen-Speicher: die schmale Schnittstelle, ueber die das
// Voll-Restore seine drei Datenbank-Handgriffe abspielt (alles Eigene einer
// Tabelle loeschen, Zeilen einfuegen, die Einstellungs-Zeile ersetzen). Zwei
// Gesichter: der echte Supabase-Speicher im Betrieb und ein Speicher im
// Arbeitsspeicher fuer Tests – damit ist der heikelste Schreibpfad der App
// (erst loeschen, dann neu einfuegen) erstmals ohne echte Datenbank pruefbar.
//
// Vorbild und Form: `historyStore.ts` / `zeitraumStore.ts`. Unterste Schicht:
// kennt nur Supabase und die Tabellennamen aus dem Bestandsregister, niemals
// die Abfolge darueber (die liegt in `restoreWrite.ts`).

import { supabase } from "@/lib/supabase";
import type { EinzelTabelle, ListenTabelle } from "@/lib/bestandsregister";
import type { Row } from "@/lib/exportData";

/** Schmale Schnittstelle fuer alle Handgriffe des Wiederherstellens. Jede
 *  Methode kapselt genau einen Datenbank-Schritt und wirft bei Fehler mit der
 *  reinen Datenbank-Meldung; welche Tabelle betroffen war, ergaenzt der
 *  Aufrufer (restoreWrite). */
export interface RestoreStore {
  /** Alle Zeilen des Nutzers aus einer Tabelle entfernen. */
  deleteAllRows(table: ListenTabelle, userId: string): Promise<void>;
  /** Zeilen einfuegen; ids und Fremdschluessel kommen unveraendert mit. */
  insertRows(table: ListenTabelle, rows: Row[]): Promise<void>;
  /** Einzelzeile pro Nutzer ersetzen (settings), Konflikt auf `user_id`. */
  upsertRow(table: EinzelTabelle, row: Row): Promise<void>;
}

// --- Echter Speicher (Betrieb): Supabase ---

/** Wirft bei Fehler mit der Supabase-Meldung. Die eine Stelle, an der aus einem
 *  fehlgeschlagenen Datenbank-Schritt ein Fehler wird. */
function must(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
}

export const supabaseRestoreStore: RestoreStore = {
  async deleteAllRows(table, userId) {
    must(await supabase.from(table).delete().eq("user_id", userId));
  },
  async insertRows(table, rows) {
    must(await supabase.from(table).insert(rows));
  },
  async upsertRow(table, row) {
    must(await supabase.from(table).upsert(row, { onConflict: "user_id" }));
  },
};

// --- Speicher im Arbeitsspeicher (nur Tests) ---

/** Protokoll der ueber den Test-Speicher gelaufenen Handgriffe – in der
 *  Reihenfolge, in der sie ausgeloest wurden. */
export interface MemoryRestoreLog {
  /** Geleerte Tabellen, in Loesch-Reihenfolge. */
  deleted: ListenTabelle[];
  /** Eingefuegte Zeilen je Handgriff, in Einfuege-Reihenfolge. */
  inserted: Array<{ table: ListenTabelle; rows: Row[] }>;
  /** Geupsertete Einzelzeilen. */
  upserted: Array<{ table: EinzelTabelle; row: Row }>;
  /** Jeder Handgriff als Marke, damit die Abfolge pruefbar ist. */
  ablauf: string[];
}

/** Welcher Handgriff soll scheitern? Fuer den Abbruch-Test. */
export interface MemoryRestoreFehler {
  deleteTable?: ListenTabelle;
  insertTable?: ListenTabelle;
  upsertTable?: EinzelTabelle;
  message?: string;
}

/** Erzeugt einen Wiederherstellen-Speicher, der nichts schreibt, sondern jeden
 *  Handgriff protokolliert – fuer Tests des Schreibpfads ohne echte Datenbank.
 *  Optional laesst sich genau ein Handgriff scheitern lassen. */
export function createMemoryRestoreStore(fehler: MemoryRestoreFehler = {}): {
  store: RestoreStore;
  log: MemoryRestoreLog;
} {
  const meldung = fehler.message ?? "Datenbank meldet Fehler";
  const log: MemoryRestoreLog = {
    deleted: [],
    inserted: [],
    upserted: [],
    ablauf: [],
  };
  const store: RestoreStore = {
    async deleteAllRows(table) {
      if (fehler.deleteTable === table) throw new Error(meldung);
      log.deleted.push(table);
      log.ablauf.push(`delete:${table}`);
    },
    async insertRows(table, rows) {
      if (fehler.insertTable === table) throw new Error(meldung);
      log.inserted.push({ table, rows });
      log.ablauf.push(`insert:${table}`);
    },
    async upsertRow(table, row) {
      if (fehler.upsertTable === table) throw new Error(meldung);
      log.upserted.push({ table, row });
      log.ablauf.push(`upsert:${table}`);
    },
  };
  return { store, log };
}
