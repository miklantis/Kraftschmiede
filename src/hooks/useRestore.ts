import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserId } from "./useUserId";
import { supabaseRestoreStore } from "@/lib/restoreStore";
import { writeRestore } from "@/lib/restoreWrite";
import type { RestoreTables } from "@/lib/restoreData";

// Voll-Restore: ersetzt den kompletten Bestand des Nutzers durch den Inhalt
// eines eigenen Exports (v2/v3). Kein Anhaengen/Aktualisieren.
//
// Der Hook traegt nur noch Absicht, Lade-/Fehler-/Fertig-Zustand und die
// abschliessende Auffrischung. Die Datenbank-Handgriffe liegen hinter der Naht
// (lib/restoreStore.ts), die Abfolge – loeschen, einfuegen, Einstellungen
// ersetzen, samt Reihenfolgen aus dem Bestandsregister – in lib/restoreWrite.ts
// und ist dort mit Tests abgedeckt.

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
      await writeRestore(supabaseRestoreStore, userId, tables);
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
