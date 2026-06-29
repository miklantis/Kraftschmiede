// Phasen-Kontext der aktiven Journey: aus der trainingsgetriebenen Platzierung
// (journeyPlacement) der aktuelle Fokus, das Ziel-Repband und die Volumen-Phase.
// Reine Ableitung ohne DB-/DOM-Bezug, aus useLiveBuilder herausgezogen, damit der
// Live-Aufbau und die Uebungs-Statusanzeige dieselbe Rechnung nutzen.

import { journeyPlacement } from "@/engine";
import type { VolumePhase } from "@/engine/types";
import type { JourneyRow, PhaseRow } from "@/schemas";

export type PhaseContextJourney = JourneyRow & { phases: PhaseRow[] };

// Die Session-Felder, die die Platzierung braucht (Teilmenge von SessionRow).
export interface SessionForPhase {
  date: string;
  status: string;
  type: string;
  journey_id: string | null;
}

export interface PhaseContext {
  phaseFocus: { focus?: string } | null;
  phaseRepTarget: [number, number] | null;
  volumePhase: VolumePhase | null;
  weekInPhase: number;
  journeyId: string | null;
  phaseId: string | null;
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

  if (journey) {
    journeyId = journey.id;
    const placement = journeyPlacement(
      { id: journey.id, phases: journey.phases },
      sessions.map((s) => ({
        date: s.date,
        status: s.status,
        type: s.type,
        journeyId: s.journey_id,
      })),
      freqTarget,
      today,
    );
    const phase = journey.phases[placement.phaseIndex] ?? null;
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
      if (phase.rep_target_min != null && phase.rep_target_max != null) {
        phaseRepTarget = [phase.rep_target_min, phase.rep_target_max];
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
  };
}
