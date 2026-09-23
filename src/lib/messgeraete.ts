// Reine Hilfen rund um die Messgeraete der Koerpermessungen (ohne React, ohne
// Datenbank). Die Oberflaeche in den Einstellungen und am Mess-Popup liest nur
// hier, damit die Regeln an einer Stelle stehen und pruefbar sind.

import type { MeasurementDeviceRow } from "@/schemas";

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
