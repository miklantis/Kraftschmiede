// Reiner, DOM-/Supabase-freier Aufbau des schlanken Coach-Exports. Anders als
// der Voll-Export (zum Wiederherstellen) ist dieser rein fuers Gespraech mit dem
// Coach gedacht: weglassen, was nur die DB braucht (ids/FKs, Definitions-
// Kataloge, Inventar, _scoreScale, Satz-Rauschen), behalten, was zum Bewerten
// zaehlt. Wichtig: jede Einheit zeigt klar, WOZU sie gehoert - Journey, Phase,
// Woche und (bei Kraft) das Workout. Spanne: letzte X Wochen (oder alles).

import { SCORE_MAP, scoreInfo } from "@/engine/score";
import { journeyPlacement, type JourneySession } from "@/engine/journey";
import { todayISO } from "@/lib/format";
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
}

export interface CoachJourney {
  name: string;
  startDate: string | null;
  currentWeek: number | null;
  currentPhase: string | null; // "Hypertrophie (2/4)"
  phases: CoachPhase[];
}

export interface CoachExerciseCat {
  name: string;
  repBand: string | null;
  workWeight: number | null;
  est1RM: number | null;
}

export interface CoachEntry {
  exercise: string;
  sets: string[]; // kompakte Satz-Strings, nur Arbeitssaetze
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
  fatPct?: number;
  muscleKg?: number;
}

export interface CoachExport {
  app: "Kraftschmiede";
  kind: "coach";
  generatedAt: string;
  range: { weeks: number | "all"; from: string | null };
  scoreLegend: string;
  settings: {
    unit: string | null;
    weeklyFrequencyTarget: number | null;
    rmFormula: string | null;
  };
  activeJourney: CoachJourney | null;
  exercises: CoachExerciseCat[];
  sessions: CoachSession[];
  skills: CoachSkill[];
  bodyTrend: CoachBodyDay[];
  measurements: CoachMeasurement[];
}

export interface CoachExportOptions {
  // Anzahl Wochen zurueck (null = alles)
  weeks: number | null;
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

const SCORE_LEGEND = Object.entries(SCORE_MAP)
  .map(([k, v]) => `S${k} ${v.label}`)
  .join(" · ");

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
  if (!isSkill && score != null && scoreInfo(score) != null) s += ` @S${score}`;
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
  const from = rangeStart(today, opts.weeks);
  const inRange = (date: string | null): boolean =>
    date != null && (from == null || date >= from);

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
  const activeJourneyRow =
    raw.journeys.find((j) => flag(j, "active")) ?? null;
  let activeJourney: CoachJourney | null = null;
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
    }));

    // aktuelle Woche/Phase ueber die getestete Placement-Engine
    const freq = num(raw.settings ?? {}, "weekly_frequency_target") ?? 3;
    const placementSessions: JourneySession[] = raw.sessions.map((s) => ({
      date: s.date,
      status: str(s, "status") ?? "done",
      type: str(s, "type") ?? "strength",
      journeyId: str(s, "journey_id"),
    }));
    const placement = journeyPlacement(
      { id: jid, phases: jphases.map((p) => ({ id: str(p, "id") ?? "", weeks: num(p, "weeks") ?? 0 })) },
      placementSessions,
      freq,
      todayISO(today),
    );
    const curPhase = phases[placement.phaseIndex] ?? null;
    activeJourney = {
      name: str(activeJourneyRow, "name") ?? "Journey",
      startDate: str(activeJourneyRow, "start_date"),
      currentWeek: placement.globalWeek,
      currentPhase:
        curPhase != null ? `${curPhase.name} (${curPhase.index})` : null,
      phases,
    };
  }

  // ---- Uebungskatalog (nur aktive, sprechend) ----
  const exercises: CoachExerciseCat[] = raw.exercises
    .filter((e) => flag(e, "active"))
    .sort((a, b) => (num(a, "position") ?? 0) - (num(b, "position") ?? 0))
    .map((e) => ({
      name: str(e, "name") ?? "Übung",
      repBand: repBand(num(e, "rep_range_min"), num(e, "rep_range_max")),
      workWeight: num(e, "work_weight"),
      est1RM: num(e, "rm"),
    }));

  // ---- Einheiten in der Spanne ----
  const sessions: CoachSession[] = [...raw.sessions]
    .filter((s) => inRange(s.date))
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
        return { exercise: name, sets };
      });
      if (coachEntries.length > 0) out.exercises = coachEntries;
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
      const f = num(r, "body_fat_pct");
      if (f != null) m.fatPct = f;
      const mu = num(r, "skeletal_muscle_kg");
      if (mu != null) m.muscleKg = mu;
      return m;
    });

  return {
    app: "Kraftschmiede",
    kind: "coach",
    generatedAt: today.toISOString(),
    range: { weeks: opts.weeks ?? "all", from },
    scoreLegend: SCORE_LEGEND,
    settings: {
      unit: str(raw.settings ?? {}, "unit"),
      weeklyFrequencyTarget: num(raw.settings ?? {}, "weekly_frequency_target"),
      rmFormula: str(raw.settings ?? {}, "rm_formula"),
    },
    activeJourney,
    exercises,
    sessions,
    skills,
    bodyTrend,
    measurements,
  };
}

export function serializeCoachExport(exp: CoachExport): string {
  return JSON.stringify(exp, null, 2);
}
