// Reine Aufbereitungslogik fuer die Workouts-Ansicht. Kein DOM/DB-Bezug.
// Leitet aus einem Workout (Vorlage) plus Uebungs-Nachschlagewerk die Anzeige
// ab: Kurzform der enthaltenen Uebungen und Journey-Faehigkeit (mind. eine
// Uebung mit Profil "strength").

// Minimales Nachschlagewerk je Uebung – nur, was die Ansicht braucht.
export interface WorkoutExerciseInfo {
  name: string;
  profile: string;
}

// Eine Uebung im Workout mit ihrer Reihenfolge (aus template_exercises).
export interface WorkoutExerciseEntry {
  exerciseId: string;
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

type Lookup = Record<string, WorkoutExerciseInfo | undefined>;

function sortedEntries(w: WorkoutInput): WorkoutExerciseEntry[] {
  return w.exercises.slice().sort((a, b) => a.position - b.position);
}

// Journey-faehig, sobald mindestens eine enthaltene Uebung das Profil "strength"
// traegt. Deckt sich exakt mit dem, was der Coach tatsaechlich periodisiert
// (siehe Konzept, Abschnitt 3).
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

// Ein zuweisbares Workout auf der Journey-Seite: aktiv und journey-faehig, mit
// dem Schalterzustand (der aktiven Journey zugewiesen ja/nein).
export interface JourneyAssignmentRow {
  id: string;
  name: string;
  /** Enthaltene Uebungen in Kurzform. */
  summary: string;
  /** Aktuell der Journey zugewiesen (Eintrag in journey_workouts). */
  assigned: boolean;
}

// Liste der zuweisbaren Workouts fuer die aktive Journey: nur aktive und
// journey-faehige (mind. eine strength-Uebung), Reihenfolge unveraendert (kommt
// bereits nach templates.position). assigned kennzeichnet die aktuell
// zugewiesenen. Archivierte oder nicht journey-faehige Workouts erscheinen hier
// bewusst nicht (Konzept 5.3); eine bestehende Zuordnung eines spaeter nicht
// mehr journey-faehigen Workouts bleibt in der DB und wird beim Lesen gefiltert.
export function buildJourneyAssignment(
  workouts: WorkoutInput[],
  lookup: Lookup,
  assignedIds: ReadonlySet<string>,
): JourneyAssignmentRow[] {
  return workouts
    .filter((w) => w.active && isJourneyCapable(w, lookup))
    .map((w) => ({
      id: w.id,
      name: w.name,
      summary: workoutSummary(w, lookup),
      assigned: assignedIds.has(w.id),
    }));
}

// Beim Journey-Wechsel uebernehmbare Zuweisungen: aus den zuvor zugewiesenen
// Workout-Ids bleiben nur die, die weiterhin zuweisbar sind (aktiv UND
// journey-faehig). Reihenfolge nach der uebergebenen Workout-Liste (Position).
// Unbekannte oder inzwischen archivierte/nicht mehr journey-faehige Zuweisungen
// fallen weg.
export function filterCopyableAssignments(
  workouts: WorkoutInput[],
  lookup: Lookup,
  previousAssignedIds: ReadonlySet<string>,
): string[] {
  return workouts
    .filter(
      (w) =>
        w.active &&
        isJourneyCapable(w, lookup) &&
        previousAssignedIds.has(w.id),
    )
    .map((w) => w.id);
}

// Auswahl der Workouts, die der Coach fuer die Empfehlung bewerten soll
// (Konzept 5.4). Der Rechenkern bleibt unangetastet – hier faellt nur die
// Entscheidung, WELCHE Menge er sieht:
//  - keine aktive Journey  -> ganze Bibliothek (nur aktive Workouts), kein Hinweis
//  - aktive Journey mit nutzbarer Zuweisung -> nur diese Teilmenge (aktiv +
//    journey-faehig + zugewiesen); kein Rueckfall, selbst wenn heute alle
//    ausgeschlossen sind
//  - aktive Journey ohne nutzbare Zuweisung -> Rueckfall auf die ganze
//    Bibliothek, mit dezentem Hinweis (libraryFallback = true)
// Archivierte Workouts zaehlen nie zur "ganzen Bibliothek".
export interface RecommendationSelection {
  /** Ids der zu bewertenden Workouts. */
  ids: string[];
  /** true, wenn wegen leerer/nicht nutzbarer Journey-Zuweisung auf die ganze
   *  Bibliothek zurueckgefallen wird (Hinweis anzeigen). */
  libraryFallback: boolean;
}

export function selectRecommendationTemplates(
  workouts: WorkoutInput[],
  lookup: Lookup,
  hasActiveJourney: boolean,
  assignedIds: ReadonlySet<string>,
): RecommendationSelection {
  const active = workouts.filter((w) => w.active);
  if (!hasActiveJourney) {
    return { ids: active.map((w) => w.id), libraryFallback: false };
  }
  const assignedAssignable = active.filter(
    (w) => isJourneyCapable(w, lookup) && assignedIds.has(w.id),
  );
  if (assignedAssignable.length === 0) {
    return { ids: active.map((w) => w.id), libraryFallback: true };
  }
  return { ids: assignedAssignable.map((w) => w.id), libraryFallback: false };
}
