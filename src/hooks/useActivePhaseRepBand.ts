import { useActiveJourney } from "./useJourney";
import { useSessions } from "./useSessions";
import { useSettings } from "./useSettings";
import { derivePhaseContext } from "@/lib/phaseContext";
import { todayISO } from "@/lib/format";

// Repband der aktuell laufenden Journey-Phase (Region/Wert wie im Coach). Dient
// dem "Uebung anpassen"-Popup, um das Repband zu sperren, wenn es aus der
// aktiven Phase kommt (V1-Verhalten). Liefert [min,max] oder null, wenn keine
// aktive Journey/Phase greift oder die Phase kein Band vorgibt (z. B. Erhaltung).
// Reine Zusammensetzung ohne eigene Rechnung: aktive Journey + Einheiten +
// Frequenzziel -> derivePhaseContext (dort stehen Platzierung und Band). Die
// Profil-Einschraenkung (nur Kraftuebungen sind gesperrt) trifft der Aufrufer.
export function useActivePhaseRepBand(): [number, number] | null {
  const journeyQ = useActiveJourney();
  const sessionsQ = useSessions();
  const settingsQ = useSettings();

  const journey = journeyQ.data;
  const sessions = sessionsQ.data;
  if (!journey || !sessions) return null;

  const ph = derivePhaseContext(
    journey,
    sessions,
    settingsQ.data?.weekly_frequency_target || 3,
    todayISO(),
  );
  return ph.phaseRepTarget;
}
