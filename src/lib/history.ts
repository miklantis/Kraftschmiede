// Reine Aufbereitung des Trainingsverlaufs (kein DB-/DOM-Bezug, testbar) – die
// Logik ist 1:1 aus V1 (history.js) uebernommen, nur auf das normalisierte
// Schema (sessions / session_exercises / sets) umgestellt.
//
// In V1 lag eine Einheit als verschachtelter Blob vor (entries[].sets[],
// skillWork.exercises[].sets[], yoga minutes/notes). Hier kommt sie als flache
// Zeilen-Struktur herein: jede Einheit traegt ihre Uebungen, jede Uebung ihre
// Saetze. Daraus entstehen vier Anzeige-Dinge je Einheit: die Typ-Klasse (fuer
// Farbpunkt/Tag), ein Titel, ein kurzes Kalender-Label und – aufgeklappt – die
// Dauer plus eine Zeile je Uebung.

import { fmtKg, longDateShort } from "./format";

// Eine Einheit, wie sie der Verlauf braucht (aus sessions + verschachtelten
// session_exercises + sets zusammengezogen).
export interface HistorySet {
  kind: "warmup" | "work";
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  adjusted: boolean;
  score?: number | null;
  done?: boolean;
  failed?: boolean;
}

export interface HistoryExercise {
  exerciseId: string | null;
  name: string | null;
  metric: "reps" | "duration" | null;
  position: number;
  sets: HistorySet[];
  tested1RM?: number | null;
}

export interface HistorySessionInput {
  id: string;
  date: string;
  type: "strength" | "yoga" | "skill";
  templateId: string | null;
  skillId: string | null;
  durationSec: number | null;
  minutes: number | null;
  notes: string;
  exercises: HistoryExercise[];
}

// Nachschlage-Tabellen fuer Anzeigenamen (Domaenensprache deutsch).
export interface HistoryLookups {
  exerciseName: (id: string) => string | undefined;
  templateName: (id: string) => string | undefined;
  skillName: (id: string) => string | undefined;
}

export type HistoryKind = "kraft" | "skill" | "yoga" | "dev";

export interface DetailRow {
  label: string;
  info: string;
}

// Anzeigefertige Einheit fuer die Liste.
export interface HistorySession {
  id: string;
  date: string; // ISO, fuer Sortierung/Kalender
  kind: HistoryKind;
  title: string;
  dateLabel: string; // "Mo., 22. Juni"
  durationLabel: string; // "45 min" oder ""
  detail: DetailRow[];
}

// Ein Punkt im Kalender (Typklasse + kurzes Label).
export interface CalEntry {
  kind: HistoryKind;
  label: string;
}

export interface HistoryModel {
  // Neueste zuerst (fuer die Liste).
  sessions: HistorySession[];
  // Datum -> Punkte (fuer den Kalender).
  byDate: Record<string, CalEntry[]>;
}

// --- Klassifikation -------------------------------------------------------

// In V1 markierte der Coach Abweichungen pro Eintrag (entry.hadDeviation). Im
// neuen Schema steckt das Signal am Satz (adjusted = vom Vorschlag abgewichen).
function hadDeviation(s: HistorySessionInput): boolean {
  return s.exercises.some((e) => e.sets.some((set) => set.adjusted));
}

export function kindOf(s: HistorySessionInput): HistoryKind {
  if (s.type === "yoga") return "yoga";
  if (s.type === "skill") return "skill";
  if (hadDeviation(s)) return "dev";
  return "kraft";
}

export function tagLabel(s: HistorySessionInput): string {
  if (s.type === "yoga") return "Yoga";
  if (s.type === "skill") return "Skill";
  if (hadDeviation(s)) return "Abweichung";
  return "Kraft";
}

// Kurzes Label fuer den Kalenderpunkt: Skill-/Workout-Name bzw. "Yoga".
export function calLabel(s: HistorySessionInput, lk: HistoryLookups): string {
  if (s.type === "yoga") return "Yoga";
  if (s.type === "skill")
    return (s.skillId && lk.skillName(s.skillId)) || "Skill";
  return (s.templateId && lk.templateName(s.templateId)) || "•";
}

export function sessionTitle(
  s: HistorySessionInput,
  lk: HistoryLookups,
): string {
  if (s.type === "yoga") return "Yoga / Mobility";
  if (s.type === "skill")
    return (s.skillId && lk.skillName(s.skillId)) || "Skill";
  const name = s.templateId && lk.templateName(s.templateId);
  return "Workout " + (name || "?");
}

// --- Detail-Aufbereitung --------------------------------------------------

function workSets(ex: HistoryExercise): HistorySet[] {
  return ex.sets.filter((set) => set.kind !== "warmup");
}

// Kraft-Zeile: "<max kg> kg · <Wdh-Liste> Wdh" (Aufwaermsaetze ausgenommen).
function strengthInfo(ex: HistoryExercise): string {
  const ws = workSets(ex);
  const reps = ws
    .map((s) => s.reps)
    .filter((r): r is number => r != null && r !== 0);
  if (!reps.length) return "–";
  let w = 0;
  ws.forEach((s) => {
    if ((s.weight ?? 0) > w) w = s.weight ?? 0;
  });
  const r = reps.join(", ") + " Wdh";
  return w > 0 ? fmtKg(w) + " kg · " + r : r;
}

// Skill-Zeile: Haltezeiten ("12 s, 10 s") oder Wiederholungen ("8, 6 Wdh"),
// je nach Metrik der Uebung.
function skillInfo(ex: HistoryExercise): string {
  const ws = workSets(ex);
  if (ex.metric === "duration") {
    const vals = ws
      .map((s) => s.durationSec)
      .filter((v): v is number => v != null);
    if (!vals.length) return "–";
    return vals.map((v) => v + " s").join(", ");
  }
  const vals = ws.map((s) => s.reps).filter((v): v is number => v != null);
  if (!vals.length) return "–";
  return vals.join(", ") + " Wdh";
}

function durationLabel(s: HistorySessionInput): string {
  if (s.type === "yoga") return s.minutes ? s.minutes + " min" : "";
  return s.durationSec ? Math.round(s.durationSec / 60) + " min" : "";
}

function detailRows(s: HistorySessionInput, lk: HistoryLookups): DetailRow[] {
  if (s.type === "yoga") {
    return s.notes ? [{ label: "Notiz", info: s.notes }] : [];
  }
  const sorted = s.exercises.slice().sort((a, b) => a.position - b.position);
  if (s.type === "skill") {
    return sorted.map((ex) => ({
      label: ex.name || "Skill",
      info: skillInfo(ex),
    }));
  }
  return sorted.map((ex) => ({
    label:
      (ex.exerciseId && lk.exerciseName(ex.exerciseId)) ||
      ex.name ||
      ex.exerciseId ||
      "Übung",
    info: strengthInfo(ex),
  }));
}

// --- Modellaufbau ---------------------------------------------------------

export function buildHistorySession(
  s: HistorySessionInput,
  lk: HistoryLookups,
): HistorySession {
  return {
    id: s.id,
    date: s.date,
    kind: kindOf(s),
    title: sessionTitle(s, lk),
    dateLabel: longDateShort(s.date),
    durationLabel: durationLabel(s),
    detail: detailRows(s, lk),
  };
}

export function buildHistoryModel(
  sessions: HistorySessionInput[],
  lk: HistoryLookups,
): HistoryModel {
  // Aelteste zuerst hereingereicht; Liste zeigt neueste zuerst.
  const ordered = sessions
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const byDate: Record<string, CalEntry[]> = {};
  ordered.forEach((s) => {
    (byDate[s.date] = byDate[s.date] || []).push({
      kind: kindOf(s),
      label: calLabel(s, lk),
    });
  });

  const list = ordered.map((s) => buildHistorySession(s, lk)).reverse();

  return { sessions: list, byDate };
}
