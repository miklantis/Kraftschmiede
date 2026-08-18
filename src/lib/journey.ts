import { intensityForWeek, plansLoad } from "@/engine/intensity";
import { focusLabel } from "@/lib/labels";
import {
  intensityNote,
  intensityRange,
  loadFactorNote,
  loadPercent,
  usesLoadFactor,
} from "@/lib/loadFactor";
import type { Focus } from "@/schemas/shared";

// Phase einer aktiven Journey, soweit die Anzeige sie braucht. Werte snake_case-
// frei, damit die reine Logik unabhaengig vom DB-Zeilenformat bleibt.
export interface JourneyPhaseInput {
  name: string;
  focus: Focus;
  weeks: number;
  setsStart: number;
  setsEnd: number;
  deloadWeek: number | null;
  repTargetMin: number | null;
  repTargetMax: number | null;
  /** Anteil des Referenzgewichts, den die Phase vorgibt (1 = keine Vorgabe). */
  loadFactor: number;
  /** Geplante Last der Phase in Prozent des 1RM; null ohne Lastrampe. */
  intensityStart?: number | null;
  intensityEnd?: number | null;
}

// Platzierung, soweit die Phasen-Anzeige sie braucht (aus engine.journeyPlacement).
export interface PhasePlacementInfo {
  phaseIndex: number;
  weekInPhase: number;
  done: boolean;
}

export type PhaseState = "past" | "current" | "future";

export interface PhaseDetail {
  k: string;
  v: string;
}

// Anzeige-Modell einer Phase: Zustand, Fokus-Label, Meta-Zeile und die drei
// Detailzeilen. Komponenten bekommen nur fertige Strings.
export interface PhaseView {
  name: string;
  focus: string;
  state: PhaseState;
  isCurrent: boolean;
  mark: string; // "\u2713" bei vergangenen Phasen, sonst ""
  meta: string;
  detail: PhaseDetail[];
  /** Hinweis zur vorgegebenen Last, nur an der laufenden Phase einer
   *  Lastfaktor-Journey; sonst null. */
  loadNote: string | null;
}

function repBand(min: number | null, max: number | null): string {
  if (min == null || max == null) return "?";
  return `${min}\u2013${max}`;
}

function setsRamp(start: number, end: number): string {
  const body = end !== start ? `${start} \u2192 ${end}` : `${start}`;
  return `${body} S\u00e4tze`;
}

// Reine Aufbereitung der Phasen einer aktiven Journey in Anzeige-Modelle.
// Zustand (vergangen/aktuell/kuenftig), Meta-Zeile und Detailzeilen 1:1 wie V1
// (journeyData): bei done sind alle Phasen vergangen; vor dem aktuellen Index
// vergangen, am Index aktuell, danach kuenftig.
// Hinweistext zur geplanten Last der laufenden Woche. null, wenn die Phase die
// Last nicht plant. Die Woche kommt aus der Platzierung (1-basiert), die Rampe
// rechnet 0-basiert - wie ueberall.
function wochenLast(
  p: JourneyPhaseInput,
  placement: PhasePlacementInfo,
): string | null {
  const phase = {
    intensityStart: p.intensityStart,
    intensityEnd: p.intensityEnd,
    weeks: p.weeks,
    deloadWeek: p.deloadWeek,
  };
  if (!plansLoad(phase)) return null;
  const wi = Math.max(0, placement.weekInPhase - 1);
  const istEntlastung = p.deloadWeek != null && wi === p.deloadWeek - 1;
  return intensityNote(intensityForWeek(phase, wi), istEntlastung);
}

export function buildPhaseViews(
  phases: JourneyPhaseInput[],
  placement: PhasePlacementInfo,
): PhaseView[] {
  // Gibt die Journey die Last vor, bekommt jede Phase eine Detailzeile "Last"
  // und die laufende Phase zusaetzlich den erklaerenden Hinweis. Journeys ohne
  // Lastfaktor sehen unveraendert aus.
  const withLoad = usesLoadFactor(phases.map((p) => p.loadFactor));
  return phases.map((p, i) => {
    // Lastrampe der Phase (zweites Steuerrad). Beides haengt nie an derselben
    // Phase, darum reicht eine Detailzeile fuer beide Wege.
    const rampe = intensityRange(p.intensityStart, p.intensityEnd);
    const state: PhaseState = placement.done
      ? "past"
      : i < placement.phaseIndex
        ? "past"
        : i === placement.phaseIndex
          ? "current"
          : "future";
    const isCurrent = state === "current";
    const meta = isCurrent
      ? `Woche ${placement.weekInPhase} / ${p.weeks || "?"}`
      : `${p.weeks} ${p.weeks === 1 ? "Woche" : "Wochen"}`;
    return {
      name: p.name,
      focus: focusLabel(p.focus) || p.name,
      state,
      isCurrent,
      mark: state === "past" ? "\u2713" : "",
      meta,
      detail: [
        {
          k: "Wiederholungsband",
          v: `${repBand(p.repTargetMin, p.repTargetMax)} Wdh`,
        },
        { k: "Satz-Rampe / Woche", v: setsRamp(p.setsStart, p.setsEnd) },
        { k: "Deload", v: p.deloadWeek ? `Woche ${p.deloadWeek}` : "keiner" },
        ...(withLoad
          ? [{ k: "Vorgegebene Last", v: loadPercent(p.loadFactor) }]
          : []),
        ...(rampe ? [{ k: "Geplante Last / Woche", v: rampe }] : []),
      ],
      loadNote: !isCurrent
        ? null
        : withLoad
          ? loadFactorNote(p.loadFactor, i === phases.length - 1)
          : wochenLast(p, placement),
    };
  });
}

// Gesamtwochen einer Phasenliste (fuer die Dauer-Angabe im Vorlagen-Waehler).
export function totalWeeks(phases: { weeks: number }[]): number {
  return phases.reduce((acc, p) => acc + (p.weeks || 0), 0);
}
