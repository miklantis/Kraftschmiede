import { useEffect } from "react";
import {
  isWakeLockSupported,
  requestWakeLock,
  releaseWakeLock,
} from "@/lib/wakeLock";

// Haelt den Bildschirm wach, solange `enabled` gilt - in der Live-Schicht ist
// das „laufende Session UND Schalter an UND Geraet unterstuetzt es". Fordert den
// Lock an, gibt ihn beim Beenden/Verwerfen (enabled -> false) wieder frei, und
// fordert ihn nach einem kurzen App-Wechsel automatisch neu an (der Browser
// gibt ihn beim Verstecken des Tabs von selbst frei).
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isWakeLockSupported()) return;

    void requestWakeLock();

    const onVisibility = (): void => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void releaseWakeLock();
    };
  }, [enabled]);
}
