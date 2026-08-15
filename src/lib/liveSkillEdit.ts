// Aenderungen an den Uebungen einer laufenden Skill-Einheit (Vorhaben #55,
// Schritt 3) - die reine Umformung. Keine React-/DOM-/DB-Abhaengigkeit.
//
// Der Name traegt bewusst "-Edit": skillLiveBuild.ts haelt den AUFBAU der
// Skill-Einheit beim Start, hier geht es nur um das Aendern waehrend der
// Durchfuehrung. Aufbau und Aenderung bleiben getrennt.
//
// Gibt es nichts zu aendern, kommt dieselbe Array-Referenz zurueck.

import type { SkillLiveExercise } from "./liveSession";

/** Eine Skill-Uebung ersetzen. Referenzgleich, wenn sich nichts aendert. */
function mapExercise(
  exercises: SkillLiveExercise[],
  ei: number,
  fn: (e: SkillLiveExercise) => SkillLiveExercise,
): SkillLiveExercise[] {
  const cur = exercises[ei];
  if (!cur) return exercises;
  const next = fn(cur);
  if (next === cur) return exercises;
  return exercises.map((e, i) => (i === ei ? next : e));
}

/** Skill-Satz abhaken oder loesen. */
export function withSkillDone(
  exercises: SkillLiveExercise[],
  ei: number,
  si: number,
  done: boolean,
): SkillLiveExercise[] {
  return mapExercise(exercises, ei, (e) => {
    const cur = e.sets[si];
    if (!cur || cur.done === done) return e;
    return { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, done } : x)) };
  });
}

/** Notiz einer Skill-Uebung setzen oder (leerer Text) entfernen. Unveraenderte
 *  Notiz laesst die Referenzen stehen. */
export function withSkillNote(
  exercises: SkillLiveExercise[],
  ei: number,
  note: string,
): SkillLiveExercise[] {
  const next = note.trim();
  return mapExercise(exercises, ei, (e) => (e.note === next ? e : { ...e, note: next }));
}

/** Ergebniswert eines Skill-Satzes uebernehmen (Wdh oder Sekunden, ganzzahlig,
 *  nie negativ). Ein noch leerer Satz (`value: null`) wird dabei belegt. */
export function withSkillValue(
  exercises: SkillLiveExercise[],
  ei: number,
  si: number,
  value: number,
): SkillLiveExercise[] {
  const v = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return mapExercise(exercises, ei, (e) => {
    if (!e.sets[si]) return e;
    return { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, value: v } : x)) };
  });
}
