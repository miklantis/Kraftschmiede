// Schreib-Baustein des Wiederherstellens: der komplette Ablauf eines
// Voll-Restores als duenne Folge ueber der Naht RestoreStore. Hier liegen die
// Reihenfolge der Schritte, das Setzen der Nutzer-Kennung je Zeile, das
// Ueberspringen leerer Listen und die Fehlermeldung mit Tabellenname – an einem
// Ort. Das eigentliche Schreiben macht der uebergebene Speicher.
//
// Haengt nur an der Naht (Typ RestoreStore), am Bestandsregister und an den
// Zeilen-Typen, kennt Supabase nicht. Dadurch mit einem Speicher im
// Arbeitsspeicher pruefbar – erstmals fuer diesen Ablauf.
//
// Ablauf (unveraendert gegenueber dem fruehreren Hook-Code):
// 1) alle eigenen Zeilen loeschen, Kinder vor Eltern (LOESCH_REIHENFOLGE)
// 2) neu einfuegen, Eltern vor Kindern (EINFUEGE_REIHENFOLGE), user_id gesetzt,
//    ids und Fremdschluessel bleiben erhalten, damit die Beziehungen halten
// 3) Einzelzeilen (settings) per Upsert ersetzen, falls in der Sicherung
//
// Die Reihenfolgen werden nicht hier gefuehrt, sondern kommen aus dem
// Bestandsregister.

import {
  EINFUEGE_REIHENFOLGE,
  EINZEL_TABELLEN,
  LOESCH_REIHENFOLGE,
} from "@/lib/bestandsregister";
import type { RestoreStore } from "./restoreStore";
import type { RestoreTables } from "@/lib/restoreData";
import type { Row } from "@/lib/exportData";

/** Nutzer-Kennung je Zeile setzen; alles andere bleibt unveraendert. */
function withUser(rows: Row[], userId: string): Row[] {
  return rows.map((r) => ({ ...r, user_id: userId }));
}

/** Fehler eines Schritts um die betroffene Tabelle ergaenzen, damit im
 *  Fehlertext steht, wo der Ablauf abgebrochen ist. */
async function schritt(
  tabelle: string,
  was: string,
  fn: () => Promise<void>,
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    const meldung = e instanceof Error ? e.message : String(e);
    throw new Error(`${tabelle} (${was}): ${meldung}`);
  }
}

/** Ein Voll-Restore abspielen: geprueften Sicherungs-Inhalt herein, Handgriffe
 *  auf den Speicher heraus. Ohne angemeldeten Nutzer wird nichts geschrieben. */
export async function writeRestore(
  store: RestoreStore,
  userId: string | null,
  tables: RestoreTables,
): Promise<void> {
  if (userId === null) throw new Error("Nicht angemeldet.");

  // 1) Alles Eigene loeschen (Kinder zuerst).
  for (const table of LOESCH_REIHENFOLGE) {
    await schritt(table, "loeschen", () =>
      store.deleteAllRows(table, userId),
    );
  }

  // 2) Neu einfuegen (Eltern zuerst), user_id gesetzt.
  for (const table of EINFUEGE_REIHENFOLGE) {
    const rows = tables[table];
    if (rows.length === 0) continue;
    await schritt(table, "einfuegen", () =>
      store.insertRows(table, withUser(rows, userId)),
    );
  }

  // 3) Einzelzeilen ersetzen (eine Zeile pro Nutzer), falls vorhanden.
  for (const table of EINZEL_TABELLEN) {
    const row = tables[table];
    if (row == null) continue;
    await schritt(table, "ersetzen", () =>
      store.upsertRow(table, { ...row, user_id: userId }),
    );
  }
}
