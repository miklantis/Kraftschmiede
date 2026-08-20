import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { journeyEndDate } from "@/engine";
import { todayISO } from "@/lib/format";
import { supabaseHistoryStore } from "@/lib/historyStore";
import { writeArchiveJourney } from "@/lib/historyWrite";
import { notifyJourneyDone } from "@/lib/journeyDone";
import {
  derivePhaseContext,
  toPlacementPhases,
  toPlacementSessions,
} from "@/lib/phaseContext";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { useActiveJourney } from "./useJourney";
import { useSessions } from "./useSessions";
import { useSettings } from "./useSettings";

// Journey-Abschluss ueber den Kalender (#240): sind alle geplanten Wochen
// erfuellt und vorbei, wandert die Journey ins Archiv. Geprueft wird bei jedem
// App-Start und auf jeder Seite - der Hook haengt in der global gemounteten
// Live-Schicht. Ob die Journey vorbei ist, darf nicht davon abhaengen, welche
// Seite zuerst geoeffnet wird.
//
// Das Signal ist `placement.done` aus derselben Stelle, die ueberall den
// Standort bestimmt (derivePhaseContext) - keine zweite Rechnung daneben.
//
// Der Schreibvorgang ist bewusst einfach und nicht offline-gepuffert: eine
// beendete Einheit ist Dateneingabe und muss gepuffert werden, der Abschluss ist
// nur eine Schlussfolgerung aus Daten, die schon da sind. Schlaegt er fehl,
// greift die Pruefung beim naechsten Oeffnen erneut - der Vorgang heilt sich
// selbst. Die Mutations-Registrierung (ADR-0009) bleibt dafuer unberuehrt.
interface ArchiveVars {
  journeyId: string;
  endDate: string;
  name: string;
}

export function useJourneyCompletion(): void {
  const qc = useQueryClient();
  const journeyQ = useActiveJourney();
  const sessionsQ = useSessions();
  const settingsQ = useSettings();

  // Fuer welche Journey der Abschluss schon losgeschickt ist. Ohne diese Sperre
  // liefe er bei jedem Rendern erneut, solange die Auffrischung noch unterwegs
  // ist.
  const startedFor = useRef<string | null>(null);

  const archive = useMutation<void, Error, ArchiveVars>({
    mutationFn: (vars) => writeArchiveJourney(supabaseHistoryStore, vars),
    onSuccess: (_result, vars) => {
      invalidateGroup(qc, INVALIDATE.journeyDone);
      // Die Meldung kommt erst jetzt. Vorher liefe die Journey in der Datenbank
      // noch weiter, und beim naechsten Start kaeme die Meldung ein zweites Mal.
      notifyJourneyDone(vars.name);
    },
    onError: () => {
      // Sperre loesen: die Bedingung ist unveraendert wahr, der Abschluss holt
      // sich beim naechsten Oeffnen selbst nach.
      startedFor.current = null;
    },
  });
  const mutate = archive.mutate;

  useEffect(() => {
    const journey = journeyQ.data;
    const sessions = sessionsQ.data;
    // Erst rechnen, wenn alle drei Quellen wirklich da sind: mit halben Daten
    // waere das Frequenzziel geraten und der Abschluss damit auch.
    if (!journey || !sessions || !settingsQ.isSuccess) return;
    if (startedFor.current === journey.id) return;

    const freqTarget = settingsQ.data?.weekly_frequency_target || 3;
    const today = todayISO();
    const placement = derivePhaseContext(
      journey,
      sessions,
      freqTarget,
      today,
    ).placement;
    if (!placement?.done) return;

    const endDate = journeyEndDate(
      { id: journey.id, phases: toPlacementPhases(journey.phases) },
      toPlacementSessions(sessions),
      freqTarget,
      today,
    );
    if (!endDate) return;

    startedFor.current = journey.id;
    mutate({ journeyId: journey.id, endDate, name: journey.name });
  }, [
    journeyQ.data,
    sessionsQ.data,
    settingsQ.data,
    settingsQ.isSuccess,
    mutate,
  ]);
}
