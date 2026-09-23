// Reine Hilfen rund um die Messgeraete der Koerpermessungen (ohne React, ohne
// Datenbank). Die Oberflaeche in den Einstellungen und am Mess-Popup liest nur
// hier, damit die Regeln an einer Stelle stehen und pruefbar sind.

import type { CompositionRow, MeasurementDeviceRow } from "@/schemas";

/** Name fuer den Vergleich: ohne Rand-Leerzeichen, ohne Gross-/Kleinschreibung.
 *  „InBody 570“ und „inbody 570 “ gelten damit als derselbe Name. */
function vergleichsName(name: string): string {
  return name.trim().toLocaleLowerCase("de");
}

/** Ist der Name schon an ein anderes Geraet vergeben? Das eigene Geraet
 *  (`eigeneId`, beim Umbenennen) ist ausgenommen, damit ein unveraenderter oder
 *  nur anders geschriebener Name speicherbar bleibt. */
export function messgeraetNameVergeben(
  name: string,
  geraete: readonly MeasurementDeviceRow[],
  eigeneId: string | null,
): boolean {
  const gesucht = vergleichsName(name);
  if (gesucht === "") return false;
  return geraete.some(
    (g) => g.id !== eigeneId && vergleichsName(g.name) === gesucht,
  );
}

/** Vorauswahl fuer eine neue Messung: das Geraet der juengsten Messung (nach
 *  Datum). Hatte sie kein Geraet oder gibt es noch keine Messung, bleibt die
 *  Auswahl leer (null). Ein Verweis auf ein nicht (mehr) bekanntes Geraet
 *  zaehlt ebenfalls als leer. */
export function vorauswahlMessgeraet(
  messungen: readonly CompositionRow[],
  geraete: readonly MeasurementDeviceRow[],
): string | null {
  let juengste: CompositionRow | null = null;
  for (const m of messungen) {
    if (juengste === null || m.date > juengste.date) juengste = m;
  }
  const id = juengste?.device_id ?? null;
  if (id === null) return null;
  return geraete.some((g) => g.id === id) ? id : null;
}

/** Name je Geraete-Kennung, fuer die Anzeige an den Messungen. */
export function messgeraetNamen(
  geraete: readonly MeasurementDeviceRow[],
): ReadonlyMap<string, string> {
  return new Map(geraete.map((g) => [g.id, g.name]));
}

/** Anzahl Messungen je Geraet. Ein Geraet mit Messungen laesst sich nicht
 *  loeschen (die Datenbank sperrt es ebenfalls, Migration 0065). */
export function messungenJeGeraet(
  messungen: readonly CompositionRow[],
): ReadonlyMap<string, number> {
  const anzahl = new Map<string, number>();
  for (const m of messungen) {
    if (m.device_id === null) continue;
    anzahl.set(m.device_id, (anzahl.get(m.device_id) ?? 0) + 1);
  }
  return anzahl;
}

/** „1 Messung“ / „3 Messungen“ / „Noch keine Messung“. */
export function messungenText(anzahl: number): string {
  if (anzahl === 0) return "Noch keine Messung";
  return anzahl === 1 ? "1 Messung" : `${anzahl} Messungen`;
}
