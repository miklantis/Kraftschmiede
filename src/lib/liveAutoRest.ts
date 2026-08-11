// Auto-Pause nach einem abgehakten Satz (Vorhaben #55, Schritt 2) - die
// Entscheidung, nicht die Ausfuehrung. Keine React-/DOM-Abhaengigkeit.
//
// Die Regel ist die subtilste des Live-Trainings und stand bisher nur mitten im
// Store: Ist als Naechstes ein Aufwaermsatz dran oder ist alles erledigt, wird
// eine laufende Pause ABGEBROCHEN - auch dann, wenn der Auto-Start ausgeschaltet
// ist. Nur im regulaeren Fall entscheidet der Auto-Start darueber, ob eine neue
// Pause startet; ist er aus, bleibt eine laufende Pause unberuehrt (V1).
//
// Die Skill-Variante ist bewusst NICHT vereinheitlicht: sie kennt weder
// restAfterSet noch das Abbrechen. Dieser Unterschied bleibt erhalten und
// bekommt deshalb eine eigene Funktion mit eigenem Test.

import { restAfterSet } from "./liveFlow";
import type { LiveEntry } from "./liveSession";
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
 * Entscheidung nach einem abgehakten Skill-Satz. Bewusst einfacher als die
 * Kraft-Variante: immer eine Satzpause, kein Abbrechen.
 */
export function autoRestAfterSkillSet(prefs: AutoRestPrefs): AutoRestDecision {
  if (!prefs.autoStart) return NONE;
  return { kind: "start", type: "set", sec: prefs.setRestSec };
}
