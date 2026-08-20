// Reine Ableitung fuer den Abschnitt "Uebungen in dieser Journey" auf der
// Journey-Seite. Kein DOM-/DB-Bezug, testbar.
//
// Zwei Schritte: erst WELCHE Uebungen zu dieser Journey gehoeren (aus den
// zugewiesenen Workouts), dann die Einteilung in dieselben vier Gruppen wie auf
// der Uebungsseite. Der Journey-Bezug kommt ueber die Parameter herein
// (zugewiesene Workouts, Einheiten-Zahlen) – die Bausteine wissen nicht, ob es
// die aktive oder eine abgeschlossene Journey ist, damit die Rueckschau spaeter
// dieselbe Ableitung nutzen kann.

import type { ExerciseRow } from "@/schemas";
import {
  EXERCISE_GROUP_ORDER,
  EXERCISE_GROUP_TITLE,
  exerciseGroupKey,
  type ExerciseGroupKey,
} from "./exercises";
import {
  isJourneyCapable,
  type WorkoutExerciseInfo,
  type WorkoutInput,
} from "./workouts";
import type { JourneyChartSeries, JourneyPhaseMark } from "./journeyChart";
import type { JourneyStat } from "./journeyStats";
import type { CoachView } from "./coach";

// Alles, was die Kachel einer Uebung zum Zeichnen braucht: die Zeitachse (ein
// Eintrag je absolvierter Einheit, aelteste zuerst), die Serien und die
// Phasengrenzen.
export interface JourneyExerciseChart {
  dates: string[];
  series: JourneyChartSeries[];
  marks: JourneyPhaseMark[];
}

// Die volle Kachel einer Uebung: links der Verlauf, rechts der Coach-Block mit
// seiner Statistikzeile. Nur Uebungen mit mindestens einer Einheit in dieser
// Journey haben sie.
export interface JourneyExerciseData {
  chart: JourneyExerciseChart;
  stats: JourneyStat[];
  /** Coach-Stand dieser Uebung; null, solange er nicht berechnet ist. */
  coach: CoachView | null;
}

// Eine Zeile des Abschnitts: die Uebung und wie oft sie in dieser Journey
// gelaufen ist. sessionCount 0 (chart null) heisst Platzhalter-Zeile
// ("noch keine Einheit") – sie haelt den Platz in der Reihenfolge frei, bis die
// erste Einheit sie zur vollen Kachel macht.
export interface JourneyExerciseRow {
  id: string;
  name: string;
  sessionCount: number;
  chart: JourneyExerciseChart | null;
  stats: JourneyStat[];
  coach: CoachView | null;
}

export interface JourneyExerciseGroup {
  title: string;
  key: ExerciseGroupKey;
  items: JourneyExerciseRow[];
}

type Lookup = Record<string, WorkoutExerciseInfo | undefined>;

// Uebungen der aktuell zugewiesenen Workouts, dedupliziert, in Workout- und
// darin in Uebungsreihenfolge. Massgeblich ist allein die Zuweisung
// (journey_workouts): ohne Zuweisung bleibt die Liste leer, es gibt keinen
// Rueckfall auf die Bibliothek – dieser Abschnitt spricht ueber die Journey,
// nicht ueber den Katalog. Gefiltert wird wie beim Zuweisungs-Schalter (aktiv +
// journey-faehig), damit hier keine Uebung aus einem Workout auftaucht, das
// oben gar nicht mehr angeboten wird.
export function journeyExerciseIds(
  workouts: readonly WorkoutInput[],
  lookup: Lookup,
  assignedIds: ReadonlySet<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of workouts) {
    if (!w.active || !assignedIds.has(w.id) || !isJourneyCapable(w, lookup)) {
      continue;
    }
    for (const e of w.exercises.slice().sort((a, b) => a.position - b.position)) {
      if (seen.has(e.exerciseId)) continue;
      seen.add(e.exerciseId);
      out.push(e.exerciseId);
    }
  }
  return out;
}

// Die Uebungen der Journey, gruppiert wie auf der Uebungsseite (Hauptuebungen ·
// Assistenz · Core · Koerpergewicht) und innerhalb der Gruppe in Katalog-
// Reihenfolge. Der Katalog wird durchlaufen, nicht die Uebungs-Ids: damit ist
// die Reihenfolge stabil und aendert sich nur, wenn Uebungen dazukommen oder
// wegfallen. Unbekannte Ids (geloeschte Uebung) fallen weg, leere Gruppen auch.
export function buildJourneyExerciseGroups(
  exercises: readonly ExerciseRow[],
  exerciseIds: ReadonlySet<string>,
  data: Readonly<Record<string, JourneyExerciseData | undefined>>,
): JourneyExerciseGroup[] {
  const buckets: Record<ExerciseGroupKey, JourneyExerciseRow[]> = {
    main: [],
    accessory: [],
    core: [],
    bodyweight: [],
  };

  for (const e of exercises) {
    if (!exerciseIds.has(e.id)) continue;
    const d = data[e.id];
    const hasEntries = d != null && d.chart.dates.length > 0;
    buckets[exerciseGroupKey(e)].push({
      id: e.id,
      name: e.name,
      sessionCount: hasEntries ? d.chart.dates.length : 0,
      chart: hasEntries ? d.chart : null,
      stats: hasEntries ? d.stats : [],
      coach: hasEntries ? d.coach : null,
    });
  }

  return EXERCISE_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
    key: k,
    title: EXERCISE_GROUP_TITLE[k],
    items: buckets[k],
  }));
}
