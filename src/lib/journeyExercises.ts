// Reine Ableitung fuer den Abschnitt "Uebungen in dieser Journey" auf der
// Journey-Seite. Kein DOM-/DB-Bezug, testbar.
//
// Drei Schritte: erst WELCHE Uebungen zu dieser Journey gehoeren – aus zwei
// Quellen, dem heutigen Plan (zugewiesene Workouts) und dem, was in dieser
// Journey tatsaechlich trainiert wurde –, dann die Einteilung in dieselben vier
// Gruppen wie auf der Uebungsseite. Der Journey-Bezug kommt ueber die Parameter
// herein (zugewiesene Workouts, Einheiten) – die Bausteine wissen nicht, ob es
// die aktive oder eine abgeschlossene Journey ist, damit die Rueckschau spaeter
// dieselbe Ableitung nutzen kann.
//
// Die zweite Quelle ist noetig, weil der Plan sich waehrend der Journey aendert:
// wird eine Uebung ausgetauscht, ein Workout deaktiviert oder aus der Journey
// genommen, verschluckt der Plan allein den bereits gelaufenen Verlauf. Was in
// dieser Journey geuebt wurde, gehoert dazu – dieselbe Regel wie in der
// Rueckschau (ADR-0022).

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
import type { HistorySessionInput } from "./history";
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
  /** true = in dieser Journey trainiert, steht aber nicht mehr im Plan
   *  (ausgetauscht, Workout deaktiviert oder aus der Journey genommen). Solche
   *  Zeilen stehen am Ende ihrer Gruppe, tragen den Zusatz "nicht mehr im
   *  Workout" und bewusst keinen Coach-Stand: ein Vorschlag fuer die naechste
   *  Einheit waere bei einer entfernten Uebung falscher Rat. */
  removed: boolean;
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

// Uebungen, die in dieser Journey tatsaechlich gelaufen sind – die zweite
// Quelle des Abschnitts. Erwartet die bereits auf die Journey eingegrenzten
// Einheiten (filterJourneySessions), damit hier nur eine Frage beantwortet
// wird: welche Katalog-Uebung kommt darin vor.
//
// Gezaehlt wird wie im Verlauf (buildExerciseHistory): mindestens ein
// Arbeitssatz, reines Aufwaermen genuegt nicht. Uebungen ohne Katalogbezug
// (Skill-Einheiten, exercise_id null) bleiben aussen vor – sie tragen auch
// keinen Journey-Stempel.
export function journeyTrainedExerciseIds(
  sessions: readonly HistorySessionInput[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const id = ex.exerciseId;
      if (id === null || seen.has(id)) continue;
      if (!ex.sets.some((x) => x.kind !== "warmup")) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

// Die Uebungen der Journey, gruppiert wie auf der Uebungsseite (Hauptuebungen ·
// Assistenz · Core · Koerpergewicht) und innerhalb der Gruppe in Katalog-
// Reihenfolge. Der Katalog wird durchlaufen, nicht die Uebungs-Ids: damit ist
// die Reihenfolge stabil und aendert sich nur, wenn Uebungen dazukommen oder
// wegfallen. Unbekannte Ids (geloeschte Uebung) fallen weg, leere Gruppen auch.
//
// removedIds sind die Uebungen aus der zweiten Quelle (trainiert, nicht mehr im
// Plan). Sie stehen am Ende ihrer Gruppe – direkt neben der Uebung, die sie
// ersetzt hat, denn der Vergleich ist der Sinn der Sache – und nur, wenn sie in
// dieser Journey wirklich eine Einheit tragen. Steht eine Id in beiden Mengen,
// gewinnt der Plan: sie ist ja da, nur eben auch schon trainiert.
export function buildJourneyExerciseGroups(
  exercises: readonly ExerciseRow[],
  exerciseIds: ReadonlySet<string>,
  data: Readonly<Record<string, JourneyExerciseData | undefined>>,
  removedIds: ReadonlySet<string> = new Set(),
): JourneyExerciseGroup[] {
  const buckets: Record<ExerciseGroupKey, JourneyExerciseRow[]> = {
    main: [],
    accessory: [],
    core: [],
    bodyweight: [],
  };
  // Zweite Ablage je Gruppe: getrennt gesammelt und am Ende angehaengt, damit
  // die entfernten Uebungen sicher hinten stehen, ohne auf die Stabilitaet
  // einer Sortierung zu bauen.
  const removedBuckets: Record<ExerciseGroupKey, JourneyExerciseRow[]> = {
    main: [],
    accessory: [],
    core: [],
    bodyweight: [],
  };

  for (const e of exercises) {
    const inPlan = exerciseIds.has(e.id);
    const removed = !inPlan && removedIds.has(e.id);
    if (!inPlan && !removed) continue;

    const d = data[e.id];
    const hasEntries = d != null && d.chart.dates.length > 0;
    // Eine entfernte Uebung ohne Einheit haette hier nichts zu erzaehlen: sie
    // steht weder im Plan noch im Verlauf dieser Journey.
    if (removed && !hasEntries) continue;

    const row: JourneyExerciseRow = {
      id: e.id,
      name: e.name,
      sessionCount: hasEntries ? d.chart.dates.length : 0,
      chart: hasEntries ? d.chart : null,
      stats: hasEntries ? d.stats : [],
      coach: hasEntries && !removed ? d.coach : null,
      removed,
    };
    (removed ? removedBuckets : buckets)[exerciseGroupKey(e)].push(row);
  }

  return EXERCISE_GROUP_ORDER.map((k) => ({
    key: k,
    title: EXERCISE_GROUP_TITLE[k],
    items: [...buckets[k], ...removedBuckets[k]],
  })).filter((g) => g.items.length > 0);
}
