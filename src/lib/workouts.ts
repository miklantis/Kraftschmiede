// Reine Aufbereitungslogik fuer die Workouts-Ansicht. Kein DOM/DB-Bezug.
// Leitet aus einem Workout (Vorlage) plus Uebungs-Nachschlagewerk die Anzeige
// ab: Kurzform der enthaltenen Uebungen, Journey-Faehigkeit (mind. eine Uebung
// mit Profil "strength", Rolle egal) und die nach Rolle geordnete Detailliste.

import type { TemplateRole } from "@/schemas";

// Minimales Nachschlagewerk je Uebung – nur, was die Ansicht braucht.
export interface WorkoutExerciseInfo {
  name: string;
  profile: string;
}

// Eine Uebung im Workout mit Rolle und Reihenfolge (aus template_exercises).
export interface WorkoutExerciseEntry {
  exerciseId: string;
  role: TemplateRole;
  position: number;
}

// Ein Workout, so wie die Aufbereitung es hereinnimmt.
export interface WorkoutInput {
  id: string;
  name: string;
  active: boolean;
  exercises: WorkoutExerciseEntry[];
}

// Zeile in der Workouts-Liste.
export interface WorkoutRowModel {
  id: string;
  name: string;
  /** Enthaltene Uebungen in Kurzform, in Reihenfolge, mit " · " getrennt. */
  summary: string;
  /** Abgeleitet: mind. eine Uebung mit Profil "strength". */
  journeyCapable: boolean;
}

// Nach Rolle geordneter Block der Detailansicht.
export interface WorkoutDetailGroup {
  role: TemplateRole;
  label: string;
  exercises: string[];
}

export interface WorkoutDetailModel {
  id: string;
  name: string;
  journeyCapable: boolean;
  groups: WorkoutDetailGroup[];
}

type Lookup = Record<string, WorkoutExerciseInfo | undefined>;

// Anzeigereihenfolge und -namen der Rollen (reines Ordnungs-/Anzeigeraster).
const ROLE_ORDER: readonly TemplateRole[] = ["primary", "secondary", "core"];
const ROLE_LABELS: Record<TemplateRole, string> = {
  primary: "Hauptübungen",
  secondary: "Assistenz",
  core: "Core",
};

function sortedEntries(w: WorkoutInput): WorkoutExerciseEntry[] {
  return w.exercises.slice().sort((a, b) => a.position - b.position);
}

// Journey-faehig, sobald mindestens eine enthaltene Uebung das Profil "strength"
// traegt – unabhaengig von deren Rolle. Deckt sich exakt mit dem, was der Coach
// tatsaechlich periodisiert (siehe Konzept, Abschnitt 3).
export function isJourneyCapable(w: WorkoutInput, lookup: Lookup): boolean {
  return w.exercises.some((e) => lookup[e.exerciseId]?.profile === "strength");
}

// Kurzform der enthaltenen Uebungen (in Reihenfolge). Unbekannte Ids werden
// ausgelassen. Leeres Workout -> leerer String.
export function workoutSummary(w: WorkoutInput, lookup: Lookup): string {
  return sortedEntries(w)
    .map((e) => lookup[e.exerciseId]?.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0)
    .join(" · ");
}

// Ein Workout in ein Zeilenmodell abbilden (Kurzform + Journey-Faehigkeit).
function toRowModel(w: WorkoutInput, lookup: Lookup): WorkoutRowModel {
  return {
    id: w.id,
    name: w.name,
    summary: workoutSummary(w, lookup),
    journeyCapable: isJourneyCapable(w, lookup),
  };
}

// Liste der aktiven Workouts als Zeilenmodelle, Reihenfolge unveraendert.
export function buildWorkoutList(
  workouts: WorkoutInput[],
  lookup: Lookup,
): WorkoutRowModel[] {
  return workouts.filter((w) => w.active).map((w) => toRowModel(w, lookup));
}

// Liste der archivierten Workouts (fuer den ausklappbaren Archiv-Abschnitt).
export function buildArchivedList(
  workouts: WorkoutInput[],
  lookup: Lookup,
): WorkoutRowModel[] {
  return workouts.filter((w) => !w.active).map((w) => toRowModel(w, lookup));
}

// Detailansicht eines Workouts: nach Rolle gruppiert (Haupt -> Assistenz -> Core),
// innerhalb der Gruppe in Reihenfolge. Leere Gruppen entfallen.
export function buildWorkoutDetail(
  w: WorkoutInput,
  lookup: Lookup,
): WorkoutDetailModel {
  const entries = sortedEntries(w);
  const groups: WorkoutDetailGroup[] = ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    exercises: entries
      .filter((e) => e.role === role)
      .map((e) => lookup[e.exerciseId]?.name)
      .filter((n): n is string => typeof n === "string" && n.length > 0),
  })).filter((g) => g.exercises.length > 0);

  return {
    id: w.id,
    name: w.name,
    journeyCapable: isJourneyCapable(w, lookup),
    groups,
  };
}
