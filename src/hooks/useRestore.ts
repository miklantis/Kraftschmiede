import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { RestoreTables } from "@/lib/restoreData";
import type { Row } from "@/lib/exportData";

// Voll-Restore: ersetzt den kompletten Bestand des Nutzers durch den Inhalt
// eines eigenen V2-Exports. Kein Anhaengen/Aktualisieren. Ablauf: erst alle
// eigenen Zeilen loeschen (Kinder vor Eltern, damit keine FK-Verletzung), dann
// in Eltern-vor-Kinder-Reihenfolge wieder einfuegen; je Zeile wird user_id auf
// den aktuellen Nutzer gesetzt, ids/Fremdschluessel bleiben erhalten, damit die
// Beziehungen halten. settings wird per Upsert ersetzt (eine Zeile pro Nutzer).
// Die Komponente kennt Supabase nicht direkt.

// Loeschen: Kinder zuerst (settings nicht, das wird geupsertet).
const DELETE_ORDER: string[] = [
  "sets",
  "session_exercises",
  "sessions",
  "skill_progress",
  "phases",
  "journeys",
  "skill_phase_equipment",
  "skill_phase_exercises",
  "skill_phases",
  "skills",
  "journey_template_phases",
  "journey_templates",
  "template_exercises",
  "templates",
  "exercise_muscles",
  "exercises",
  "body_log",
  "composition",
  "inventory_equipment",
  "inventory_kettlebells",
  "inventory_dumbbells",
  "inventory_plates",
  "inventory_bars",
];

// Einfuegen: Eltern zuerst (Spiegelbild).
const INSERT_ORDER: (keyof RestoreTables)[] = [
  "inventory_bars",
  "inventory_plates",
  "inventory_kettlebells",
  "inventory_dumbbells",
  "inventory_equipment",
  "exercises",
  "exercise_muscles",
  "templates",
  "template_exercises",
  "journey_templates",
  "journey_template_phases",
  "skills",
  "skill_phases",
  "skill_phase_exercises",
  "skill_phase_equipment",
  "journeys",
  "phases",
  "sessions",
  "session_exercises",
  "sets",
  "skill_progress",
  "body_log",
  "composition",
];

function withUser(rows: Row[], userId: string): Row[] {
  return rows.map((r) => ({ ...r, user_id: userId }));
}

export function useRestore(): {
  apply: (tables: RestoreTables) => Promise<void>;
  isPending: boolean;
  done: boolean;
  error: string | null;
} {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(tables: RestoreTables): Promise<void> {
    if (userId === null) {
      setError("Nicht angemeldet.");
      return;
    }
    setIsPending(true);
    setError(null);
    setDone(false);
    try {
      // 1) Alles Eigene loeschen (Kinder zuerst).
      for (const table of DELETE_ORDER) {
        const { error: delErr } = await supabase
          .from(table)
          .delete()
          .eq("user_id", userId);
        if (delErr) throw new Error(`${table} (loeschen): ${delErr.message}`);
      }

      // 2) Neu einfuegen (Eltern zuerst), user_id gesetzt.
      for (const table of INSERT_ORDER) {
        const rows = tables[table] as Row[];
        if (rows.length === 0) continue;
        const { error: insErr } = await supabase
          .from(table)
          .insert(withUser(rows, userId));
        if (insErr) throw new Error(`${table} (einfuegen): ${insErr.message}`);
      }

      // 3) Einstellungen ersetzen (eine Zeile pro Nutzer), falls vorhanden.
      if (tables.settings != null) {
        const { error: setErr } = await supabase
          .from("settings")
          .upsert({ ...tables.settings, user_id: userId }, {
            onConflict: "user_id",
          });
        if (setErr) throw new Error(`settings: ${setErr.message}`);
      }

      // Alles neu laden, damit die App den neuen Bestand zeigt.
      await queryClient.invalidateQueries();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsPending(false);
    }
  }

  return { apply, isPending, done, error };
}
