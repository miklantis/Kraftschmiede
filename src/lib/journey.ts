import type {
  LoadPlan,
  PhaseBuildRules,
  WeekPlan,
  WeekPlanWeek,
} from "@/engine";
import { buildPhasePlans, loadPlanForWeek, weekDemandsSession } from "@/engine";
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
  /** Vergangen, laufend oder kuenftig - wie bei den Phasen selbst. In der
   *  Vorlagen-Vorschau laeuft keine Woche, dort stehen alle Zeilen neutral. */
  state: PhaseState;
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
  /** Eckwerte der Phase. Leer, wo die Wochentabelle sie schon Woche fuer Woche
   *  auffuehrt - dann zeigt die Anzeige gar keine Detail-Kachel (Issue #362). */
  detail: PhaseDetail[];
  /** Hinweis zur vorgegebenen Last, nur an der laufenden Phase einer Journey
   *  mit Lastvorgabe; sonst null. */
  loadNote: string | null;
  /** Wochentabelle an der laufenden Phase; sonst null. Sie entsteht aus der
   *  Wochenliste oder - wo es keine gibt - aus der Lastliste. */
  weekRows: PhaseWeekRow[] | null;
}

/** Was in der Zeile der reinen Testwoche steht - sie plant keine Einheit, also
 *  stehen dort keine Zahlen. Auch die Zusammenfassung einer nicht laufenden
 *  Testphase benutzt dieses Wort, damit beide Ansichten dasselbe sagen. */
const TEST_WEEK_TARGETS = "1RM-Test";

function repBand(min: number | null, max: number | null): string {
  if (min == null || max == null) return "?";
  return `${min}\u2013${max}`;
}

function setsRamp(start: number, end: number): string {
  const body = end !== start ? `${start} \u2192 ${end}` : `${start}`;
  return `${body} S\u00e4tze`;
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

// Detailzeilen einer Phase: die Eckwerte, nach denen der Coach arbeitet. Gleich
// fuer laufende Journeys und Vorlagen-Vorschau, damit beide Ansichten nicht
// auseinanderlaufen.
//
// `covered` sagt, was die Wochentabelle unter der Phase schon Woche fuer Woche
// auffuehrt (Issue #362) - was dort steht, faellt hier weg, statt doppelt
// dazustehen. Eine Phase mit Wochenplan traegt in der Tabelle alles, was hier
// stuende, und bekommt deshalb gar keine Kachel mehr; bei einer Lasttabelle
// faellt nur die Lastzeile weg, Band, Satz-Rampe und Deload stehen dort nicht.
function phaseDetail(
  p: JourneyPhaseInput,
  withLoad: boolean,
  // 1-basierte Woche in der Phase, wenn sie gerade laeuft; sonst null.
  currentWeek: number | null,
  // Quelle der Wochentabelle unter dieser Phase; null = es gibt keine.
  covered: WeekTableSource | null = null,
): PhaseDetail[] {
  // Die Lasttabelle nennt den Anteil jeder Woche - die Zusammenfassung daneben
  // waere reine Wiederholung.
  const loadRow =
    withLoad && covered !== "load"
      ? [{ k: "Vorgegebene Last", v: loadValue(p.loadPlan, currentWeek) }]
      : [];
  // Uebrig bleibt hoechstens die Last - und auch nur, wenn die Phase ueberhaupt
  // eine vorgibt; sonst bliebe eine Kachel mit einem einzelnen "keine" stehen.
  if (covered === "plan") return p.loadPlan?.length ? loadRow : [];
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

// Zustand einer Phasenwoche gegenueber der Bezugswoche der Phase. null heisst:
// es laeuft keine Journey (Vorlagen-Vorschau), dort ist keine Woche voraus oder
// zurueck.
function weekState(week: number, weekInPhase: number | null): PhaseState {
  if (weekInPhase === null) return "preview";
  return week < weekInPhase
    ? "past"
    : week === weekInPhase
      ? "current"
      : "future";
}

// Bezugswoche fuer die Wochentabelle einer Phase: an der laufenden Phase ihre
// laufende Woche, an einer vergangenen liegen alle Wochen dahinter, an einer
// kuenftigen alle davor. So markiert dieselbe Tabelle an jeder Phase den
// richtigen Stand (Issue #366).
function tableWeek(
  state: PhaseState,
  weeks: number,
  weekInPhase: number,
): number | null {
  if (state === "current") return weekInPhase;
  if (state === "past") return weeks + 1;
  if (state === "future") return 0;
  return null;
}

// Wochentabelle des Plans: je Woche Saetze, Wiederholungen, Ziel-Anstrengung und
// das Wochenziel. Der Zustand kommt aus der laufenden Woche der Phase -
// abgeschlossene Wochen sind abgehakt, die laufende ist markiert.
function planWeekRows(
  plan: WeekPlan,
  weekInPhase: number | null,
): PhaseWeekRow[] {
  return plan
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((w) => {
      const state = weekState(w.week, weekInPhase);
      return {
        label: `Woche ${w.week}`,
        // Die reine Testwoche plant nichts - "0 × 1 · RIR 0" waere Unsinn.
        targets: weekDemandsSession(w) ? weekTargets(w) : TEST_WEEK_TARGETS,
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
  weekInPhase: number | null,
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

// Woraus die Wochentabelle entstanden ist. Entscheidet mit, welche Detailzeilen
// die Phase noch braucht: die Tabelle aus der Wochenliste traegt Saetze,
// Wiederholungen und Ziel-Anstrengung, die aus der Lastliste den Lastanteil.
type WeekTableSource = "plan" | "load";

interface PhaseWeekTable {
  rows: PhaseWeekRow[];
  source: WeekTableSource;
}

// Wochentabelle einer Phase auf dem Weg, den die Phase hergibt: Wochenliste
// zuerst, sonst die Lastliste, sonst keine Tabelle.
//
// Sie haengt nicht mehr an der laufenden Phase (#366): jede Phase mit Plan zeigt
// ihre Wochen, nur der markierte Stand unterscheidet sich. Die Testphase ist
// dabei keine Ausnahme (#364) - ihre Testwoche plant nichts, dort steht der Test
// statt Zahlen (planWeekRows).
function phaseWeekTable(
  p: JourneyPhaseInput,
  weekInPhase: number | null,
): PhaseWeekTable | null {
  if (p.weekPlan?.length)
    return { rows: planWeekRows(p.weekPlan, weekInPhase), source: "plan" };
  if (p.loadPlan?.length)
    return {
      rows: loadWeekRows(p.loadPlan, p.weeks, weekInPhase),
      source: "load",
    };
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
    // Wochentabelle an jeder Phase mit Plan - aus ihrer Wochenliste oder, wo es
    // keine gibt, aus ihrer Lastliste. Was sie traegt, lassen die Detailzeilen
    // weg.
    const table = phaseWeekTable(
      p,
      tableWeek(state, p.weeks, placement.weekInPhase),
    );
    return {
      name: p.name,
      state,
      isCurrent,
      mark: state === "past" ? "\u2713" : "",
      meta,
      detail: phaseDetail(
        p,
        withLoad,
        isCurrent ? placement.weekInPhase : null,
        table?.source ?? null,
      ),
      loadNote:
        withLoad && isCurrent
          ? loadFactorNote(
              loadPlanForWeek(p.loadPlan, placement.weekInPhase),
              i === phases.length - 1,
            )
          : null,
      weekRows: table?.rows ?? null,
    };
  });
}

// Eine Vorlagenphase, so wie die Tabelle sie traegt: nur die eingestellten
// Werte, ohne die beiden Listen (Migration 0050).
export interface TemplatePhaseInput {
  name: string;
  focus: Focus;
  weeks: number;
  sets_start: number;
  sets_end: number;
  deload_week: number | null;
  rep_target_min: number | null;
  rep_target_max: number | null;
}

// Ein Baustein, so weit die Vorschau ihn braucht: sein Schluessel plus die
// Bauregeln, nach denen seine Listen entstehen.
export interface TemplateBaustein extends PhaseBuildRules {
  key: string;
}

/**
 * Vorlagenphasen fuer die Anzeige aufbereiten.
 *
 * Seit Migration 0050 traegt die Vorlage die beiden Listen nicht mehr – die
 * Vorschau rechnet sie hier aus Baustein und Wochenzahl, statt sie zu lesen.
 * Gebaut wird mit derselben Funktion wie beim Journey-Start, die Anzeige zeigt
 * also genau das, was der Start spaeter einfriert.
 *
 * Fehlt zu einer Phase der Baustein, bleibt sie ohne Listen stehen, statt die
 * ganze Vorlagenliste zu sprengen: In der Anzeige ist eine Phase ohne Vorgaben
 * verkraftbar, ein Absturz nicht. Der Fremdschluessel aus Migration 0048 macht
 * den Fall ohnehin unmoeglich.
 */
export function buildTemplatePhaseInputs(
  phases: TemplatePhaseInput[],
  bausteine: TemplateBaustein[],
): JourneyPhaseInput[] {
  const nach = new Map(bausteine.map((b) => [b.key, b]));
  return phases.map((p) => {
    const baustein = nach.get(p.focus);
    const plaene =
      baustein === undefined
        ? { weekPlan: null, loadPlan: null }
        : buildPhasePlans(baustein, p.weeks);
    return {
      name: p.name,
      focus: p.focus,
      weeks: p.weeks,
      setsStart: p.sets_start,
      setsEnd: p.sets_end,
      deloadWeek: p.deload_week,
      repTargetMin: p.rep_target_min,
      repTargetMax: p.rep_target_max,
      loadPlan: plaene.loadPlan,
      weekPlan: plaene.weekPlan,
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
  return phases.map((p) => {
    // Ohne laufende Journey ist keine Woche voraus oder zurueck: die Tabelle
    // steht neutral da, sonst zeigt die Vorschau dasselbe wie die Journey-Seite.
    const table = phaseWeekTable(p, null);
    return {
      name: p.name,
      state: "preview" as const,
      isCurrent: false,
      mark: "",
      meta: `${p.weeks} ${p.weeks === 1 ? "Woche" : "Wochen"}`,
      // Ohne laufende Woche zeigt die Vorschau die Spanne der Lastliste.
      detail: phaseDetail(p, withLoad, null, table?.source ?? null),
      loadNote: null,
      weekRows: table?.rows ?? null,
    };
  });
}

// Gesamtwochen einer Phasenliste (fuer die Dauer-Angabe im Vorlagen-Waehler).
export function totalWeeks(phases: { weeks: number }[]): number {
  return phases.reduce((acc, p) => acc + (p.weeks || 0), 0);
}
