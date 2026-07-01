// Reine Aufbereitungs- und Regellogik fuer den Workout-Editor. Kein DOM/DB-Bezug.
// Haelt den Entwurf (Name + geordnete Uebungsliste mit Rolle), leitet die
// Journey-Faehigkeit live ab (mind. eine Uebung mit Profil "strength", Rolle
// egal – deckt sich mit dem, was der Coach periodisiert) und prueft die
// Gueltigkeit (Name nicht leer, pro Nutzer eindeutig, mind. eine Uebung). Die
// Rolle ist reines Ordnungs-/Anzeigeraster und beeinflusst nichts an der
// Progression.

import type { TemplateRole } from "@/schemas";

// Eine Uebung im Entwurf: nur Id und Rolle; die Reihenfolge ergibt sich aus der
// Position im Array (beim Speichern zu position 0..n).
export interface DraftExercise {
  exerciseId: string;
  role: TemplateRole;
}

export interface WorkoutDraft {
  name: string;
  exercises: DraftExercise[];
}

// Nachschlagewerk: Uebungs-Id -> Profil ("strength" / "core" / "bodyweight").
type ProfileLookup = Record<string, string | undefined>;

// Ergebnis der Namenspruefung fuer eine verstaendliche Meldung im Editor.
export type NameStatus = "empty" | "duplicate" | "ok";

// Journey-faehig, sobald mindestens eine enthaltene Uebung das Profil "strength"
// traegt – unabhaengig von deren Rolle (siehe Konzept, Abschnitt 3).
export function draftJourneyCapable(
  draft: WorkoutDraft,
  profiles: ProfileLookup,
): boolean {
  return draft.exercises.some((e) => profiles[e.exerciseId] === "strength");
}

// Rollen-Vorbelegung: die erste Uebung als Hauptuebung, jede weitere als
// Assistenz. Beides bleibt frei aenderbar.
export function defaultRole(currentCount: number): TemplateRole {
  return currentCount === 0 ? "primary" : "secondary";
}

// Name auf Rand-Leerzeichen bereinigen (fuer Vergleich und Speicherung).
export function trimmedName(name: string): string {
  return name.trim();
}

// Namenspruefung gegen die Namen aller ANDEREN Workouts (inkl. archivierter);
// der Constraint in der DB gilt ueber alle Workouts. Vergleich exakt auf dem
// bereinigten Namen (Gross-/Kleinschreibung zaehlt, wie der DB-Constraint).
export function nameStatus(
  name: string,
  otherNames: ReadonlySet<string>,
): NameStatus {
  const n = trimmedName(name);
  if (n.length === 0) return "empty";
  if (otherNames.has(n)) return "duplicate";
  return "ok";
}

// Speicherbar, wenn der Name in Ordnung ist und mindestens eine Uebung gesetzt.
export function canSaveDraft(
  draft: WorkoutDraft,
  status: NameStatus,
): boolean {
  return status === "ok" && draft.exercises.length > 0;
}

// Uebung hinzufuegen (ans Ende), sofern nicht bereits enthalten. Rolle nach der
// Vorbelegungsregel.
export function addExercise(
  draft: WorkoutDraft,
  exerciseId: string,
): WorkoutDraft {
  if (draft.exercises.some((e) => e.exerciseId === exerciseId)) return draft;
  return {
    ...draft,
    exercises: [
      ...draft.exercises,
      { exerciseId, role: defaultRole(draft.exercises.length) },
    ],
  };
}

// Uebung entfernen.
export function removeExercise(
  draft: WorkoutDraft,
  exerciseId: string,
): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises.filter((e) => e.exerciseId !== exerciseId),
  };
}

// Rolle einer Uebung setzen (reines Ordnungs-/Anzeigeraster).
export function setRole(
  draft: WorkoutDraft,
  exerciseId: string,
  role: TemplateRole,
): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((e) =>
      e.exerciseId === exerciseId ? { ...e, role } : e,
    ),
  };
}

// Uebung um eine Position nach oben/unten schieben. dir = -1 hoch, +1 runter.
// Ausserhalb der Grenzen bleibt der Entwurf unveraendert.
export function moveExercise(
  draft: WorkoutDraft,
  index: number,
  dir: -1 | 1,
): WorkoutDraft {
  const target = index + dir;
  if (index < 0 || index >= draft.exercises.length) return draft;
  if (target < 0 || target >= draft.exercises.length) return draft;
  const next = draft.exercises.slice();
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return { ...draft, exercises: next };
}
