// Reine Aufbereitungs- und Regellogik fuer den Workout-Editor. Kein DOM/DB-Bezug.
// Haelt den Entwurf (Name + geordnete Uebungsliste), leitet die Journey-Faehigkeit
// live ab (mind. eine Uebung mit Profil "strength" – deckt sich mit dem, was der
// Coach periodisiert) und prueft die Gueltigkeit (Name nicht leer, pro Nutzer
// eindeutig, mind. eine Uebung).

// Eine Uebung im Entwurf: nur die Id; die Reihenfolge ergibt sich aus der
// Position im Array (beim Speichern zu position 0..n).
export interface DraftExercise {
  exerciseId: string;
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
// traegt (siehe Konzept, Abschnitt 3).
export function draftJourneyCapable(
  draft: WorkoutDraft,
  profiles: ProfileLookup,
): boolean {
  return draft.exercises.some((e) => profiles[e.exerciseId] === "strength");
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

// Uebung hinzufuegen (ans Ende), sofern nicht bereits enthalten.
export function addExercise(
  draft: WorkoutDraft,
  exerciseId: string,
): WorkoutDraft {
  if (draft.exercises.some((e) => e.exerciseId === exerciseId)) return draft;
  return {
    ...draft,
    exercises: [...draft.exercises, { exerciseId }],
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

// Uebung von Position `from` an Position `to` verschieben (fuer Drag-and-Drop).
// `to` ist die Zielposition in der Liste OHNE das gezogene Element gedacht,
// also 0..length-1. Ungueltige oder wirkungslose Indizes lassen den Entwurf
// unveraendert.
export function reorderExercise(
  draft: WorkoutDraft,
  from: number,
  to: number,
): WorkoutDraft {
  const n = draft.exercises.length;
  if (from < 0 || from >= n) return draft;
  const clampedTo = to < 0 ? 0 : to > n - 1 ? n - 1 : to;
  if (clampedTo === from) return draft;
  const next = draft.exercises.slice();
  const [moved] = next.splice(from, 1);
  next.splice(clampedTo, 0, moved);
  return { ...draft, exercises: next };
}
