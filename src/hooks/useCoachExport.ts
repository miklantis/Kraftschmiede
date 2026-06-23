import { useState } from "react";
import { useUserId } from "./useUserId";
import { buildCoachExport, serializeCoachExport } from "@/lib/coachExport";
import { fetchAllData } from "@/lib/exportSource";
import { copyText } from "@/lib/download";

// Coach-Export: holt den Bestand (gemeinsame Quelle), baut das schlanke,
// sprechende JSON fuer das Gespraech und legt es in die Zwischenablage.
// weeks = null bedeutet kompletter Verlauf.

export function useCoachExport(): {
  copyForCoaching: (weeks: number | null) => Promise<void>;
  isPending: boolean;
  done: boolean;
  error: string | null;
} {
  const userId = useUserId();
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyForCoaching(weeks: number | null): Promise<void> {
    if (userId === null) {
      setError("Nicht angemeldet.");
      return;
    }
    setIsPending(true);
    setError(null);
    setDone(false);
    try {
      const raw = await fetchAllData();
      const text = serializeCoachExport(buildCoachExport(raw, { weeks }));
      const ok = await copyText(text);
      if (!ok) throw new Error("Zwischenablage nicht verfuegbar.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsPending(false);
    }
  }

  return { copyForCoaching, isPending, done, error };
}
