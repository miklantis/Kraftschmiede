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
//
// `covered` sagt, was die Wochentabelle unter der Phase bereits Woche fuer Woche
// auffuehrt (Issue #362). Die Detailzeilen sind nur die Zusammenfassung derselben
// Zahlen - was die Tabelle traegt, faellt hier weg, statt doppelt dazustehen.
function phaseDetail(
  p: JourneyPhaseInput,
  withLoad: boolean,
  // 1-basierte Woche in der Phase, wenn sie gerade laeuft; sonst null.
  currentWeek: number | null,
  // Quelle der Wochentabelle unter dieser Phase; null = es gibt keine.
  covered: WeekTableSource | null = null,
): PhaseDetail[] {
  const geplant = p.weekPlan?.filter(weekDemandsSession) ?? [];
  const plan = geplant.length > 0 ? geplant : null;
  // Die Lasttabelle nennt den Anteil jeder Woche - die Zusammenfassung daneben
  // waere reine Wiederholung.
  const loadRow =
    withLoad && covered !== "load"
      ? [{ k: "Vorgegebene Last", v: loadValue(p.loadPlan, currentWeek) }]
      : [];
  // Die Plantabelle traegt Saetze, Wiederholungen und Ziel-Anstrengung schon
  // selbst. Uebrig bleibt hoechstens die Last - und auch nur, wenn die Phase
  // ueberhaupt eine vorgibt; sonst bliebe eine Kachel mit einem einzelnen
  // "keine" stehen.
  if (covered === "plan") return p.loadPlan?.length ? loadRow : [];
  // Eine Woche ohne geplante Einheit gibt es nur in der Testphase - das ist ihre
  // reine Testwoche. Steht daneben keine Tabelle (nicht laufende Phase,
  // Vorlagen-Vorschau), nennt die Kachel den Ablauf: sonst stuenden dort die
  // Werte der Entlastungswoche, als gaelten sie fuer die ganze Phase.
  // Erkannt wird sie an der Liste selbst, nicht am Fokus-Namen (ADR-0018).
  if (p.weekPlan?.some((w) => !weekDemandsSession(w))) {
    return [
      plan
        ? { k: "Entlastung", v: weekTargets(plan[0]!) }
        : { k: "Vorgabe", v: "keine" },
      { k: "Testwoche", v: TEST_WEEK_TARGETS },
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

// Woraus die Wochentabelle entstanden ist. Entscheidet mit, welche Detailzeilen
// die Phase noch braucht: die Tabelle aus der Wochenliste traegt Saetze,
// Wiederholungen und Ziel-Anstrengung, die aus der Lastliste den Lastanteil.
type WeekTableSource = "plan" | "load";

interface PhaseWeekTable {
  rows: PhaseWeekRow[];
  source: WeekTableSource;
}

// Wochentabelle der laufenden Phase auf dem Weg, den die Phase hergibt:
// Wochenliste zuerst, sonst die Lastliste, sonst keine Tabelle.
//
// Die Testphase ist dabei keine Ausnahme mehr (#364): sie traegt einen festen
// Plan wie Maximalkraft und Intensivierung, also zeigt sie ihn auch. Ihre
// Testwoche plant nichts - dort steht der Test statt Zahlen (planWeekRows).
function phaseWeekTable(
  p: JourneyPhaseInput,
  weekInPhase: number,
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
    // Wochentabelle nur an der laufenden Phase - aus ihrer Wochenliste oder,
    // wo es keine gibt, aus ihrer Lastliste. Was sie traegt, lassen die
    // Detailzeilen weg.
    const table = isCurrent
      ? phaseWeekTable(p, placement.weekInPhase)
      : null;
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
  return phases.map((p) => ({
    name: p.name,
    state: "preview" as const,
    isCurrent: false,
    mark: "",
    meta: `${p.weeks} ${p.weeks === 1 ? "Woche" : "Wochen"}`,
    // Ohne laufende Woche zeigt die Vorschau die Spanne der Lastliste.
    detail: phaseDetail(p, withLoad, null),
    loadNote: null,
    // In der Vorschau laeuft keine Woche - die Tabelle gehoert zur laufenden
    // Journey, die Vorlage zeigt nur die Eckwerte der Phase.
    weekRows: null,
  }));
}

// Gesamtwochen einer Phasenliste (fuer die Dauer-Angabe im Vorlagen-Waehler).
export function totalWeeks(phases: { weeks: number }[]): number {
  return phases.reduce((acc, p) => acc + (p.weeks || 0), 0);
}
