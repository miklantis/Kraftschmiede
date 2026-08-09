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
import {
  BESTANDSREGISTER,
  type EinzelKey,
  type InventarKey,
  type ListenKey,
  type ListeKey,
} from "@/lib/bestandsregister";

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
// Die Feldliste faellt aus dem Bestandsregister heraus; nur die drei Tabellen
// rund um die Einheiten sind hier enger getippt, weil der Aufbau sie anfasst.
export type RawExportData = Record<
  Exclude<ListenKey, "sessions" | "sessionExercises" | "sets">,
  Row[]
> & {
  sessions: RawSession[];
  sessionExercises: RawSessionExercise[];
  sets: RawSet[];
} & Record<EinzelKey, Row | null>;

// Zugriff auf eine Roh-Liste ueber den Register-Schluessel. Einmal zentral, damit
// die Typen an den Raendern eng bleiben.
function rohListe(raw: RawExportData, key: string): Row[] {
  return (raw as unknown as Record<string, Row[] | undefined>)[key] ?? [];
}

export type ExportSet = Row;

export interface ExportEntry extends Row {
  sets: ExportSet[];
}

export interface ExportSession extends Row {
  entries: ExportEntry[];
}

// Form des Export-JSON. Die Listen und der Inventar-Block leiten sich aus dem
// Bestandsregister ab; die Einheiten und die Kopfdaten stehen fest.
export type KsExport = {
  app: "Kraftschmiede";
  schemaVersion: string;
  exportedAt: string;
  inventory: Record<InventarKey, Row[]>;
  sessions: ExportSession[];
  settings: Row | null;
  _scoreScale: {
    note: string;
    map: Record<number, ScoreInfo>;
  };
} & Record<ListeKey, Row[]>;

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

  // Inventar-Block und die uebrigen Schluessel aus dem Register fuellen, in
  // dessen Reihenfolge - so bleibt die Datei lesbar gruppiert. Uebungen in
  // Einheiten und Saetze stecken schon geschachtelt in sessions.
  const inventar: Record<string, Row[]> = {};
  const listen: Record<string, Row[] | Row | null> = {};
  for (const e of BESTANDSREGISTER) {
    if (e.ablage === "in_einheit") continue;
    if (e.ablage === "inventar") {
      inventar[e.key] = rohListe(raw, e.key);
    } else if (e.ablage === "einheiten") {
      listen[e.key] = sessions;
    } else if (e.einzelzeile) {
      listen[e.key] = raw.settings;
    } else {
      listen[e.key] =
        e.tabelle === "exercises"
          ? stripLegacyExerciseFields(rohListe(raw, e.key))
          : rohListe(raw, e.key);
    }
  }

  // Einmalige Zusicherung: die Schluessel kommen aus dem Register, das die Form
  // von KsExport ohnehin bestimmt. Der Rundlauf-Test sichert das ab.
  return {
    app: "Kraftschmiede",
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    inventory: inventar,
    ...listen,
    _scoreScale: {
      note: SCORE_SCALE_NOTE,
      map: cloneScoreMap(),
    },
  } as KsExport;
}

// Lesbares JSON mit Einrueckung wie V1.
export function serializeExport(exp: KsExport): string {
  return JSON.stringify(exp, null, 2);
}

// Dateiname im V1-Stil mit Datum: kraftschmiede_YYYY-MM-DD.json
export function exportFilename(d: Date = new Date()): string {
  return `kraftschmiede_${todayISO(d)}.json`;
}
