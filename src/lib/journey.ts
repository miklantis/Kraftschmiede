import { focusLabel } from "@/lib/labels";
import { loadFactorNote, loadPercent, usesLoadFactor } from "@/lib/loadFactor";
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
}

// Platzierung, soweit die Phasen-Anzeige sie braucht (aus engine.journeyPlacement).
export interface PhasePlacementInfo {
  phaseIndex: number;
  weekInPhase: number;
  done: boolean;
}

// "preview" ist der Zustand ohne laufende Journey (Vorlagenliste): weder
// vergangen noch aktuell noch kuenftig, nur neutral dargestellt.
export type PhaseState = "past" | "current" | "future" | "preview";

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
  /** Ablauf-Hinweis der laufenden Kombiwoche (Testphase); sonst null. */
  comboNote: string | null;
}

// Ablauf der Kombiwoche in einem Satz: die Testphase fuehrt keinen Ablauf, sie
// erklaert ihn nur - den 1RM-Test startet der Nutzer wie bisher von der
// Uebungsseite (Issue #225, Schritt 4).
export const COMBO_NOTE =
  "Kombiwoche: Anfang der Woche die Entlastung (3 Sätze, " +
  "60 % vom Startgewicht), Mitte der Woche Pause, Ende der Woche der " +
  "1RM-Test von der Übungsseite. Die Woche gilt mit dem Test als erfüllt.";

function repBand(min: number | null, max: number | null): string {
  if (min == null || max == null) return "?";
  return `${min}\u2013${max}`;
}

function setsRamp(start: number, end: number): string {
  const body = end !== start ? `${start} \u2192 ${end}` : `${start}`;
  return `${body} S\u00e4tze`;
}

// Detailzeilen einer Phase. Gleich fuer laufende Journeys und Vorlagen-Vorschau,
// damit beide Ansichten nicht auseinanderlaufen.
function phaseDetail(p: JourneyPhaseInput, withLoad: boolean): PhaseDetail[] {
  return [
    {
      k: "Wiederholungsband",
      v: `${repBand(p.repTargetMin, p.repTargetMax)} Wdh`,
    },
    {
      // Kraftphasen fahren eine feste Satzzahl - dort waere "Rampe" falsch.
      k: p.setsStart === p.setsEnd ? "Sätze / Woche" : "Satz-Rampe / Woche",
      v: setsRamp(p.setsStart, p.setsEnd),
    },
    { k: "Deload", v: p.deloadWeek ? `Woche ${p.deloadWeek}` : "keiner" },
    ...(withLoad
      ? [{ k: "Vorgegebene Last", v: loadPercent(p.loadFactor) }]
      : []),
  ];
}

// Reine Aufbereitung der Phasen einer aktiven Journey in Anzeige-Modelle.
// Zustand (vergangen/aktuell/kuenftig), Meta-Zeile und Detailzeilen 1:1 wie V1
// (journeyData): bei done sind alle Phasen vergangen; vor dem aktuellen Index
// vergangen, am Index aktuell, danach kuenftig.
export function buildPhaseViews(
  phases: JourneyPhaseInput[],
  placement: PhasePlacementInfo,
): PhaseView[] {
  // Gibt die Journey die Last vor, bekommt jede Phase eine Detailzeile "Last"
  // und die laufende Phase zusaetzlich den erklaerenden Hinweis. Journeys ohne
  // Lastfaktor sehen unveraendert aus.
  const withLoad = usesLoadFactor(phases.map((p) => p.loadFactor));
  return phases.map((p, i) => {
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
      detail: phaseDetail(p, withLoad),
      loadNote:
        withLoad && isCurrent
          ? loadFactorNote(p.loadFactor, i === phases.length - 1)
          : null,
      // Nur an der laufenden Testphase: dort steht der Ablauf der Kombiwoche.
      comboNote: isCurrent && p.focus === "test" ? COMBO_NOTE : null,
    };
  });
}

// Aufbereitung der Phasen einer Vorlage (Vorlagenliste): es laeuft keine Journey,
// also ist keine Phase aktuell oder vergangen. Alle Phasen sind neutral, zeigen
// ihre Dauer und dieselben Detailzeilen wie auf der Journey-Seite.
export function buildTemplatePhaseViews(
  phases: JourneyPhaseInput[],
): PhaseView[] {
  const withLoad = usesLoadFactor(phases.map((p) => p.loadFactor));
  return phases.map((p) => ({
    name: p.name,
    focus: focusLabel(p.focus) || p.name,
    state: "preview" as const,
    isCurrent: false,
    mark: "",
    meta: `${p.weeks} ${p.weeks === 1 ? "Woche" : "Wochen"}`,
    detail: phaseDetail(p, withLoad),
    loadNote: null,
    comboNote: null,
  }));
}

// Gesamtwochen einer Phasenliste (fuer die Dauer-Angabe im Vorlagen-Waehler).
export function totalWeeks(phases: { weeks: number }[]): number {
  return phases.reduce((acc, p) => acc + (p.weeks || 0), 0);
}
