import type { WeekPlan, WeekPlanWeek } from "@/engine";
import { weekDemandsSession } from "@/engine";
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
  /** Wochenplan der Phase (Saetze, Wiederholungen, RIR je Woche); null = die
   *  Phase laeuft ueber die Doppelprogression des Coaches. */
  weekPlan: WeekPlan | null;
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

// Eine Woche des Wochenplans in der Phasenliste (Issue #225, Schritt 5).
export interface PhaseWeekRow {
  /** "Woche 3". */
  label: string;
  /** "4 × 4 · RIR 1" - Saetze, Wiederholungen, Ziel-Anstrengung. */
  targets: string;
  /** Wochenziel in einem kurzen Satz (aus dem Plan). */
  note: string;
  /** Vergangen, laufend oder kuenftig - wie bei den Phasen selbst. */
  state: Exclude<PhaseState, "preview">;
  /** "✓" an abgeschlossenen Wochen, sonst "". */
  mark: string;
}

// Anzeige-Modell einer Phase: Zustand, Fokus-Label, Meta-Zeile und die drei
// Detailzeilen. Komponenten bekommen nur fertige Strings.
export interface PhaseView {
  name: string;
  state: PhaseState;
  isCurrent: boolean;
  mark: string; // "\u2713" bei vergangenen Phasen, sonst ""
  meta: string;
  detail: PhaseDetail[];
  /** Hinweis zur vorgegebenen Last, nur an der laufenden Phase einer
   *  Lastfaktor-Journey; sonst null. */
  loadNote: string | null;
  /** Ablauf-Hinweis der laufenden Testphase; sonst null. */
  testNote: string | null;
  /** Wochentabelle des Plans an der laufenden Phase; sonst null. Die Testphase
   *  zeigt ihren Ablauf (testNote) statt Zahlen. */
  weekRows: PhaseWeekRow[] | null;
}

// Ablauf der Testphase in einem Satz: sie fuehrt keinen Ablauf, sie erklaert ihn
// nur - den 1RM-Test startet der Nutzer wie bisher von der Uebungsseite. Seit
// #240 besteht die Phase aus Entlastungswochen und der reinen Testwoche am
// Ende; eine einwoechige Testphase ist nur die Testwoche.
export function testPhaseNote(weeks: number): string {
  const test =
    "In der Testwoche gibt es keine Vorgabe: Der 1RM-Test läuft wie gewohnt " +
    "von der Übungsseite, Training ist erlaubt, aber nicht eingeplant.";
  return weeks > 1
    ? "Erst die Entlastung (2 Sätze mit 60 % vom Startgewicht), dann die " +
        "Testwoche. " +
        test
    : "Reine Testwoche. " + test;
}

function repBand(min: number | null, max: number | null): string {
  if (min == null || max == null) return "?";
  return `${min}\u2013${max}`;
}

function setsRamp(start: number, end: number): string {
  const body = end !== start ? `${start} \u2192 ${end}` : `${start}`;
  return `${body} S\u00e4tze`;
}

// Spanne einer Plan-Groesse ueber alle Wochen: eine Zahl, wenn sie steht, sonst
// "erste -> letzte" (die Leiter der Kraftphase laeuft von 5 auf 2).
function planSpan(values: number[]): string {
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? first;
  return values.every((v) => v === first)
    ? `${first}`
    : `${first} → ${last}`;
}

// Wiederholungen des Plans. Arbeitet er mit einem Band (Entlastung: 3-5), steht
// das Band statt einer Leiter.
function planReps(plan: WeekPlan): string {
  const band = plan.find((w) => w.repsMax != null && w.repsMax !== w.reps);
  if (band) return `${band.reps}–${band.repsMax} Wdh`;
  return `${planSpan(plan.map((w) => w.reps))} Wdh`;
}

// Detailzeilen einer Phase. Gleich fuer laufende Journeys und Vorlagen-Vorschau,
// damit beide Ansichten nicht auseinanderlaufen.
//
// Traegt die Phase einen Wochenplan, stehen dort dessen Werte: das
// Wiederholungsband der Phase ruht dann (es bleibt nur als Rueckfall stehen) und
// die Satzzahl kommt aus dem Plan statt aus der Satz-Rampe - sonst zeigte die
// Kraftphase ein Band, nach dem gar nicht trainiert wird. Statt der Deload-Woche
// (die es dort nicht gibt) steht die Ziel-Anstrengung.
//
// Gezaehlt werden nur Wochen mit geplanter Einheit: die reine Testwoche verlangt
// nichts, in den Spannen stuende sonst "2 → 0 Sätze". Plant die Phase gar nichts
// (einwoechige Testphase), sagen die Zeilen genau das.
function phaseDetail(p: JourneyPhaseInput, withLoad: boolean): PhaseDetail[] {
  const geplant = p.weekPlan?.filter(weekDemandsSession) ?? [];
  const plan = geplant.length > 0 ? geplant : null;
  const loadRow = withLoad
    ? [{ k: "Vorgegebene Last", v: loadPercent(p.loadFactor) }]
    : [];
  if (p.weekPlan && p.weekPlan.length > 0 && !plan) {
    return [
      { k: "Vorgabe", v: "keine" },
      { k: "Woche", v: "1RM-Test" },
      ...loadRow,
    ];
  }
  return [
    plan
      ? { k: "Wiederholungen", v: planReps(plan) }
      : {
          k: "Wiederholungsband",
          v: `${repBand(p.repTargetMin, p.repTargetMax)} Wdh`,
        },
    plan
      ? {
          k: "Sätze / Woche",
          v: `${planSpan(plan.map((w) => w.sets))} Sätze`,
        }
      : {
          // Kraftphasen fahren eine feste Satzzahl - dort waere "Rampe" falsch.
          k: p.setsStart === p.setsEnd ? "Sätze / Woche" : "Satz-Rampe / Woche",
          v: setsRamp(p.setsStart, p.setsEnd),
        },
    plan
      ? {
          k: "Ziel-Anstrengung",
          v: `RIR ${planSpan(plan.map((w) => w.rir))}`,
        }
      : { k: "Deload", v: p.deloadWeek ? `Woche ${p.deloadWeek}` : "keiner" },
    ...loadRow,
  ];
}

/** Kurzform einer Planwoche: "4 × 4 · RIR 1" - Saetze, Wiederholungen,
 *  Ziel-Anstrengung. Die Formulierung der Journey-Seite; das Popup "Uebung
 *  anpassen" zeigt dieselbe Zeile, wenn der Wochenplan die Uebung regiert
 *  (Issue #297), und beide duerfen nicht auseinanderlaufen. */
export function weekTargets(w: WeekPlanWeek): string {
  const reps =
    w.repsMax != null && w.repsMax !== w.reps
      ? `${w.reps}–${w.repsMax}`
      : `${w.reps}`;
  return `${w.sets} × ${reps} · RIR ${w.rir}`;
}

// Wochentabelle des Plans: je Woche Saetze, Wiederholungen, Ziel-Anstrengung und
// das Wochenziel. Der Zustand kommt aus der laufenden Woche der Phase -
// abgeschlossene Wochen sind abgehakt, die laufende ist markiert.
function planWeekRows(plan: WeekPlan, weekInPhase: number): PhaseWeekRow[] {
  return plan
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((w) => {
      const state: Exclude<PhaseState, "preview"> =
        w.week < weekInPhase
          ? "past"
          : w.week === weekInPhase
            ? "current"
            : "future";
      return {
        label: `Woche ${w.week}`,
        targets: weekTargets(w),
        note: w.note,
        state,
        mark: state === "past" ? "✓" : "",
      };
    });
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
      state,
      isCurrent,
      mark: state === "past" ? "\u2713" : "",
      meta,
      detail: phaseDetail(p, withLoad),
      loadNote:
        withLoad && isCurrent
          ? loadFactorNote(p.loadFactor, i === phases.length - 1)
          : null,
      // Nur an der laufenden Testphase: dort steht ihr Ablauf.
      testNote: isCurrent && p.focus === "test" ? testPhaseNote(p.weeks) : null,
      // Wochentabelle nur an der laufenden Phase mit Plan; die Testphase zeigt
      // ihren Ablauf (testNote) statt Zahlen.
      weekRows:
        isCurrent && p.weekPlan && p.focus !== "test"
          ? planWeekRows(p.weekPlan, placement.weekInPhase)
          : null,
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
    state: "preview" as const,
    isCurrent: false,
    mark: "",
    meta: `${p.weeks} ${p.weeks === 1 ? "Woche" : "Wochen"}`,
    detail: phaseDetail(p, withLoad),
    loadNote: null,
    testNote: null,
    // In der Vorschau laeuft keine Woche - die Tabelle gehoert zur laufenden
    // Journey, die Vorlage zeigt nur die Eckwerte der Phase.
    weekRows: null,
  }));
}

// Gesamtwochen einer Phasenliste (fuer die Dauer-Angabe im Vorlagen-Waehler).
export function totalWeeks(phases: { weeks: number }[]): number {
  return phases.reduce((acc, p) => acc + (p.weeks || 0), 0);
}
