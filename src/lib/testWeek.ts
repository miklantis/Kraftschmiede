// Testwoche: was in der letzten Woche einer Testphase auf dem
// Trainingsbildschirm steht (#240, Schritt 3). Reine Ableitung aus vorhandenem
// Bestand - es ist nichts zusaetzlich zu pflegen und nichts zu entscheiden.
//
// Die Liste ist Anzeige und Abkuerzung, mehr nicht: die Woche endet am Sonntag,
// unabhaengig davon, was auf der Liste noch offen steht. Sie darf deshalb
// nirgends in den Abschluss oder in die Wochenerfuellung hineinreichen.

import { isoWeekKey } from "@/engine";

// Uebung, soweit die Testliste sie braucht. Rang und Profil entscheiden, ob sie
// ueberhaupt ein 1RM fuehrt; die Reihenfolge kommt aus der Abfrage (position).
export interface TestWeekCandidate {
  id: string;
  name: string;
  tier: string;
  profile: string;
}

// 1RM-Test, soweit die Liste ihn braucht (Engine-Form, camelCase).
export interface TestWeekTest {
  exerciseId: string;
  date: string;
}

/** Eine Zeile der Testliste. */
export interface TestWeekExercise {
  id: string;
  name: string;
  /** In dieser Kalenderwoche schon getestet - dann steht der Haken. */
  tested: boolean;
}

/** Fuehrt diese Uebung ueberhaupt ein 1RM? Hauptuebung mit Gewicht: reine
 *  Koerpergewichtsuebungen kennen keinen Rekord und gehoeren nicht auf die
 *  Liste. */
export function fuehrtRekord(ex: TestWeekCandidate): boolean {
  return ex.tier === "main" && ex.profile !== "bodyweight";
}

/** Testliste der laufenden Kalenderwoche: alle Hauptuebungen mit 1RM, in der
 *  Reihenfolge, in der sie hereingereicht werden, jede mit dem Vermerk, ob sie
 *  in dieser Woche schon getestet wurde. */
export function testWeekExercises(
  exercises: ReadonlyArray<TestWeekCandidate>,
  tests: ReadonlyArray<TestWeekTest>,
  today: string,
): TestWeekExercise[] {
  const week = isoWeekKey(today);
  const getestet = new Set(
    tests.filter((t) => isoWeekKey(t.date) === week).map((t) => t.exerciseId),
  );
  return exercises.filter(fuehrtRekord).map((ex) => ({
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
