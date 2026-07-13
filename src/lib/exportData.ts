// Reiner, DOM- und Supabase-freier Aufbau des Voll-Exports (analog V1 io.js
// enrichExport). Nimmt die rohen Tabellenzeilen herein und baut ein lesbares
// JSON: Einheiten mit geschachtelten Uebungen ("entries") und Saetzen wie in V1,
// die uebrigen Entitaeten als flache Listen, Inventar gebuendelt. Je Satz mit
// Score werden rir/rpe/scoreLabel aus der Score-Skala abgeleitet (nur fuer den
// Export, beim Re-Import verworfen) und es haengt eine _scoreScale-Notiz an.
// Reihenfolge der Einheiten/Saetze stabil (Datum bzw. position), damit der
// Export deterministisch ist.

import { scoreInfo, SCORE_MAP, type ScoreInfo } from "@/engine/score";
import { todayISO } from "@/lib/format";

export const EXPORT_SCHEMA_VERSION = "v3";

// Pass-through-Zeile: wir reichen die DB-Spalten unveraendert durch und tippen
// nur die wenigen Felder an, die der Aufbau wirklich anfasst (kein any).
export type Row = Record<string, unknown>;

export interface RawSet extends Row {
  id: string;
  session_exercise_id: string;
  kind: string;
  position: number;
  score: number | null;
}

export interface RawSessionExercise extends Row {
  id: string;
  session_id: string;
  position: number;
}

export interface RawSession extends Row {
  id: string;
  date: string;
}

// Roh-Eingabe: alle Tabellen des Nutzers als Listen (settings als Einzelzeile).
export interface RawExportData {
  bars: Row[];
  plates: Row[];
  kettlebells: Row[];
  dumbbells: Row[];
  equipment: Row[];
  exercises: Row[];
  exerciseMuscles: Row[];
  templates: Row[];
  templateExercises: Row[];
  journeyTemplates: Row[];
  journeyTemplatePhases: Row[];
  skills: Row[];
  skillPhases: Row[];
  skillPhaseExercises: Row[];
  skillPhaseEquipment: Row[];
  journeys: Row[];
  phases: Row[];
  sessions: RawSession[];
  sessionExercises: RawSessionExercise[];
  sets: RawSet[];
  skillProgress: Row[];
  bodyLog: Row[];
  composition: Row[];
  settings: Row | null;
}

export type ExportSet = Row;

export interface ExportEntry extends Row {
  sets: ExportSet[];
}

export interface ExportSession extends Row {
  entries: ExportEntry[];
}

export interface KsExport {
  app: "Kraftschmiede";
  schemaVersion: string;
  exportedAt: string;
  inventory: {
    bars: Row[];
    plates: Row[];
    kettlebells: Row[];
    dumbbells: Row[];
    equipment: Row[];
  };
  exercises: Row[];
  exerciseMuscles: Row[];
  templates: Row[];
  templateExercises: Row[];
  journeyTemplates: Row[];
  journeyTemplatePhases: Row[];
  skills: Row[];
  skillPhases: Row[];
  skillPhaseExercises: Row[];
  skillPhaseEquipment: Row[];
  journeys: Row[];
  phases: Row[];
  sessions: ExportSession[];
  skillProgress: Row[];
  bodyLog: Row[];
  composition: Row[];
  settings: Row | null;
  _scoreScale: {
    note: string;
    map: Record<number, ScoreInfo>;
  };
}

const SCORE_SCALE_NOTE =
  "score (1-5) ist die gepflegte Groesse; rir/rpe/scoreLabel je Satz sind daraus " +
  "abgeleitet und werden beim Re-Import verworfen.";

// Je Satz mit Score die abgeleiteten Felder anhaengen (wie V1). Faellt der Score
// nicht in die Skala (z. B. Aufwaermsatz ohne Score), bleibt der Satz unberuehrt.
function enrichSet(set: RawSet): ExportSet {
  const out: Row = { ...set };
  if (typeof set.score === "number") {
    const info = scoreInfo(set.score);
    if (info !== null) {
      out.rir = info.rir;
      out.rpe = info.rpe;
      out.scoreLabel = info.label;
    }
  }
  return out;
}

function byPosition(a: { position: number }, b: { position: number }): number {
  return a.position - b.position;
}

function byDate(a: { date: string }, b: { date: string }): number {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  return 0;
}

function cloneScoreMap(): Record<number, ScoreInfo> {
  const out: Record<number, ScoreInfo> = {};
  for (const [key, info] of Object.entries(SCORE_MAP)) {
    out[Number(key)] = { ...info };
  }
  return out;
}

// Baut das vollstaendige Export-Objekt aus den rohen Zeilen. now nur fuer den
// Zeitstempel (in Tests fixierbar).
// Ab Schema v3 fuehren Uebungen tier/equipment; die Altfelder category/kind
// werden nicht mehr exportiert (unabhaengig davon, ob die DB sie noch traegt).
function stripLegacyExerciseFields(rows: Row[]): Row[] {
  return rows.map((r) => {
    const { category, kind, active, ...rest } = r;
    void category;
    void kind;
    void active;
    return rest;
  });
}

export function buildExport(
  raw: RawExportData,
  now: Date = new Date(),
): KsExport {
  // Saetze je Uebung-in-Einheit, nach position; dabei anreichern.
  const setsByExercise = new Map<string, ExportSet[]>();
  for (const set of [...raw.sets].sort(byPosition)) {
    const list = setsByExercise.get(set.session_exercise_id) ?? [];
    list.push(enrichSet(set));
    setsByExercise.set(set.session_exercise_id, list);
  }

  // Uebungen je Einheit, nach position; mit ihren Saetzen verschachteln.
  const entriesBySession = new Map<string, ExportEntry[]>();
  for (const ex of [...raw.sessionExercises].sort(byPosition)) {
    const entry: ExportEntry = {
      ...ex,
      sets: setsByExercise.get(ex.id) ?? [],
    };
    const list = entriesBySession.get(ex.session_id) ?? [];
    list.push(entry);
    entriesBySession.set(ex.session_id, list);
  }

  // Einheiten nach Datum, jeweils mit ihren entries.
  const sessions: ExportSession[] = [...raw.sessions].sort(byDate).map((s) => ({
    ...s,
    entries: entriesBySession.get(s.id) ?? [],
  }));

  return {
    app: "Kraftschmiede",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    inventory: {
      bars: raw.bars,
      plates: raw.plates,
      kettlebells: raw.kettlebells,
      dumbbells: raw.dumbbells,
      equipment: raw.equipment,
    },
    exercises: stripLegacyExerciseFields(raw.exercises),
    exerciseMuscles: raw.exerciseMuscles,
    templates: raw.templates,
    templateExercises: raw.templateExercises,
    journeyTemplates: raw.journeyTemplates,
    journeyTemplatePhases: raw.journeyTemplatePhases,
    skills: raw.skills,
    skillPhases: raw.skillPhases,
    skillPhaseExercises: raw.skillPhaseExercises,
    skillPhaseEquipment: raw.skillPhaseEquipment,
    journeys: raw.journeys,
    phases: raw.phases,
    sessions,
    skillProgress: raw.skillProgress,
    bodyLog: raw.bodyLog,
    composition: raw.composition,
    settings: raw.settings,
    _scoreScale: {
      note: SCORE_SCALE_NOTE,
      map: cloneScoreMap(),
    },
  };
}

// Lesbares JSON mit Einrueckung wie V1.
export function serializeExport(exp: KsExport): string {
  return JSON.stringify(exp, null, 2);
}

// Dateiname im V1-Stil mit Datum: kraftschmiede_YYYY-MM-DD.json
export function exportFilename(d: Date = new Date()): string {
  return `kraftschmiede_${todayISO(d)}.json`;
}
