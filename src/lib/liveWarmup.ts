// Allgemeines Aufwaermen der laufenden Einheit (Vorhaben #55, Schritt 3) - die
// reine Umformung. Keine React-/DOM-/DB-Abhaengigkeit: nimmt die Cardio-Saetze
// als Daten herein und gibt neue Saetze heraus.
//
// Die Aufwaermsaetze JE UEBUNG sind nicht hier, sondern in liveEntries.ts - hier
// geht es nur um den Cardio-Block vor den Uebungen.
//
// Gibt es nichts zu aendern, kommt dieselbe Array-Referenz zurueck, damit der
// Store nicht unnoetig benachrichtigt.

import type { LiveGeneralWarmupSet } from "./liveSession";

/** Ein neuer Cardio-Satz: 5 Minuten, Art Vario, offen. */
const NEUER_SATZ: LiveGeneralWarmupSet = { minutes: 5, mode: "vario", done: false };

/** Einen Satz ersetzen. Liefert `fn` denselben Satz zurueck (oder gibt es ihn
 *  nicht), bleibt auch das Array referenzgleich. */
function mapSet(
  sets: LiveGeneralWarmupSet[],
  si: number,
  fn: (w: LiveGeneralWarmupSet) => LiveGeneralWarmupSet,
): LiveGeneralWarmupSet[] {
  const cur = sets[si];
  if (!cur) return sets;
  const next = fn(cur);
  if (next === cur) return sets;
  return sets.map((w, j) => (j === si ? next : w));
}

/** Cardio-Satz abhaken oder loesen. */
export function withGeneralDone(
  sets: LiveGeneralWarmupSet[],
  si: number,
  done: boolean,
): LiveGeneralWarmupSet[] {
  return mapSet(sets, si, (w) => (w.done === done ? w : { ...w, done }));
}

/** Dauer eines Cardio-Satzes uebernehmen (ganzzahlige Minuten, nie negativ). */
export function withGeneralMinutes(
  sets: LiveGeneralWarmupSet[],
  si: number,
  value: number,
): LiveGeneralWarmupSet[] {
  return mapSet(sets, si, (w) => ({ ...w, minutes: Math.max(0, Math.round(value) || 0) }));
}

/** Art (Rad/Rudern/...) eines Cardio-Satzes setzen. */
export function withGeneralMode(
  sets: LiveGeneralWarmupSet[],
  si: number,
  mode: string,
): LiveGeneralWarmupSet[] {
  return mapSet(sets, si, (w) => ({ ...w, mode }));
}

/** Cardio-Satz anhaengen. */
export function withAppendedGeneral(
  sets: LiveGeneralWarmupSet[],
): LiveGeneralWarmupSet[] {
  return [...sets, { ...NEUER_SATZ }];
}

/** Letzten Cardio-Satz entfernen. Mindestens einer bleibt stehen. */
export function withRemovedGeneral(
  sets: LiveGeneralWarmupSet[],
): LiveGeneralWarmupSet[] {
  return sets.length > 1 ? sets.slice(0, -1) : sets;
}
