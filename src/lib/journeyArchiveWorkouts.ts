// Workouts einer abgeschlossenen Journey als Schnappschuss: welche Workouts
// wurden trainiert, wie oft, und welche Uebungen gehoerten dazu. Reine Funktion
// ohne DB-/DOM-Bezug, testbar.
//
// Quelle sind allein die absolvierten Einheiten dieser Journey – nicht die
// Zuordnung (journey_workouts) und nicht die heutige Zusammenstellung des
// Workouts (ADR-0022). Ein zugewiesenes, aber nie trainiertes Workout steht
// deshalb nicht in der Liste, und ein spaeter umgebautes Workout aendert an der
// abgeschlossenen Journey nichts mehr: das Archiv erzaehlt, wie es war.
//
// Beim Workout-Namen zaehlt der beim Abschluss eingebrannte (sessions.
// template_name), nur ohne ihn wird heute aufgeloest. Bei den Uebungen ist es
// umgekehrt: dort gilt der Katalogname, der Name in der Einheit ist nur der
// Rueckfall fuer Zeilen ohne Katalogbezug – dieselbe Reihenfolge wie im Verlauf
// (lib/history.ts, Issue #483).

import type { HistorySessionInput } from "./history";

/** Eine Workout-Zeile im Archiv einer Journey. */
export interface ArchiveWorkoutRow {
  /** Workout-Id, oder "" fuer die Zeile ohne Workout. */
  id: string;
  name: string;
  /** Absolvierte Einheiten dieses Workouts in dieser Journey. */
  count: number;
  /** "12 Einheiten" – dieselbe Zahl in Worten, fuer den Erklaertext. */
  meta: string;
  /** Enthaltene Uebungen in Kurzform ("Kniebeuge · Bankdrücken"), leer wenn
   *  keine Uebung mit Namen aufloesbar ist. */
  summary: string;
}

export interface JourneyArchiveWorkouts {
  /** Trainierte Workouts, haeufigstes zuerst; die Zeile ohne Workout zuletzt. */
  workouts: ArchiveWorkoutRow[];
  /** Alle absolvierten Einheiten dieser Journey – auch Yoga und Skill, die in
   *  keinem Workout stehen. Traegt die Kopfzeile der Seite. */
  totalUnits: number;
}

export interface ArchiveWorkoutLookups {
  templateName: (id: string) => string | undefined;
  exerciseName: (id: string) => string | undefined;
}

function unitsLabel(n: number): string {
  return n === 1 ? "1 Einheit" : n + " Einheiten";
}

// Eine Gruppe im Aufbau: alles, was eine Zeile spaeter braucht.
interface Bucket {
  id: string;
  /** Eingebrannter Name, sobald eine Einheit einen traegt. */
  burned: string | null;
  count: number;
  /** Uebungsnamen in der Reihenfolge, in der sie eingesammelt wurden. */
  exercises: string[];
  seen: Set<string>;
}

/** Die Workouts einer abgeschlossenen Journey aus ihren Einheiten ableiten.
 *  `sessions` sind die absolvierten Einheiten (useSessionsDetailed liefert nur
 *  solche); eingegrenzt wird hier ueber den Journey-Stempel der Einheit. */
export function buildArchiveWorkouts(
  journeyId: string,
  sessions: readonly HistorySessionInput[],
  lk: ArchiveWorkoutLookups,
): JourneyArchiveWorkouts {
  const mine = sessions.filter((s) => s && s.journeyId === journeyId);

  // Neueste zuerst: die zuletzt trainierte Zusammenstellung steht oben in der
  // Kurzform, aeltere Uebungen (inzwischen ausgetauscht) haengen sich hinten
  // an. So faellt nichts heraus, was in dieser Journey wirklich gelaufen ist.
  const neueste = mine
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const buckets = new Map<string, Bucket>();
  for (const s of neueste) {
    if (s.type !== "strength") continue;
    const key = s.templateId ?? "";
    let b = buckets.get(key);
    if (!b) {
      b = { id: key, burned: null, count: 0, exercises: [], seen: new Set() };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.burned === null && s.templateName != null && s.templateName !== "") {
      b.burned = s.templateName;
    }
    for (const ex of s.exercises
      .slice()
      .sort((a, b2) => a.position - b2.position)) {
      const name =
        (ex.exerciseId ? lk.exerciseName(ex.exerciseId) : undefined) ||
        ex.name ||
        "";
      if (name === "" || b.seen.has(name)) continue;
      b.seen.add(name);
      b.exercises.push(name);
    }
  }

  // Namen aufloesen: der eingebrannte, sonst der heutige. Laesst sich auch der
  // nicht finden (Workout geloescht, bevor die Journey endete), zaehlt die
  // Einheit in die stille Zeile "Ohne Workout" – einen Namen zu erfinden waere
  // schlimmer als keiner. Mehrere namenlose Workouts fallen dort zusammen: ohne
  // Namen sind sie nicht unterscheidbar.
  const benannt: Array<{
    id: string;
    name: string;
    count: number;
    exercises: string[];
  }> = [];
  let ohneWorkout = 0;
  for (const b of buckets.values()) {
    const name =
      b.burned ?? (b.id === "" ? undefined : lk.templateName(b.id)) ?? null;
    if (name === null) {
      ohneWorkout += b.count;
      continue;
    }
    benannt.push({ id: b.id, name, count: b.count, exercises: b.exercises });
  }

  // Haeufigstes zuerst – oben, was die Journey gepraegt hat –, bei Gleichstand
  // nach Namen, damit die Reihenfolge nicht von der Eingabe abhaengt.
  benannt.sort(
    (a, b) =>
      b.count - a.count || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );

  const workouts: ArchiveWorkoutRow[] = benannt.map((b) => ({
    id: b.id,
    name: b.name,
    count: b.count,
    meta: unitsLabel(b.count),
    summary: b.exercises.join(" · "),
  }));
  if (ohneWorkout > 0) {
    workouts.push({
      id: "",
      name: "Ohne Workout",
      count: ohneWorkout,
      meta: unitsLabel(ohneWorkout),
      summary: "",
    });
  }

  return { workouts, totalUnits: mine.length };
}
