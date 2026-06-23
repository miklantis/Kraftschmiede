// Live-Session: das Arbeitsobjekt der gefuehrten Durchfuehrung (Phase 11).
//
// Bewusst geraete-lokal gehalten (nicht in der normalisierten DB): eine laufende
// Einheit ist ein fluechtiges Arbeitsobjekt, das Reload/Tab-Wechsel/Funkloch
// uebersteht. Erst beim Beenden ("Speichern") werden die erledigten Saetze als
// saubere Zeilen in die DB geschrieben (Lieferung 4). So verschmutzt keine
// halbfertige Einheit den Bestand, und das Aufzeichnen laeuft komplett offline.
//
// Lieferung 2 (Sitzungsaufbau): die Struktur traegt jetzt die vom Coach
// aufgebauten Uebungen (`entries`) samt Aufwaerm- und Arbeitssaetzen und das
// allgemeine Aufwaermen. Veraendert (abhaken, Werte tippen) werden sie erst in
// Lieferung 3; hier stehen sie auf den geplanten Startwerten.

// Eine reine Funktion (keine React-/DOM-Abhaengigkeit), damit die Engine-/
// Format-Logik testbar bleibt - dieselbe Trennung wie im uebrigen Projekt.

/** Zweistellig auffuellen (Sekunden/Minuten in der Uhr). */
export function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

/**
 * Trainings-Uhr-Format wie V1 (live.js fmtDur). Unter einer Stunde `m:ss`,
 * ab einer Stunde `h:mm:ss`. Negative Werte werden auf 0 geklemmt.
 */
export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h > 0 ? h + ":" + pad2(m) : "" + m) + ":" + pad2(ss);
}

// ---- Live-Session-Objekt ----------------------------------------------------

/** Art der laufenden Einheit. Skill kommt in Lieferung 5 dazu. */
export type LiveKind = "workout";

/**
 * Ein Arbeitssatz der laufenden Einheit. Geplant (target*) vs. tatsaechlich;
 * `done`/`failed`/`adjusted` werden erst in Lieferung 3 (gefuehrter Ablauf)
 * veraendert - in Lieferung 2 stehen sie auf ihren Startwerten.
 */
export interface LiveSet {
  reps: number;
  weight: number;
  score: number; // 1..5, Start = Ziel-Score der Uebung
  targetReps: number;
  targetWeight: number;
  done: boolean;
  failed: boolean;
  adjusted: boolean;
  adjustNote: string;
}

/** Ein Aufwaermsatz (Wdh + Gewicht, ohne Score/RIR). */
export interface LiveWarmupSet {
  reps: number;
  weight: number;
  done: boolean;
}

/** Ein Satz des allgemeinen Aufwaermens (Dauer in Minuten + Art). */
export interface LiveGeneralWarmupSet {
  minutes: number;
  mode: string; // bike | row | walk | vario | other
  done: boolean;
}

/** Eine Uebung der laufenden Einheit samt Aufwaerm- und Arbeitssaetzen. */
export interface LiveEntry {
  exerciseId: string;
  exerciseName: string;
  category: "barbell" | "core" | "bodyweight";
  /** Kurzkennung im Kartenkopf: "1RM 120 kg" bzw. Muskelgruppen. */
  tag: string;
  /** Stange (nur Langhantel) - aufgeloest fuer Anzeige und Scheiben-Aufteilung. */
  barId: string | null;
  barName: string | null;
  barWeight: number | null;
  warmupSets: LiveWarmupSet[];
  sets: LiveSet[];
}

export interface LiveSession {
  /** Lokale Lauf-ID (kollidiert nicht mit DB-UUIDs der gespeicherten Session). */
  id: string;
  kind: LiveKind;
  /** Vorlage, aus der die Einheit aufgebaut wurde. */
  templateId: string;
  /** Anzeigename der Vorlage (Kopf, Mini-Streifen, Dialoge). */
  title: string;
  /** Startzeitpunkt in ms (Date.now). Die Uhr rechnet immer ab hier. */
  startedAt: number;
  /** Allgemeines Aufwaermen (Cardio) vor den Uebungen. */
  generalWarmup: { sets: LiveGeneralWarmupSet[] };
  /** Die vom Coach aufgebauten Uebungen mit ihren Saetzen (Lieferung 2). */
  entries: LiveEntry[];
}

// ---- Lokale Persistenz ------------------------------------------------------
// Wie die angehefteten Charts (usePinnedCharts) ueber localStorage: synchron,
// sofort beim Reload da (kein Flackern), getrennt vom synchronisierten Bestand.

export const LIVE_STORAGE_KEY = "ks_live_v1";

export interface PersistedLive {
  session: LiveSession | null;
  collapsed: boolean;
}

/** Defensive Wiederherstellung aus dem rohen localStorage-String. */
export function parseLive(raw: string | null): PersistedLive {
  const empty: PersistedLive = { session: null, collapsed: false };
  if (!raw) return empty;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== "object" || obj === null) return empty;
    const rec = obj as Record<string, unknown>;
    const collapsed = rec.collapsed === true;
    const s = rec.session;
    if (typeof s !== "object" || s === null) return { session: null, collapsed };
    const sr = s as Record<string, unknown>;
    if (
      typeof sr.id !== "string" ||
      sr.kind !== "workout" ||
      typeof sr.templateId !== "string" ||
      typeof sr.title !== "string" ||
      typeof sr.startedAt !== "number"
    ) {
      return { session: null, collapsed };
    }
    return {
      session: {
        id: sr.id,
        kind: "workout",
        templateId: sr.templateId,
        title: sr.title,
        startedAt: sr.startedAt,
        generalWarmup: parseGeneralWarmup(sr.generalWarmup),
        entries: parseEntries(sr.entries),
      },
      collapsed,
    };
  } catch {
    return empty;
  }
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function bool(v: unknown): boolean {
  return v === true;
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function parseGeneralWarmup(v: unknown): { sets: LiveGeneralWarmupSet[] } {
  const rec = typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
  const arr = Array.isArray(rec.sets) ? rec.sets : [];
  const sets = arr.map((x): LiveGeneralWarmupSet => {
    const o = (typeof x === "object" && x !== null ? x : {}) as Record<string, unknown>;
    return { minutes: num(o.minutes, 5), mode: str(o.mode, "bike"), done: bool(o.done) };
  });
  return { sets };
}

function parseEntries(v: unknown): LiveEntry[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): LiveEntry | null => {
      const o = (typeof x === "object" && x !== null ? x : {}) as Record<string, unknown>;
      if (typeof o.exerciseId !== "string") return null;
      const cat = o.category;
      const category: LiveEntry["category"] =
        cat === "core" || cat === "bodyweight" ? cat : "barbell";
      const warmupSets = (Array.isArray(o.warmupSets) ? o.warmupSets : []).map(
        (w): LiveWarmupSet => {
          const wo = (typeof w === "object" && w !== null ? w : {}) as Record<string, unknown>;
          return { reps: num(wo.reps), weight: num(wo.weight), done: bool(wo.done) };
        },
      );
      const sets = (Array.isArray(o.sets) ? o.sets : []).map((s): LiveSet => {
        const so = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
        return {
          reps: num(so.reps),
          weight: num(so.weight),
          score: num(so.score, 3),
          targetReps: num(so.targetReps),
          targetWeight: num(so.targetWeight),
          done: bool(so.done),
          failed: bool(so.failed),
          adjusted: bool(so.adjusted),
          adjustNote: str(so.adjustNote),
        };
      });
      return {
        exerciseId: o.exerciseId,
        exerciseName: str(o.exerciseName),
        category,
        tag: str(o.tag),
        barId: typeof o.barId === "string" ? o.barId : null,
        barName: typeof o.barName === "string" ? o.barName : null,
        barWeight: typeof o.barWeight === "number" ? o.barWeight : null,
        warmupSets,
        sets,
      };
    })
    .filter((e): e is LiveEntry => e !== null);
}

export function serializeLive(state: PersistedLive): string {
  return JSON.stringify({ session: state.session, collapsed: state.collapsed });
}

/** Neue lokale Lauf-ID, klar von DB-UUIDs unterscheidbar. */
export function newLiveId(): string {
  return "live_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1000);
}
