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

/** Art der laufenden Einheit: gefuehrtes Kraft-Workout oder Skill-Einheit. */
export type LiveKind = "workout" | "skill";

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

// ---- Skill-Einheit (Lieferung 5) -------------------------------------------
// Eine Skill-Einheit ist bewusst einfacher als ein Workout: keine Aufwaermsaetze,
// kein Coach waehrend der Durchfuehrung, kein Gewicht/Score. Je Satz nur ein
// Ergebniswert (Wdh oder Sekunden) gegen das feste Phasen-Ziel.

/** Ein Satz einer Skill-Uebung: Ergebniswert, abgehakt, Ziel erreicht (met). */
export interface SkillLiveSet {
  value: number | null;
  done: boolean;
  met: boolean;
}

/** Eine Uebung der laufenden Skill-Einheit (aus der aktuellen Phase). */
export interface SkillLiveExercise {
  name: string;
  metric: "reps" | "duration";
  target: number;
  tempo: string | null;
  sets: SkillLiveSet[];
}

/** Eine Uebung der laufenden Kraft-Einheit samt Aufwaerm- und Arbeitssaetzen. */
export interface LiveEntry {
  exerciseId: string;
  exerciseName: string;
  equipment: "barbell" | "plate" | "bar" | "band" | "bodyweight";
  /** Kurzkennung im Kartenkopf: "1RM 120 kg" bzw. Muskelgruppen. */
  tag: string;
  /** Stange (nur Langhantel) - aufgeloest fuer Anzeige und Scheiben-Aufteilung. */
  barId: string | null;
  barName: string | null;
  barWeight: number | null;
  warmupSets: LiveWarmupSet[];
  sets: LiveSet[];
}

/** Gemeinsame Felder beider Einheit-Arten. */
interface LiveSessionBase {
  /** Lokale Lauf-ID (kollidiert nicht mit DB-UUIDs der gespeicherten Session). */
  id: string;
  kind: LiveKind;
  /** Anzeigename (Kopf, Mini-Streifen, Dialoge). */
  title: string;
  /** Startzeitpunkt in ms (Date.now). Die Uhr rechnet immer ab hier. */
  startedAt: number;
}

export interface WorkoutSession extends LiveSessionBase {
  kind: "workout";
  /** Vorlage, aus der die Einheit aufgebaut wurde. */
  templateId: string;
  /** Aktive Journey/Phase zum Startzeitpunkt - eingefroren wie in V1 buildLive.
   *  Beim Beenden landen sie als journey_id/phase_id in der gespeicherten Einheit
   *  und steuern (nur bei Journey-Einheiten) die eingefrorene Wochennummer. */
  journeyId: string | null;
  phaseId: string | null;
  /** Allgemeines Aufwaermen (Cardio) vor den Uebungen. */
  generalWarmup: { sets: LiveGeneralWarmupSet[] };
  /** Die vom Coach aufgebauten Uebungen mit ihren Saetzen (Lieferung 2). */
  entries: LiveEntry[];
}

/** Laufende Skill-Einheit (Lieferung 5). Traegt den Skill-Bezug und die
 *  Uebungen der aktuellen Phase; beim Beenden werden Fortschritt (Konsekutiv-
 *  Logik) und die erledigten Saetze fortgeschrieben. */
export interface SkillSession extends LiveSessionBase {
  kind: "skill";
  /** DB-ID des Skills (skills.id) - steuert das Fortschreiben beim Beenden. */
  skillId: string;
  /** 0-basierter Index der aktuellen Phase zum Startzeitpunkt. */
  phaseIndex: number;
  /** Skill schon gemeistert (Erhaltungstraining der letzten Phase). */
  mastered: boolean;
  exercises: SkillLiveExercise[];
}

export type LiveSession = WorkoutSession | SkillSession;

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
      typeof sr.title !== "string" ||
      typeof sr.startedAt !== "number"
    ) {
      return { session: null, collapsed };
    }
    if (sr.kind === "skill") {
      if (typeof sr.skillId !== "string") return { session: null, collapsed };
      return {
        session: {
          id: sr.id,
          kind: "skill",
          title: sr.title,
          startedAt: sr.startedAt,
          skillId: sr.skillId,
          phaseIndex: num(sr.phaseIndex, 0),
          mastered: bool(sr.mastered),
          exercises: parseSkillExercises(sr.exercises),
        },
        collapsed,
      };
    }
    if (sr.kind === "workout" && typeof sr.templateId === "string") {
      return {
        session: {
          id: sr.id,
          kind: "workout",
          templateId: sr.templateId,
          journeyId: typeof sr.journeyId === "string" ? sr.journeyId : null,
          phaseId: typeof sr.phaseId === "string" ? sr.phaseId : null,
          title: sr.title,
          startedAt: sr.startedAt,
          generalWarmup: parseGeneralWarmup(sr.generalWarmup),
          entries: parseEntries(sr.entries),
        },
        collapsed,
      };
    }
    return { session: null, collapsed };
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
      const rawEq = o.equipment;
      const equipment: LiveEntry["equipment"] =
        rawEq === "barbell" || rawEq === "plate" || rawEq === "bar" ||
        rawEq === "band" || rawEq === "bodyweight"
          ? rawEq
          : "barbell";
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
        equipment,
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

function parseSkillExercises(v: unknown): SkillLiveExercise[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): SkillLiveExercise | null => {
      const o = (typeof x === "object" && x !== null ? x : {}) as Record<string, unknown>;
      if (typeof o.name !== "string") return null;
      const metric: SkillLiveExercise["metric"] = o.metric === "duration" ? "duration" : "reps";
      const sets = (Array.isArray(o.sets) ? o.sets : []).map((s): SkillLiveSet => {
        const so = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
        return {
          value: typeof so.value === "number" && Number.isFinite(so.value) ? so.value : null,
          done: bool(so.done),
          met: bool(so.met),
        };
      });
      return {
        name: o.name,
        metric,
        target: num(o.target),
        tempo: typeof o.tempo === "string" ? o.tempo : null,
        sets,
      };
    })
    .filter((e): e is SkillLiveExercise => e !== null);
}

export function serializeLive(state: PersistedLive): string {
  return JSON.stringify({ session: state.session, collapsed: state.collapsed });
}

/** Neue lokale Lauf-ID, klar von DB-UUIDs unterscheidbar. */
export function newLiveId(): string {
  return "live_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1000);
}
