// Auto-Pause nach einem abgehakten Satz (Vorhaben #55, Schritt 2) - die
// Entscheidung, nicht die Ausfuehrung. Keine React-/DOM-Abhaengigkeit.
//
// Die Regel ist die subtilste des Live-Trainings und stand bisher nur mitten im
// Store: Ist als Naechstes ein Aufwaermsatz dran oder ist alles erledigt, wird
// eine laufende Pause ABGEBROCHEN - auch dann, wenn der Auto-Start ausgeschaltet
// ist. Nur im regulaeren Fall entscheidet der Auto-Start darueber, ob eine neue
// Pause startet; ist er aus, bleibt eine laufende Pause unberuehrt (V1).
//
// Die Skill-Variante bleibt bewusst einfacher: sie kennt keine Aufwaermsaetze
// und keine Uebungspause, sondern immer nur die Satzpause. Eine Regel teilt sie
// aber mit dem Workout (Vorhaben #414): ist nach dem Haken nichts mehr offen,
// startet keine Pause mehr - und eine laufende wird abgebrochen. Nach dem
// letzten Satz gibt es nichts mehr zu ueben, ein Countdown waere sinnlos.

import { restAfterSet } from "./liveFlow";
import type { LiveEntry, SkillLiveExercise } from "./liveSession";
import type { RestState } from "./liveRest";

/** Die Einstellungen, die fuer die Entscheidung gebraucht werden. Sie kommen
 *  als Parameter herein und werden nie in `src/lib` gehalten. */
export interface AutoRestPrefs {
  setRestSec: number;
  exerciseRestSec: number;
  autoStart: boolean;
}

/** Die benannte Entscheidung: nichts tun, laufende Pause abbrechen oder eine
 *  neue Pause mit Typ und Dauer starten. */
export type AutoRestDecision =
  | { kind: "none" }
  | { kind: "clear" }
  | { kind: "start"; type: RestState["type"]; sec: number };

const NONE: AutoRestDecision = { kind: "none" };
const CLEAR: AutoRestDecision = { kind: "clear" };

/**
 * Entscheidung nach einem abgehakten Arbeitssatz. `entries` muss bereits den
 * abgehakten Stand tragen.
 */
export function autoRestAfterWorkSet(
  entries: LiveEntry[],
  ei: number,
  prefs: AutoRestPrefs,
): AutoRestDecision {
  const type = restAfterSet(entries, ei);
  if (type === null) return CLEAR;
  if (!prefs.autoStart) return NONE;
  return {
    kind: "start",
    type,
    sec: type === "set" ? prefs.setRestSec : prefs.exerciseRestSec,
  };
}

/**
 * Entscheidung nach einem abgehakten Skill-Satz. `exercises` muss bereits den
 * abgehakten Stand tragen.
 *
 * Ist die Einheit damit durch, wird abgebrochen - wie im Workout auch dann,
 * wenn der Auto-Start ausgeschaltet ist. Sonst bleibt es bei der Satzpause:
 * die Skill-Einheit kennt weder Aufwaermsaetze noch die laengere Uebungspause.
 */
export function autoRestAfterSkillSet(
  exercises: SkillLiveExercise[],
  prefs: AutoRestPrefs,
): AutoRestDecision {
  if (allSkillSetsDone(exercises)) return CLEAR;
  if (!prefs.autoStart) return NONE;
  return { kind: "start", type: "set", sec: prefs.setRestSec };
}

/** Kein offener Satz mehr in der ganzen Skill-Einheit. */
function allSkillSetsDone(exercises: SkillLiveExercise[]): boolean {
  return exercises.every((e) => e.sets.every((x) => x.done));
}
