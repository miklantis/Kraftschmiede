import { useCallback } from "react";
import { hapticTick } from "@/lib/haptics";
import { useSettings } from "./useSettings";

// Liefert eine `tick`-Funktion, die einen kurzen taktilen Tipp-Impuls ausloest,
// sofern die Haptik in den Einstellungen aktiv ist. Fehlt der Wert (alte
// Datenzeile ohne das Feld), gilt „an" als Standard. Wiederverwendbar ueberall,
// wo ein Tippen eine kurze Rueckmeldung bekommen soll (Navigation u. a.).
export function useHaptics(): { tick: () => void } {
  const settingsQ = useSettings();
  const enabled = settingsQ.data?.timers.haptics ?? true;
  const tick = useCallback(() => hapticTick(enabled), [enabled]);
  return { tick };
}
