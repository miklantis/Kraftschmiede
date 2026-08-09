import { supabase } from "@/lib/supabase";
import { BESTANDSREGISTER } from "@/lib/bestandsregister";
import type { RawExportData, Row } from "@/lib/exportData";

// Eine Quelle fuer alle Export-Wege: holt den kompletten Bestand des Nutzers
// (RLS schraenkt automatisch auf die eigene user_id ein). Bewusst kein Hook,
// damit Voll-Export und Coach-Export dieselbe Abfrage teilen. Welche Tabellen
// dazugehoeren, steht ausschliesslich im Bestandsregister.

async function selectAll(table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

export async function fetchAllData(): Promise<RawExportData> {
  // Alle Tabellen parallel, Reihenfolge des Registers.
  const listen = await Promise.all(
    BESTANDSREGISTER.map((e) => selectAll(e.tabelle)),
  );

  const roh: Record<string, Row[] | Row | null> = {};
  BESTANDSREGISTER.forEach((e, i) => {
    const rows = listen[i] ?? [];
    // settings ist eine Einzelzeile pro Nutzer, kein Listenfeld.
    roh[e.key] = e.einzelzeile ? (rows[0] ?? null) : rows;
  });

  // Die Schluessel stammen aus dem Register, das die Form von RawExportData
  // bestimmt - deshalb hier eine einmalige Zusicherung statt 28 Handgriffen.
  return roh as RawExportData;
}
