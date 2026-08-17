// Vorschau auf die Coach-Entscheidung waehrend der laufenden Einheit (#190).
// Reine Aufbereitung ohne DB-/DOM-Bezug, gleiche Schicht wie lastEntries.ts.
//
// Der Coach rechnet sonst gegen die zuletzt GESPEICHERTE Einheit. Die laufende
// Einheit steht dort per Definition nicht drin (useSessionsDetailed filtert auf
// status "done") und liegt ausserdem in der Live-Satzform statt in der
// Engine-Satzform. Hier wird nur diese Luecke geschlossen - die Regeln selbst
// bleiben, wo sie sind (engine/progression.ts, ADR-0015).
//
// Fuer die Vorschau ruecken alle Bezugsgroessen um eine Position weiter, genau
// so, wie es beim Beenden tatsaechlich passiert:
//   Arbeitsgewicht -> hoechstes im Block geleistetes Gewicht (wie deriveWorkSets)
//   letzte Einheit -> die gerade abgehakten Live-Saetze
//   Einheit davor  -> der bisher letzte gespeicherte Eintrag
//
// Gerechnet wird ab dem ERSTEN abgehakten Satz, nicht erst beim vollstaendigen
// Block (#193). Ein abgebrochener Block - zwei Saetze nicht geschafft, den Rest
// gar nicht erst versucht - ist genau der Fall, in dem die Rueckmeldung zaehlt,
// und er wird nie vollstaendig. Das deckt sich mit dem Beenden: offene Saetze
// verfallen dort (liveFinish), gespeichert wird nur das Abgehakte. Die Vorschau
// beantwortet also durchgehend "was kaeme heraus, wenn ich jetzt beende".

import type { SetEntry, EngineSet } from "@/engine/types";
import type { CoachStatus } from "./coach";
import type { LiveEntry, LiveSet } from "./liveSession";

/** Coach-Vorschau eines Uebungsblocks. `provisional` heisst: es stehen noch
 *  offene Arbeitssaetze im Block, der Stand kann also noch wandern. */
export interface LiveCoachPreview {
  status: CoachStatus;
  provisional: boolean;
}

// Ein Live-Arbeitssatz in die Engine-Satzform. Gegenstueck zu toEngineSet in
// lastEntries.ts (dort fuer DB-Zeilen). Aufwaermsaetze koennen hier nicht
// auftauchen: die liegen in einem eigenen Feld der Uebung.
function toEngineWorkSet(s: LiveSet): EngineSet {
  return {
    type: "work",
    weight: s.weight,
    reps: s.reps,
    score: s.score,
    failed: s.failed,
    done: s.done,
    targetReps: s.targetReps,
    targetWeight: s.targetWeight,
    adjusted: s.adjusted,
  };
}

/** Ist der Uebungsblock fertig? Mindestens ein Arbeitssatz und alle abgehakt.
 *  Aufwaermsaetze zaehlen nicht mit - sie stehen in `warmupSets`.
 *
 *  Entscheidet nicht mehr, OB gerechnet wird, sondern nur noch, ob der Stand
 *  fest ist oder vorlaeufig (#193). Wer die restlichen Saetze streicht, statt
 *  sie offen zu lassen, macht den Stand damit fest. */
export function isBlockComplete(entry: LiveEntry): boolean {
  const sets = entry.sets ?? [];
  return sets.length > 0 && sets.every((s) => s.done);
}

/** Die abgehakten Arbeitssaetze als Vordaten fuer den Coach; null, wenn keiner
 *  abgehakt ist. */
export function liveEntryToSetEntry(entry: LiveEntry): SetEntry | null {
  const done = (entry.sets ?? []).filter((s) => s.done);
  if (done.length === 0) return null;
  return { sets: done.map(toEngineWorkSet) };
}

/** Hoechstes geleistetes Arbeitsgewicht des Blocks; null ohne abgehakten Satz.
 *  Dieselbe Regel wie deriveWorkSets beim Beenden, damit die Vorschau und die
 *  spaetere Katalog-Fortschreibung nicht auseinanderlaufen. */
export function liveWorkWeight(entry: LiveEntry): number | null {
  const done = (entry.sets ?? []).filter((s) => s.done);
  if (done.length === 0) return null;
  return Math.max(...done.map((s) => s.weight));
}
