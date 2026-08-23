// Journey-Standort: die eine Stelle fuer die Frage „wo stehe ich gerade?“. Aus
// der aktiven Journey und den Einheiten entsteht die trainingsgetriebene
// Platzierung (journeyPlacement) und daraus alles, was die Anzeige und der Coach
// davon brauchen: aktuelle Phase, Fokus, Ziel-Repband, Volumen-Phase, Woche und
// Lastfaktor. Reine Ableitung ohne DB-/DOM-Bezug.
//
// Auch die Abbildung der DB-Zeilen auf die Engine-Form liegt hier
// (toPlacementSessions) – sie stand vorher in jedem Aufrufer wortgleich.

import {
  buildsRisingPlan,
  buildsTestPlan,
  journeyPlacement,
  nextWeekPlanWeek,
  phaseRepBand,
  planGovernsLoad,
  weekDemandsSession,
  weekPlanForWeek,
} from "@/engine";
import type {
  JourneySession,
  PhaseLike,
  PhaseMark,
  Placement,
  WeekPlan,
  WeekPlanWeek,
} from "@/engine";
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

// Die Phasen-Felder, die die Platzierung braucht (Teilmenge von PhaseRow).
export interface PhaseForPlacement {
  id: string;
  weeks: number;
  week_plan: WeekPlan | null;
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

/** Phasen-Zeilen (snake_case) auf die Engine-Form bringen. Der Wochenplan
 *  gehoert dazu: nur er sagt, ob eine Woche ueberhaupt eine Einheit verlangt -
 *  und genau daran haengt, ob die reine Testwoche sich selbst erfuellt (#240). */
export function toPlacementPhases(
  phases: ReadonlyArray<PhaseForPlacement>,
): PhaseLike[] {
  return phases.map((p) => ({
    id: p.id,
    weeks: p.weeks,
    weekPlan: p.week_plan ?? null,
  }));
}

export interface PhaseContext {
  phaseFocus: PhaseMark | null;
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
  // Geltende Zeile des Phasen-Wochenplans (Saetze, Wiederholungen, Ziel-
  // Anstrengung). Gesetzt nur, wenn die Phase ihre Last ueber den Plan steuert
  // (Kraft/Schnellkraft als Rampe, Testphase als Entlastung); sonst null und
  // der Coach rechnet wie bisher. Auch die reine Testwoche laesst das Feld leer:
  // sie plant keine Einheit und gibt darum nichts vor.
  planWeek: WeekPlanWeek | null;
  // Zeile der Vorwoche – Massstab, an dem die letzte Einheit gemessen wird.
  prevPlanWeek: WeekPlanWeek | null;
  // Zeile der Folgewoche – Grundlage des Ausblicks auf der Uebungskarte. In der
  // letzten Phasenwoche null: dort kommt keine naechste Woche mehr (#268).
  nextPlanWeek: WeekPlanWeek | null;
  // Erste Zeile des Plans – Bezug des Startgewichts beim Phaseneintritt.
  firstPlanWeek: WeekPlanWeek | null;
  // Entlastet die laufende Planwoche (Testphase), statt zu steigern? Dann
  // rechnet der Plan vom Startgewicht X der vorangegangenen Kraftphase.
  deload: boolean;
  // Phase, an die der Anker der Uebung gebunden sein muss, damit er zaehlt: in
  // der Rampe die laufende Phase selbst, in der Entlastung die vorangegangene
  // Kraftphase (dort liegt das Startgewicht X). null = kein Plan-Bezug.
  anchorPhaseId: string | null;
  // Laeuft gerade die reine Testwoche am Ende einer Testphase? Sie plant keine
  // Einheit und erfuellt sich selbst - der Trainingsbildschirm zeigt dort statt
  // einer Vorgabe den Hinweis auf die Frist und die Testliste (#240). Nach dem
  // Durchlaufen der Journey ist das Feld falsch: dann ist nichts mehr offen.
  testWeek: boolean;
}

export function derivePhaseContext(
  journey: PhaseContextJourney | null,
  sessions: ReadonlyArray<SessionForPhase>,
  freqTarget: number,
  today: string,
): PhaseContext {
  let phaseFocus: PhaseMark | null = null;
  let phaseRepTarget: [number, number] | null = null;
  let volumePhase: VolumePhase | null = null;
  let weekInPhase = 0;
  let journeyId: string | null = null;
  let phaseId: string | null = null;
  let loadFactor: number | null = null;
  let loadNote: string | null = null;
  let placement: Placement | null = null;
  let phase: PhaseRow | null = null;
  let planWeek: WeekPlanWeek | null = null;
  let prevPlanWeek: WeekPlanWeek | null = null;
  let nextPlanWeek: WeekPlanWeek | null = null;
  let firstPlanWeek: WeekPlanWeek | null = null;
  let deload = false;
  let anchorPhaseId: string | null = null;
  let testWeek = false;

  if (journey) {
    journeyId = journey.id;
    placement = journeyPlacement(
      { id: journey.id, phases: toPlacementPhases(journey.phases) },
      toPlacementSessions(sessions),
      freqTarget,
      today,
    );
    phase = journey.phases[placement.phaseIndex] ?? null;
    if (phase) {
      phaseId = phase.id;
      // Der Coach bekommt Fokus und Bauart-Vermerk der Phase: der Fokus sagt,
      // was die Phase ist, der Vermerk, wie ihre Listen entstanden sind.
      phaseFocus = {
        focus: phase.focus,
        plan_builder: phase.plan_builder,
        load_builder: phase.load_builder,
        careful: phase.careful,
      };
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
      // Wochenplan der Phase: er setzt Saetze, Wiederholungen und Ziel-
      // Anstrengung und steuert ueber engine/planLoad auch das Gewicht - in
      // Kraft- und Schnellkraftphasen als Rampe, in der Testphase als
      // Entlastung vom Startgewicht X der Kraftphase davor.
      //
      // Die reine Testwoche am Ende der Testphase plant keine Einheit. Sie gibt
      // deshalb gar nichts vor: der ganze Plan-Block bleibt leer, und der Coach
      // rechnet dort wie in einer Phase ohne Plan (#240).
      const week = weekPlanForWeek(phase.week_plan ?? null, placement.weekInPhase);
      // Die reine Testwoche: Testphase, Plan vorhanden, Woche verlangt nichts -
      // und die Journey laeuft noch. Ist sie durchlaufen, steht der Abschluss
      // an und nicht mehr die Frist.
      testWeek =
        buildsTestPlan(phase) &&
        phase.week_plan != null &&
        !weekDemandsSession(week) &&
        !placement.done;
      if (planGovernsLoad(phase) && phase.week_plan && weekDemandsSession(week)) {
        planWeek = week;
        prevPlanWeek = weekPlanForWeek(phase.week_plan, placement.weekInPhase - 1);
        nextPlanWeek = nextWeekPlanWeek(phase.week_plan, placement.weekInPhase);
        firstPlanWeek = phase.week_plan[0] ?? null;
        deload = buildsTestPlan(phase);
        // Bezugsphase des Ankers: in der Rampe die Phase selbst, in der
        // Entlastung die naechste Kraft-/Schnellkraftphase davor. Gibt es keine
        // (Testphase am Anfang der Journey), bleibt der Bezug leer und die
        // Entlastung rechnet aus dem 1RM.
        anchorPhaseId = deload
          ? (journey.phases
              .slice(0, placement.phaseIndex)
              .reverse()
              .find((p) => buildsRisingPlan(p))?.id ?? null)
          : phase.id;
      }
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
    planWeek,
    prevPlanWeek,
    nextPlanWeek,
    firstPlanWeek,
    deload,
    anchorPhaseId,
    testWeek,
  };
}
