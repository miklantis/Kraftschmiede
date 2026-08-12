// Journey-Standort: die eine Stelle fuer die Frage „wo stehe ich gerade?“. Aus
// der aktiven Journey und den Einheiten entsteht die trainingsgetriebene
// Platzierung (journeyPlacement) und daraus alles, was die Anzeige und der Coach
// davon brauchen: aktuelle Phase, Fokus, Ziel-Repband, Volumen-Phase, Woche und
// Lastfaktor. Reine Ableitung ohne DB-/DOM-Bezug.
//
// Auch die Abbildung der DB-Zeilen auf die Engine-Form liegt hier
// (toPlacementSessions) – sie stand vorher in jedem Aufrufer wortgleich.

import { journeyPlacement, phaseRepBand } from "@/engine";
import type { JourneySession, Placement } from "@/engine";
import type { VolumePhase } from "@/engine/types";
import { loadFactorNote, usesLoadFactor } from "@/lib/loadFactor";
import type { JourneyRow, PhaseRow } from "@/schemas";

export type PhaseContextJourney = JourneyRow & { phases: PhaseRow[] };

// Die Session-Felder, die die Platzierung braucht (Teilmenge von SessionRow).
export interface SessionForPhase {
  date: string;
  status: string;
  type: string;
  journey_id: string | null;
}

/** DB-Zeilen (snake_case) auf die Engine-Form der Platzierung bringen. Eine
 *  Stelle statt in jedem Aufrufer. */
export function toPlacementSessions(
  sessions: ReadonlyArray<SessionForPhase>,
): JourneySession[] {
  return sessions.map((s) => ({
    date: s.date,
    status: s.status,
    type: s.type,
    journeyId: s.journey_id,
  }));
}

export interface PhaseContext {
  phaseFocus: { focus?: string } | null;
  // Ziel-Repband der laufenden Phase: gesetzte Grenzen, sonst aus dem Fokus
  // abgeleitet (phaseRepBand). null = die Phase gibt kein Band vor.
  phaseRepTarget: [number, number] | null;
  volumePhase: VolumePhase | null;
  weekInPhase: number;
  journeyId: string | null;
  phaseId: string | null;
  // Lastfaktor der aktuellen Phase – aber nur, wenn die laufende Journey
  // ueberhaupt mit Lastfaktoren arbeitet (irgendeine Phase != 1). Sonst null:
  // dann rechnet der Coach wie gewohnt aus der letzten Leistung, unabhaengig
  // davon, ob an den Uebungen noch ein altes Referenzgewicht haengt.
  loadFactor: number | null;
  // Kurzer Hinweistext zur vorgegebenen Last fuer den Trainingsbildschirm; null,
  // wenn die laufende Journey ohne Lastfaktor arbeitet. In der letzten Phase
  // sagt er zusaetzlich, dass die Vorgabe endet.
  loadNote: string | null;
  // Die Platzierung selbst (Phasen-Index, Woche in der Phase ab 1, globale
  // Woche, durchlaufen ja/nein); null ohne aktive Journey.
  placement: Placement | null;
  // Die laufende Phase als ganze Zeile – fuer Anzeigen, die mehr brauchen als
  // Fokus und Band (Name, Wochenzahl). null ohne aktive Journey/Phase.
  phase: PhaseRow | null;
}

export function derivePhaseContext(
  journey: PhaseContextJourney | null,
  sessions: ReadonlyArray<SessionForPhase>,
  freqTarget: number,
  today: string,
): PhaseContext {
  let phaseFocus: { focus?: string } | null = null;
  let phaseRepTarget: [number, number] | null = null;
  let volumePhase: VolumePhase | null = null;
  let weekInPhase = 0;
  let journeyId: string | null = null;
  let phaseId: string | null = null;
  let loadFactor: number | null = null;
  let loadNote: string | null = null;
  let placement: Placement | null = null;
  let phase: PhaseRow | null = null;

  if (journey) {
    journeyId = journey.id;
    placement = journeyPlacement(
      { id: journey.id, phases: journey.phases },
      toPlacementSessions(sessions),
      freqTarget,
      today,
    );
    phase = journey.phases[placement.phaseIndex] ?? null;
    if (phase) {
      phaseId = phase.id;
      phaseFocus = { focus: phase.focus };
      volumePhase = {
        setsStart: phase.sets_start,
        setsEnd: phase.sets_end,
        weeks: phase.weeks,
        deloadWeek: phase.deload_week,
      };
      weekInPhase = Math.max(0, placement.weekInPhase - 1);
      // Band der Phase: gesetzte Grenzen, sonst aus dem Fokus – gerechnet wird
      // das an einer Stelle (phaseRepBand in der Engine).
      phaseRepTarget = phaseRepBand(
        phase.rep_target_min,
        phase.rep_target_max,
        phase.focus,
      );
      if (usesLoadFactor(journey.phases.map((p) => p.load_factor))) {
        loadFactor = phase.load_factor ?? 1;
        loadNote = loadFactorNote(
          loadFactor,
          placement.phaseIndex === journey.phases.length - 1,
        );
      }
    }
  }

  return {
    phaseFocus,
    phaseRepTarget,
    volumePhase,
    weekInPhase,
    journeyId,
    phaseId,
    loadFactor,
    loadNote,
    placement,
    phase,
  };
}
