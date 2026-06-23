import { useEffect, useState } from "react";
import { fmtDur } from "@/lib/liveSession";

// Trainings-Uhr wie V1 (live.js updateClock): die Anzeige wird immer aus
// (Date.now() - startedAt) berechnet, daher robust gegen Tab-Wechsel und
// Hintergrund-Drosselung. Tickt im Sekundentakt, solange eine Startzeit anliegt.
export function useLiveClock(startedAt: number | null): string {
  const [, tick] = useState(0);
  useEffect(() => {
    if (startedAt == null) return undefined;
    const id = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  if (startedAt == null) return fmtDur(0);
  return fmtDur((Date.now() - startedAt) / 1000);
}
