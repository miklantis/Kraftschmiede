// Testwoche: was in der letzten Woche einer Testphase auf dem
// Trainingsbildschirm steht (#240, Schritt 3). Reine Ableitung aus vorhandenem
// Bestand - es ist nichts zusaetzlich zu pflegen und nichts zu entscheiden.
//
// Die Liste ist Anzeige und Abkuerzung, mehr nicht: die Woche endet am Sonntag,
// unabhaengig davon, was auf der Liste noch offen steht. Sie darf deshalb
// nirgends in den Abschluss oder in die Wochenerfuellung hineinreichen.

import { isoWeekKey } from "@/engine";
import { misstGewicht } from "./exercises";

// Uebung, soweit die Testliste sie braucht. Rang, Profil und Mess-Art
// entscheiden, ob sie ueberhaupt ein 1RM fuehrt; die Reihenfolge kommt aus der
// Abfrage (position).
export interface TestWeekCandidate {
  id: string;
  name: string;
  tier: string;
  profile: string;
  /** Mess-Art ohne Gewicht (reps/duration); null = misst sich in Gewicht. */
  metric: "reps" | "duration" | null;
}

// 1RM-Test, soweit die Liste ihn braucht (Engine-Form, camelCase).
export interface TestWeekTest {
  exerciseId: string;
  date: string;
}

// Workout, soweit der Journey-Bezug es braucht: ob es noch aktiv ist und welche
// Uebungen darin stehen.
export interface TestWeekWorkout {
  id: string;
  active: boolean;
  exerciseIds: ReadonlyArray<string>;
}

/** Eine Zeile der Testliste. */
export interface TestWeekExercise {
  id: string;
  name: string;
  /** In dieser Kalenderwoche schon getestet - dann steht der Haken. */
  tested: boolean;
}

/** Fuehrt diese Uebung ueberhaupt ein 1RM? Hauptuebung mit Kraftprofil, die
 *  sich in Gewicht misst.
 *
 *  Drei Bedingungen, jede aus einem anderen Grund:
 *  - Rang `main`: Assistenz wird nicht getestet.
 *  - Profil `strength`: dasselbe Mass, das ueberall sonst entscheidet, was der
 *    Coach periodisiert (isJourneyCapable, Plan-Anker beim Abschluss). Core
 *    laeuft mit Zusatzlast auf 12-20 Wiederholungen - ein 1RM-Test ergibt dort
 *    keinen Sinn, auch wenn eine Scheibe in der Hand liegt. Koerpergewicht
 *    faellt ueber dieselbe Regel weg.
 *  - Mess-Art: eine Uebung mit eigener Metrik (Wiederholungen oder Haltezeit)
 *    kann nie einen Rekord tragen (siehe lib/exercises.ts misstGewicht). */
export function fuehrtRekord(ex: TestWeekCandidate): boolean {
  return (
    ex.tier === "main" && ex.profile === "strength" && misstGewicht(ex.metric)
  );
}

/** Umfang der Testwoche: die Uebungen, die in den Workouts der aktiven Journey
 *  tatsaechlich vorkommen. Nur aktive und zugewiesene Workouts zaehlen -
 *  archivierte oder der Journey nicht zugewiesene trainiert der Nutzer in dieser
 *  Journey nicht, also wird dafuer auch kein Test angeboten.
 *
 *  Bewusst ohne Rueckfall auf den Katalog: ist der Journey nichts zugewiesen,
 *  bleibt die Menge leer und die Testwoche zeigt nur ihre Frist. Anders als beim
 *  Workout-Vorschlag waere ein Rueckfall hier irrefuehrend - er wuerde Tests zu
 *  Uebungen anbieten, die in dieser Journey nicht vorkommen. */
export function journeyTestScope(
  workouts: ReadonlyArray<TestWeekWorkout>,
  assignedIds: ReadonlyArray<string>,
): Set<string> {
  const zugewiesen = new Set(assignedIds);
  const ids = new Set<string>();
  for (const w of workouts) {
    if (!w.active || !zugewiesen.has(w.id)) continue;
    for (const id of w.exerciseIds) ids.add(id);
  }
  return ids;
}

/** Testliste der laufenden Kalenderwoche: die Kraft-Hauptuebungen der aktiven
 *  Journey (scope, siehe journeyTestScope), in der Reihenfolge, in der sie
 *  hereingereicht werden, jede mit dem Vermerk, ob sie in dieser Woche schon
 *  getestet wurde. Leerer Umfang heisst leere Liste. */
export function testWeekExercises(
  exercises: ReadonlyArray<TestWeekCandidate>,
  tests: ReadonlyArray<TestWeekTest>,
  today: string,
  scope: ReadonlySet<string>,
): TestWeekExercise[] {
  const week = isoWeekKey(today);
  const getestet = new Set(
    tests.filter((t) => isoWeekKey(t.date) === week).map((t) => t.exerciseId),
  );
  return exercises
    .filter((ex) => fuehrtRekord(ex) && scope.has(ex.id))
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      tested: getestet.has(ex.id),
    }));
}

/** Kurzfassung des Stands fuer die Ueberschrift der Liste, z. B. "2 von 5
 *  getestet". Ohne Uebungen bleibt sie leer. */
export function testWeekStand(rows: ReadonlyArray<TestWeekExercise>): string {
  if (rows.length === 0) return "";
  return rows.filter((r) => r.tested).length + " von " + rows.length + " getestet";
}
