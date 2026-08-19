// Reiner, DOM-/Supabase-freier Aufbau des schlanken Coach-Exports. Anders als
// der Voll-Export (zum Wiederherstellen) ist dieser rein fuers Gespraech mit dem
// Coach gedacht: weglassen, was nur die DB braucht (ids/FKs, Definitions-
// Kataloge, Inventar, _scoreScale, Satz-Rauschen), behalten, was zum Bewerten
// zaehlt. Wichtig: jede Einheit zeigt klar, WOZU sie gehoert - Journey, Phase,
// Woche und (bei Kraft) das Workout. Spanne: letzte X Wochen (oder alles).

import { SCORE_MAP, scoreInfo, type ScoreInfo } from "@/engine/score";
import {
  journeyPlacement,
  phaseRepBand,
  type JourneySession,
} from "@/engine/journey";
import { todayISO } from "@/lib/format";
import { isNeutralLoad } from "@/lib/loadFactor";
import { zeitraumLabel } from "@/lib/zeitraeume";
import type {
  RawExportData,
  RawSessionExercise,
  RawSet,
  Row,
} from "@/lib/exportData";

// ---- typsichere Lese-Helfer fuer die losen DB-Zeilen (kein any) ----
function str(row: Row, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}
function num(row: Row, key: string): number | null {
  const v = row[key];
  return typeof v === "number" ? v : null;
}
function flag(row: Row, key: string): boolean {
  return row[key] === true;
}

// ---- Ausgabe-Formen (schlank, sprechend) ----
export interface CoachPhase {
  index: string; // "1/4"
  name: string;
  focus: string;
  weeks: number;
  setsRamp: string; // "2→6"
  deloadWeek: number | null;
  repBand: string | null; // "8-12"
  /** Vorgegebene Last der Phase als Anteil des Referenzgewichts; nur wenn die
   *  Journey damit arbeitet (sonst weggelassen). */
  loadFactor?: number;
}

export interface CoachJourney {
  name: string;
  startDate: string | null;
  currentWeek: number | null;
  currentPhase: string | null; // "Hypertrophie (2/4)"
  phases: CoachPhase[];
}

export interface CoachMilestone {
  name: string;
  targetRm: number;
  achieved?: string; // Datum, falls erreicht
  gap?: number; // sonst Abstand in kg zum aktuellen 1RM (falls bekannt)
}

export interface CoachExerciseCat {
  name: string;
  /** Band aus dem Uebungs-Katalog. Waehrend einer Journey nicht massgeblich,
   *  s. activeRepBand. */
  repBand: string | null;
  /** Band, mit dem der Coach gerade wirklich rechnet: das der laufenden Phase.
   *  Nur gesetzt, solange eine Journey aktiv ist und die Uebung ein Kraftprofil
   *  hat - genau die Faelle, in denen das Phasen-Band das Uebungs-Band
   *  ueberstimmt (vgl. activeRepTarget in lib/liveBuild). */
  activeRepBand?: string;
  workWeight: number | null;
  /** Eingefrorener Stand vor der Pause, solange eine Lastfaktor-Journey laeuft. */
  referenceWeight?: number;
  est1RM: number | null;
  milestones?: CoachMilestone[];
}

export interface CoachEntry {
  exercise: string;
  sets: string[]; // kompakte Satz-Strings, nur Arbeitssaetze
  note?: string; // Freitext-Notiz zur Uebung, nur wenn gefuellt
}

export interface CoachSession {
  date: string;
  type: string; // "Kraft" | "Yoga" | "Skill"
  journey?: string;
  phase?: string;
  week?: number;
  workout?: string; // Vorlagenname (welches Workout)
  exercises?: CoachEntry[];
  skill?: string;
  skillPhase?: number;
  result?: string; // "geschafft" | "verfehlt" | "uebersprungen"
  minutes?: number; // Yoga
  durationMin?: number;
  notes?: string;
}

export interface CoachSkill {
  name: string;
  phase: string; // "2/4 (Negative)"
  mastered: boolean;
}

export interface CoachBodyDay {
  date: string;
  readiness: number;
  legs: number;
  upper: number;
  overall: number;
  pain?: boolean;
}

export interface CoachMeasurement {
  date: string;
  weightKg?: number;
  bodyFatKg?: number;
  fatPct?: number;
  muscleKg?: number;
  muscleMassKg?: number;
  waterKg?: number;
  phaseAngle?: number;
  visceralFat?: number;
  bmr?: number;
}

export interface CoachZeitraum {
  typ: string; // Label, z. B. "Verletzung"
  name?: string;
  from: string;
  to: string | null; // null = laeuft noch
  notes?: string;
}

export interface CoachExport {
  app: "Kraftschmiede";
  kind: "coach";
  generatedAt: string;
  range: {
    weeks: number | "all" | "journey";
    from: string | null;
    to?: string | null;
  };
  /** Gesetzt, wenn nur eine Journey ausgegeben wird (Rueckschau). */
  journeyFilter?: { name: string; from: string | null; to: string | null };
  scoreScale: {
    note: string;
    map: Record<number, ScoreInfo>;
  };
  /** Erklaert das Nebeneinander von repBand und activeRepBand. Nur gesetzt,
   *  wenn mindestens eine Uebung ein aktives Band traegt. */
  repBandNote?: string;
  settings: {
    unit: string | null;
    weeklyFrequencyTarget: number | null;
    rmFormula: string | null;
  };
  activeJourney: CoachJourney | null;
  exercises: CoachExerciseCat[];
  sessions: CoachSession[];
  zeitraeume: CoachZeitraum[];
  skills: CoachSkill[];
  bodyTrend: CoachBodyDay[];
  measurements: CoachMeasurement[];
}

export interface CoachExportOptions {
  // Anzahl Wochen zurueck (null = alles)
  weeks: number | null;
  // Nur eine bestimmte Journey ausgeben. Ist sie gesetzt, ersetzt ihre Spanne
  // (Start bis Ende) die Wochen-Angabe: Einheiten dieser Journey, dazu Koerper-
  // und Zeitraum-Daten aus genau diesem Fenster.
  journeyId?: string | null;
  today?: Date;
}

const TYPE_LABEL: Record<string, string> = {
  strength: "Kraft",
  yoga: "Yoga",
  skill: "Skill",
};
const RESULT_LABEL: Record<string, string> = {
  completed: "geschafft",
  missed: "verfehlt",
  skipped: "uebersprungen",
};

const REP_BAND_NOTE =
  "repBand ist der Katalog-Wert der Uebung. Laeuft eine Journey, ueberstimmt " +
  "bei Kraftuebungen das Wiederholungsband der aktiven Phase - dann gilt " +
  "activeRepBand, und nur damit rechnet der Coach (Doppelprogression: erst " +
  "Wiederholungen bis zum oberen Rand, dann Gewicht hoch und zurueck auf den " +
  "unteren Rand).";

const SCORE_SCALE_NOTE =
  "score (1-5) ist die gepflegte Groesse; RIR (Reps in Reserve), RPE und das " +
  "Label sind daraus abgeleitet und liegen NICHT in der DB. Je Satz steht nur " +
  "der Score (z. B. @S3) - die Bedeutung steht hier in der Skala.";

function buildScoreScale(): Record<number, ScoreInfo> {
  const out: Record<number, ScoreInfo> = {};
  for (const [key, info] of Object.entries(SCORE_MAP)) {
    out[Number(key)] = { ...info };
  }
  return out;
}

function repBand(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}-${max}`;
  return String(min ?? max);
}

// Datum vor "vor X Wochen" rechnen (lokal). null = keine Grenze.
function rangeStart(today: Date, weeks: number | null): string | null {
  if (weeks == null) return null;
  const d = new Date(today);
  d.setDate(d.getDate() - weeks * 7);
  return todayISO(d);
}

// Ein Arbeitssatz als kompakter String. Kraft: "5×20 @S3" plus "(Ziel R×W)" bei
// Abweichung. Skill/Haltezeit: "30 s" plus "(verfehlt)" wenn Ziel nicht erreicht.
function setString(set: RawSet, isSkill: boolean): string {
  const duration = num(set, "duration_sec");
  const reps = num(set, "reps");
  if (duration != null && reps == null) {
    let s = `${duration} s`;
    if (set.met === false) s += " (verfehlt)";
    return s;
  }
  const weight = num(set, "weight");
  const score = num(set, "score");
  let s = `${reps ?? "–"}×${weight ?? "–"}`;
  if (!isSkill && score != null) {
    const info = scoreInfo(score);
    if (info != null) s += ` @S${score} RIR ${info.rir}`;
  }
  if (isSkill && set.met === false) s += " (verfehlt)";
  const tr = num(set, "target_reps");
  const tw = num(set, "target_weight");
  const repDiff = tr != null && tr !== reps;
  const wDiff = tw != null && tw !== weight;
  if (!isSkill && (repDiff || wDiff)) {
    s += ` (Ziel ${tr ?? "–"}×${tw ?? "–"})`;
  }
  return s;
}

export function buildCoachExport(
  raw: RawExportData,
  opts: CoachExportOptions,
): CoachExport {
  const today = opts.today ?? new Date();

  // Journey-Filter: die gewaehlte Journey bestimmt die Spanne. Ende bzw. Beginn
  // kommen aus der Journey-Zeile; fehlen sie (Altbestand ohne end_date), tritt
  // die erste bzw. letzte Einheit dieser Journey an ihre Stelle.
  const filterId = opts.journeyId ?? null;
  const filterRow =
    filterId != null
      ? (raw.journeys.find((j) => str(j, "id") === filterId) ?? null)
      : null;
  let jFrom: string | null = null;
  let jTo: string | null = null;
  if (filterRow != null) {
    const dates = raw.sessions
      .filter((s) => str(s, "journey_id") === filterId && s.date != null)
      .map((s) => s.date)
      .sort();
    jFrom = str(filterRow, "start_date") ?? dates[0] ?? null;
    // Laufende Journey: offenes Ende, damit auch heutige Werte drin sind.
    jTo = flag(filterRow, "active")
      ? null
      : (str(filterRow, "end_date") ?? dates[dates.length - 1] ?? null);
  }

  const from = filterRow != null ? jFrom : rangeStart(today, opts.weeks);
  const to = filterRow != null ? jTo : null;
  const inRange = (date: string | null): boolean =>
    date != null &&
    (from == null || date >= from) &&
    (to == null || date <= to);
  // Einheiten: bei Journey-Filter zaehlt die feste Zuordnung, nicht das Datum.
  const sessionInScope = (s: Row): boolean =>
    filterRow != null
      ? str(s, "journey_id") === filterId
      : inRange(str(s, "date"));

  // ---- Lookups ----
  const journeyName = new Map<string, string>();
  for (const j of raw.journeys) {
    const id = str(j, "id");
    if (id != null) journeyName.set(id, str(j, "name") ?? "Journey");
  }
  const phaseById = new Map<string, Row>();
  for (const p of raw.phases) {
    const id = str(p, "id");
    if (id != null) phaseById.set(id, p);
  }
  const exerciseName = new Map<string, string>();
  for (const e of raw.exercises) {
    const id = str(e, "id");
    if (id != null) exerciseName.set(id, str(e, "name") ?? "Übung");
  }
  const templateName = new Map<string, string>();
  for (const t of raw.templates) {
    const id = str(t, "id");
    if (id != null) templateName.set(id, str(t, "name") ?? "Vorlage");
  }
  const skillName = new Map<string, string>();
  for (const s of raw.skills) {
    const id = str(s, "id");
    if (id != null) skillName.set(id, str(s, "name") ?? "Skill");
  }
  // Skill-Phasen-Label je Skill nach position
  const skillPhaseLabels = new Map<string, string[]>();
  for (const sp of [...raw.skillPhases].sort(
    (a, b) => (num(a, "position") ?? 0) - (num(b, "position") ?? 0),
  )) {
    const sid = str(sp, "skill_id");
    if (sid == null) continue;
    const list = skillPhaseLabels.get(sid) ?? [];
    list.push(str(sp, "label") ?? `Phase ${list.length + 1}`);
    skillPhaseLabels.set(sid, list);
  }

  // Saetze je session_exercise (nach position; nur Arbeitssaetze)
  const setsByExercise = new Map<string, RawSet[]>();
  for (const st of [...raw.sets].sort((a, b) => a.position - b.position)) {
    if (str(st, "kind") !== "work") continue;
    const list = setsByExercise.get(st.session_exercise_id) ?? [];
    list.push(st);
    setsByExercise.set(st.session_exercise_id, list);
  }
  // Uebungen je Einheit (nach position)
  const entriesBySession = new Map<string, RawSessionExercise[]>();
  for (const ex of [...raw.sessionExercises].sort(
    (a, b) => a.position - b.position,
  )) {
    const list = entriesBySession.get(ex.session_id) ?? [];
    list.push(ex);
    entriesBySession.set(ex.session_id, list);
  }

  // ---- aktive Journey ----
  // Bei gesetztem Filter wird die gewaehlte Journey ausgegeben, sonst die aktive.
  const activeJourneyRow =
    filterRow ?? raw.journeys.find((j) => flag(j, "active")) ?? null;
  let activeJourney: CoachJourney | null = null;
  // Band der laufenden Phase - das, mit dem der Coach bei Kraftuebungen rechnet.
  // Nur bei wirklich aktiver Journey; in der Rueckschau gilt nichts "gerade".
  let activeBand: [number, number] | null = null;
  if (activeJourneyRow != null) {
    const jid = str(activeJourneyRow, "id") ?? "";
    const jphases = [...raw.phases]
      .filter((p) => str(p, "journey_id") === jid)
      .sort((a, b) => (num(a, "position") ?? 0) - (num(b, "position") ?? 0));
    const total = jphases.length;
    const phases: CoachPhase[] = jphases.map((p, i) => ({
      index: `${i + 1}/${total}`,
      name: str(p, "name") ?? "Phase",
      focus: str(p, "focus") ?? "",
      weeks: num(p, "weeks") ?? 0,
      setsRamp: `${num(p, "sets_start") ?? "?"}→${num(p, "sets_end") ?? "?"}`,
      deloadWeek: num(p, "deload_week"),
      repBand: repBand(num(p, "rep_target_min"), num(p, "rep_target_max")),
      // Lastfaktor nur ausgeben, wenn er die Last wirklich vorgibt - sonst
      // traegt der Export in jeder Journey eine nichtssagende 1.
      ...(isNeutralLoad(num(p, "load_factor"))
        ? {}
        : { loadFactor: num(p, "load_factor") ?? 1 }),
    }));

    // aktuelle Woche/Phase ueber die getestete Placement-Engine
    const freq = num(raw.settings ?? {}, "weekly_frequency_target") ?? 3;
    const placementSessions: JourneySession[] = raw.sessions.map((s) => ({
      date: s.date,
      status: str(s, "status") ?? "done",
      type: str(s, "type") ?? "strength",
      journeyId: str(s, "journey_id"),
    }));
    // Wochen mit einem 1RM-Test zaehlen als erfuellt (Kombiwoche, #229) - sonst
    // zeigte der Export eine andere Woche als die App.
    const testDates = raw.rmTests
      .map((t) => str(t, "date"))
      .filter((d): d is string => d != null && d !== "");
    const placement = journeyPlacement(
      { id: jid, phases: jphases.map((p) => ({ id: str(p, "id") ?? "", weeks: num(p, "weeks") ?? 0 })) },
      placementSessions,
      freq,
      todayISO(today),
      testDates,
    );
    const curPhase = phases[placement.phaseIndex] ?? null;
    // Abgeschlossene Journey (Rueckschau): kein "aktuell", sondern die volle
    // Dauer und keine laufende Phase.
    const isActive = flag(activeJourneyRow, "active");
    const curPhaseRow = jphases[placement.phaseIndex] ?? null;
    if (isActive && curPhaseRow != null) {
      // Dieselbe Regel wie die Engine: gesetzte Grenzen, sonst aus dem Fokus.
      activeBand = phaseRepBand(
        num(curPhaseRow, "rep_target_min"),
        num(curPhaseRow, "rep_target_max"),
        str(curPhaseRow, "focus") ?? "",
      );
    }
    activeJourney = {
      name: str(activeJourneyRow, "name") ?? "Journey",
      startDate: str(activeJourneyRow, "start_date"),
      currentWeek: isActive
        ? placement.globalWeek
        : phases.reduce((sum, p) => sum + p.weeks, 0),
      currentPhase:
        isActive && curPhase != null
          ? `${curPhase.name} (${curPhase.index})`
          : null,
      phases,
    };
  }

  // ---- Uebungskatalog (nur aktive, sprechend) ----
  // Meilensteine je Uebung (Ziel-1RM). Erreichte tragen ihr Datum, offene den
  // Abstand zum aktuellen geschaetzten 1RM (falls bekannt).
  const milestonesByExercise = new Map<string, Row[]>();
  for (const m of raw.milestones) {
    const exId = str(m, "exercise_id");
    if (exId == null) continue;
    const list = milestonesByExercise.get(exId) ?? [];
    list.push(m);
    milestonesByExercise.set(exId, list);
  }

  const exercises: CoachExerciseCat[] = raw.exercises
    .sort((a, b) => (num(a, "position") ?? 0) - (num(b, "position") ?? 0))
    .map((e) => {
      const est1RM = num(e, "rm");
      const cat: CoachExerciseCat = {
        name: str(e, "name") ?? "Übung",
        repBand: repBand(num(e, "rep_range_min"), num(e, "rep_range_max")),
        workWeight: num(e, "work_weight"),
        est1RM,
      };
      // Nur Kraftuebungen folgen dem Phasen-Band; Core/Bodyweight behalten ihr
      // eigenes (gleiche Abgrenzung wie activeRepTarget in lib/liveBuild).
      if (activeBand != null && str(e, "profile") === "strength") {
        cat.activeRepBand = `${activeBand[0]}-${activeBand[1]}`;
      }
      const ref = num(e, "reference_weight");
      if (ref != null) cat.referenceWeight = ref;
      const exId = str(e, "id");
      const ms = exId != null ? milestonesByExercise.get(exId) : undefined;
      if (ms != null && ms.length > 0) {
        cat.milestones = ms.map((m) => {
          const target = num(m, "target_rm") ?? 0;
          const achieved = str(m, "achieved_at");
          const out: CoachMilestone = {
            name: str(m, "name") ?? "Ziel",
            targetRm: target,
          };
          if (achieved != null) {
            out.achieved = achieved;
          } else if (est1RM != null) {
            out.gap = Math.max(0, Math.round((target - est1RM) * 100) / 100);
          }
          return out;
        });
      }
      return cat;
    });

  // ---- Einheiten in der Spanne ----
  const sessions: CoachSession[] = [...raw.sessions]
    .filter((s) => sessionInScope(s))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((s) => {
      const type = str(s, "type") ?? "strength";
      const out: CoachSession = {
        date: s.date,
        type: TYPE_LABEL[type] ?? type,
      };
      const dur = num(s, "duration_sec");
      if (dur != null) out.durationMin = Math.round(dur / 60);

      const jid = str(s, "journey_id");
      if (jid != null) out.journey = journeyName.get(jid) ?? undefined;
      const pid = str(s, "phase_id");
      if (pid != null) {
        const ph = phaseById.get(pid);
        if (ph != null) out.phase = str(ph, "name") ?? undefined;
      }
      const wk = num(s, "week");
      if (wk != null) out.week = wk;

      const notes = str(s, "notes");
      if (notes != null && notes.trim() !== "") out.notes = notes.trim();

      if (type === "yoga") {
        const min = num(s, "minutes");
        if (min != null) out.minutes = min;
        return out;
      }

      if (type === "skill") {
        const sid = str(s, "skill_id");
        if (sid != null) out.skill = skillName.get(sid) ?? undefined;
        const sphase = num(s, "skill_phase");
        if (sphase != null) out.skillPhase = sphase;
        const res = str(s, "skill_result");
        if (res != null) out.result = RESULT_LABEL[res] ?? res;
      } else {
        const tid = str(s, "template_id");
        if (tid != null) out.workout = templateName.get(tid) ?? undefined;
      }

      // Uebungen mit kompakten Arbeitssaetzen
      const entries = entriesBySession.get(str(s, "id") ?? "") ?? [];
      const isSkill = type === "skill";
      const coachEntries: CoachEntry[] = entries.map((ex) => {
        const exId = str(ex, "exercise_id");
        const name =
          str(ex, "name") ??
          (exId != null ? exerciseName.get(exId) : null) ??
          "Übung";
        const sets = (setsByExercise.get(ex.id) ?? []).map((st) =>
          setString(st, isSkill),
        );
        const entry: CoachEntry = { exercise: name, sets };
        const note = str(ex, "note");
        if (note != null && note.trim() !== "") entry.note = note.trim();
        return entry;
      });
      if (coachEntries.length > 0) out.exercises = coachEntries;
      return out;
    });

  // ---- Zeitraeume (Timeline-Marker) in der Spanne ----
  // Aufgenommen wird jeder Zeitraum, der die Spanne beruehrt: laufend (kein Ende)
  // oder Ende am/nach dem Spannenbeginn. Startet er vor der Spanne, bleibt er
  // trotzdem drin, damit z. B. eine vor der Spanne begonnene Verletzung sichtbar
  // ist. Sortiert nach Startdatum.
  const zeitraeume: CoachZeitraum[] = [...raw.zeitraeume]
    .filter((z) => {
      const ende = str(z, "end_datum");
      if (from == null) return true;
      return ende == null || ende >= from;
    })
    .sort((a, b) => {
      const sa = str(a, "start_datum") ?? "";
      const sb = str(b, "start_datum") ?? "";
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    })
    .map((z) => {
      const out: CoachZeitraum = {
        typ: zeitraumLabel(str(z, "typ") ?? "sonstiges"),
        from: str(z, "start_datum") ?? "",
        to: str(z, "end_datum"),
      };
      const name = str(z, "name");
      if (name != null && name.trim() !== "") out.name = name.trim();
      const notiz = str(z, "notiz");
      if (notiz != null && notiz.trim() !== "") out.notes = notiz.trim();
      return out;
    });

  // ---- Skill-Fortschritt ----
  const skills: CoachSkill[] = raw.skillProgress.map((sp) => {
    const sid = str(sp, "skill_id") ?? "";
    const labels = skillPhaseLabels.get(sid) ?? [];
    const cur = num(sp, "current_phase") ?? 0;
    const label = labels[cur];
    const total = labels.length;
    const phaseStr =
      total > 0
        ? `${cur + 1}/${total}${label != null ? ` (${label})` : ""}`
        : String(cur + 1);
    return {
      name: skillName.get(sid) ?? "Skill",
      phase: phaseStr,
      mastered: flag(sp, "mastered"),
    };
  });

  // ---- Body-Trend + Messungen (gleiche Spanne) ----
  const bodyTrend: CoachBodyDay[] = [...raw.bodyLog]
    .filter((r) => inRange(str(r, "date")))
    .sort((a, b) =>
      (str(a, "date") ?? "") < (str(b, "date") ?? "") ? -1 : 1,
    )
    .map((r) => {
      const day: CoachBodyDay = {
        date: str(r, "date") ?? "",
        readiness: num(r, "readiness") ?? 0,
        legs: num(r, "legs") ?? 0,
        upper: num(r, "upper_body") ?? 0,
        overall: num(r, "overall") ?? 0,
      };
      if (flag(r, "pain_flag")) day.pain = true;
      return day;
    });

  const measurements: CoachMeasurement[] = [...raw.composition]
    .filter((r) => inRange(str(r, "date")))
    .sort((a, b) =>
      (str(a, "date") ?? "") < (str(b, "date") ?? "") ? -1 : 1,
    )
    .map((r) => {
      const m: CoachMeasurement = { date: str(r, "date") ?? "" };
      const w = num(r, "weight");
      if (w != null) m.weightKg = w;
      const fkg = num(r, "body_fat_kg");
      if (fkg != null) m.bodyFatKg = fkg;
      const f = num(r, "body_fat_pct");
      if (f != null) m.fatPct = f;
      const mu = num(r, "skeletal_muscle_kg");
      if (mu != null) m.muscleKg = mu;
      const mm = num(r, "muscle_mass_kg");
      if (mm != null) m.muscleMassKg = mm;
      const tbw = num(r, "tbw_kg");
      if (tbw != null) m.waterKg = tbw;
      const pa = num(r, "phase_angle");
      if (pa != null) m.phaseAngle = pa;
      const vf = num(r, "visceral_fat");
      if (vf != null) m.visceralFat = vf;
      const bmr = num(r, "bmr_kcal");
      if (bmr != null) m.bmr = bmr;
      return m;
    });

  return {
    app: "Kraftschmiede",
    kind: "coach",
    generatedAt: today.toISOString(),
    range: filterRow != null
      ? { weeks: "journey" as const, from, to }
      : { weeks: opts.weeks ?? "all", from },
    ...(filterRow != null
      ? {
          journeyFilter: {
            name: str(filterRow, "name") ?? "Journey",
            from: jFrom,
            to: jTo,
          },
        }
      : {}),
    scoreScale: {
      note: SCORE_SCALE_NOTE,
      map: buildScoreScale(),
    },
    ...(exercises.some((x) => x.activeRepBand != null)
      ? { repBandNote: REP_BAND_NOTE }
      : {}),
    settings: {
      unit: str(raw.settings ?? {}, "unit"),
      weeklyFrequencyTarget: num(raw.settings ?? {}, "weekly_frequency_target"),
      rmFormula: str(raw.settings ?? {}, "rm_formula"),
    },
    activeJourney,
    exercises,
    sessions,
    zeitraeume,
    skills,
    bodyTrend,
    measurements,
  };
}

export function serializeCoachExport(exp: CoachExport): string {
  return JSON.stringify(exp, null, 2);
}
