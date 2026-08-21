import { useActiveJourney } from "./useJourney";
import { useSessions } from "./useSessions";
import { useSettings } from "./useSettings";
import { derivePhaseContext } from "@/lib/phaseContext";
import { todayISO } from "@/lib/format";
import type { WeekPlanWeek } from "@/engine";

// Was die aktuell laufende Journey-Phase vorgibt. Dient dem Popup "Uebung
// anpassen": Es zeigt die geltende Vorgabe statt einer Zahl, die nicht im Spiel
// ist (Issue #297) – die Wochenzeile des Plans, wenn die Phase einen fuehrt,
// sonst das Ziel-Repband der Phase.
//
// Reine Zusammensetzung ohne eigene Rechnung: aktive Journey + Einheiten +
// Frequenzziel -> derivePhaseContext (dort stehen Platzierung, Wochenplan und
// Band). Welche der beiden Vorgaben fuer eine konkrete Uebung gilt, entscheidet
// lib/exerciseTarget – Profil und Rolle der Uebung kennt der Hook nicht.
export interface ActivePhaseTarget {
  /** Geltende Zeile des Wochenplans; null = die Phase fuehrt keinen (bzw. die
   *  Woche verlangt keine Einheit). */
  planWeek: WeekPlanWeek | null;
  /** Ziel-Repband der Phase; null = die Phase gibt keins vor (z. B. Erhaltung)
   *  oder es laeuft keine Journey. */
  repBand: [number, number] | null;
}

export function useActivePhaseTarget(): ActivePhaseTarget {
  const journeyQ = useActiveJourney();
  const sessionsQ = useSessions();
  const settingsQ = useSettings();

  const journey = journeyQ.data;
  const sessions = sessionsQ.data;
  if (!journey || !sessions) return { planWeek: null, repBand: null };

  const ph = derivePhaseContext(
    journey,
    sessions,
    settingsQ.data?.weekly_frequency_target || 3,
    todayISO(),
  );
  return { planWeek: ph.planWeek, repBand: ph.phaseRepTarget };
}
