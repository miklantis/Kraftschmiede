import type { LoadPlan, WeekPlan, WeekPlanWeek } from "@/engine";
import { loadPlanForWeek, weekDemandsSession } from "@/engine";
import {
  loadFactorNote,
  loadPercent,
  loadSpanLabel,
  usesLoadPlan,
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
  /** Lastliste der Phase: je Phasenwoche der Anteil des Referenzgewichts;
   *  null = die Phase gibt keine Last vor. */
  loadPlan: LoadPlan | null;
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
  /** "4 × 4 · RIR 1" - Saetze, Wiederholungen, Ziel-Anstrengung. Bei einer
   *  Phase, die nur die Last vorgibt, steht dort deren Anteil ("80 %"). */
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
  /** Hinweis zur vorgegebenen Last, nur an der laufenden Phase einer Journey
   *  mit Lastvorgabe; sonst null. */
  loadNote: string | null;
  /** Ablauf-Hinweis der laufenden Testphase; sonst null. */
  testNote: string | null;
  /** Wochentabelle an der laufenden Phase; sonst null. Sie entsteht aus der
   *  Wochenliste oder - wo es keine gibt - aus der Lastliste. Die Testphase
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

// Wert der Last-Detailzeile. An der laufenden Phase steht der Anteil ihrer
// laufenden Woche, ueberall sonst die Spanne ("65 → 95 %") - bei einem Block,
// der von 65 auf 95 wandert, waere eine einzelne Zahl fuer eine vergangene oder
// kuenftige Phase schlicht falsch, und in der Vorlagen-Vorschau gibt es
// ueberhaupt keine laufende Woche. Phasen ohne eigene Liste sagen "keine": die
// Zeile bleibt stehen, damit die Karten derselben Journey gleich aufgebaut sind.
function loadValue(plan: LoadPlan | null, currentWeek: number | null): string {
  if (currentWeek == null) return loadSpanLabel(plan) ?? "keine";
  const pct = loadPlanForWeek(plan, currentWeek);
  return pct == null ? "keine" : loadPercent(pct);
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
function phaseDetail(
  p: JourneyPhaseInput,
  withLoad: boolean,
  // 1-basierte Woche in der Phase, wenn sie gerade laeuft; sonst null.
  currentWeek: number | null,
): PhaseDetail[] {
  const geplant = p.weekPlan?.filter(weekDemandsSession) ?? [];
  const plan = geplant.length > 0 ? geplant : null;
  const loadRow = withLoad
    ? [{ k: "Vorgegebene Last", v: loadValue(p.loadPlan, currentWeek) }]
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

// Zustand einer Phasenwoche gegenueber der laufenden Woche.
function weekState(
  week: number,
  weekInPhase: number,
): Exclude<PhaseState, "preview"> {
  return week < weekInPhase
    ? "past"
    : week === weekInPhase
      ? "current"
      : "future";
}

// Wochentabelle des Plans: je Woche Saetze, Wiederholungen, Ziel-Anstrengung und
// das Wochenziel. Der Zustand kommt aus der laufenden Woche der Phase -
// abgeschlossene Wochen sind abgehakt, die laufende ist markiert.
function planWeekRows(plan: WeekPlan, weekInPhase: number): PhaseWeekRow[] {
  return plan
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((w) => {
      const state = weekState(w.week, weekInPhase);
      return {
        label: `Woche ${w.week}`,
        targets: weekTargets(w),
        note: w.note,
        state,
        mark: state === "past" ? "✓" : "",
      };
    });
}

// Zweiter Bauweg derselben Tabelle: aus der Lastliste statt aus der
// Wochenliste. Der Wiederaufbau gibt nur das Gewicht vor - Saetze und
// Wiederholungen bleiben beim Coach -, hat also gar keine Wochenliste. Ohne
// diesen Weg bliebe seine Laststufen-Leiter unsichtbar, obwohl sie das ist,
// was die Phase ausmacht (Konzept Bausteine, Abschnitt 10).
//
// Eine Zeile je Phasenwoche, nicht je Listenzeile: der Anteil kommt ueber
// loadPlanForWeek, damit eine kuerzere Liste die Tabelle nicht verkuerzt,
// sondern - wie ueberall sonst - auf ihrem letzten Wert stehen bleibt. Der
// Wochentext bleibt leer; die Leiter erklaert sich aus den Prozentwerten, und
// derselbe Satz an jeder Zeile waere nur Rauschen.
function loadWeekRows(
  plan: LoadPlan,
  weeks: number,
  weekInPhase: number,
): PhaseWeekRow[] {
  const anzahl = weeks > 0 ? weeks : plan.length;
  return Array.from({ length: anzahl }, (_, i) => {
    const week = i + 1;
    const state = weekState(week, weekInPhase);
    const pct = loadPlanForWeek(plan, week);
    return {
      label: `Woche ${week}`,
      targets: pct == null ? "" : loadPercent(pct),
      note: "",
      state,
      mark: state === "past" ? "✓" : "",
    };
  });
}

// Wochentabelle der laufenden Phase auf dem Weg, den die Phase hergibt:
// Wochenliste zuerst, sonst die Lastliste, sonst keine Tabelle. Die Testphase
// zeigt stattdessen ihren Ablauf (testNote) - dort stuenden Zahlen, nach denen
// gar nicht trainiert wird.
function phaseWeekRows(
  p: JourneyPhaseInput,
  weekInPhase: number,
): PhaseWeekRow[] | null {
  if (p.focus === "test") return null;
  if (p.weekPlan?.length) return planWeekRows(p.weekPlan, weekInPhase);
  if (p.loadPlan?.length) return loadWeekRows(p.loadPlan, p.weeks, weekInPhase);
  return null;
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
  // Lastvorgabe sehen unveraendert aus.
  const withLoad = usesLoadPlan(phases.map((p) => p.loadPlan));
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
      detail: phaseDetail(p, withLoad, isCurrent ? placement.weekInPhase : null),
      loadNote:
        withLoad && isCurrent
          ? loadFactorNote(
              loadPlanForWeek(p.loadPlan, placement.weekInPhase),
              i === phases.length - 1,
            )
          : null,
      // Nur an der laufenden Testphase: dort steht ihr Ablauf.
      testNote: isCurrent && p.focus === "test" ? testPhaseNote(p.weeks) : null,
      // Wochentabelle nur an der laufenden Phase - aus ihrer Wochenliste oder,
      // wo es keine gibt, aus ihrer Lastliste.
      weekRows: isCurrent ? phaseWeekRows(p, placement.weekInPhase) : null,
    };
  });
}

// Aufbereitung der Phasen einer Vorlage (Vorlagenliste): es laeuft keine Journey,
// also ist keine Phase aktuell oder vergangen. Alle Phasen sind neutral, zeigen
// ihre Dauer und dieselben Detailzeilen wie auf der Journey-Seite.
export function buildTemplatePhaseViews(
  phases: JourneyPhaseInput[],
): PhaseView[] {
  const withLoad = usesLoadPlan(phases.map((p) => p.loadPlan));
  return phases.map((p) => ({
    name: p.name,
    state: "preview" as const,
    isCurrent: false,
    mark: "",
    meta: `${p.weeks} ${p.weeks === 1 ? "Woche" : "Wochen"}`,
    // Ohne laufende Woche zeigt die Vorschau die Spanne der Lastliste.
    detail: phaseDetail(p, withLoad, null),
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
