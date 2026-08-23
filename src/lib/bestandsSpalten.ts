// Welche Spalten eine Bestands-Tabelle heute wirklich hat – abgeleitet aus den
// Zod-Schemas in `src/schemas`, verbunden ueber den Schema-Namen im
// Bestandsregister. Die eine Stelle, an der aus "Tabelle" eine Spaltenliste
// wird.
//
// Gebraucht beim Wiederherstellen: eine Sicherungsdatei haelt den Stand von
// damals fest. Faellt spaeter eine Spalte weg, enthaelt die Datei ein Feld, das
// es nicht mehr gibt – ungefiltert eingespielt bricht der Schritt ab und die
// Sicherung ist verloren. Darum werden Zeilen vor dem Schreiben auf die heute
// bekannten Spalten eingedampft.
//
// Bewusst nur eindampfen, nicht pruefen: die Werte bleiben unangetastet, ueber
// ihre Gueltigkeit entscheidet weiterhin die Datenbank. Ein voller
// Zod-Durchlauf wuerde aeltere Sicherungen an Detailregeln scheitern lassen,
// die beim Einspielen niemand gewinnt.
//
// Spalten, die es heute gibt und die in einer alten Sicherung fehlen, werden
// nicht erfunden: das Feld wird schlicht nicht mitgeschickt, die Datenbank
// setzt ihren Vorgabewert.

import { z } from "zod";
import * as schemas from "@/schemas";
import { BESTANDSREGISTER } from "@/lib/bestandsregister";
import type { Row } from "@/lib/exportData";

const barrel = schemas as unknown as Record<string, unknown>;

/** Spaltennamen eines Row-Schemas; null, wenn es den Namen nicht gibt. Dass
 *  jeder Register-Eintrag auf ein vorhandenes Schema zeigt, sichert der Test in
 *  `bestandsregister.test.ts` – hier wird darum nicht geworfen, sondern im
 *  Zweifel nichts gefiltert. */
function spaltenAusSchema(name: string): ReadonlySet<string> | null {
  const s = barrel[name];
  if (!(s instanceof z.ZodObject)) return null;
  return new Set(Object.keys((s as z.ZodObject<z.ZodRawShape>).shape));
}

const SPALTEN: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  BESTANDSREGISTER.flatMap((e) => {
    const spalten = spaltenAusSchema(e.schema);
    return spalten ? [[e.tabelle, spalten] as const] : [];
  }),
);

/** Die heute bekannten Spalten einer Tabelle; leer, wenn die Tabelle nicht zum
 *  Bestand gehoert. Vor allem fuer die Gegenprobe im Test. */
export function bekannteSpalten(tabelle: string): ReadonlySet<string> {
  return SPALTEN.get(tabelle) ?? new Set();
}

/** Eine Zeile auf die heute bekannten Spalten eindampfen. Unbekannte Felder
 *  fallen weg, bekannte kommen unveraendert mit. Ist die Tabelle unbekannt,
 *  bleibt die Zeile wie sie ist – lieber durchreichen als still leeren. */
export function aufBekannteSpalten(tabelle: string, row: Row): Row {
  const spalten = SPALTEN.get(tabelle);
  if (spalten == null) return row;
  const out: Row = {};
  for (const [feld, wert] of Object.entries(row)) {
    if (spalten.has(feld)) out[feld] = wert;
  }
  return out;
}
