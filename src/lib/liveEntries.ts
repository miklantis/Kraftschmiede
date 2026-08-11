// Satz-Logik der laufenden Einheit (Vorhaben #55, Schritt 1) - die reine
// Umformung. Keine React-/DOM-/DB-Abhaengigkeit: nimmt die Live-Eintraege als
// Daten herein und gibt neue Eintraege heraus. Der geraete-lokale Store
// (useLiveSession) haelt, sichert und loest Seiteneffekte aus; entschieden und
// umgeformt wird hier.
//
// Drei Fachregeln stecken hier drin, die man beim Lesen leicht uebersieht:
// - Gewicht weicht vom Ziel ab -> Satz gilt als angepasst (V1 markAdjust)
// - Bewertung 5 (RIR 0) -> Satz gilt als nicht geschafft (V1 failed)
// - im 1RM-Test sind die Wiederholungen nach oben geklemmt (clampTestReps)
//
// Gibt es nichts zu aendern, kommt dieselbe Array-Referenz zurueck, damit der
// Store nicht unnoetig benachrichtigt.

import { clampTestReps } from "./rmTest";
import { appendedSet } from "./liveFlow";
import type { LiveEntry } from "./liveSession";

/** Eine Uebung ersetzen. Liefert `fn` dieselbe Uebung zurueck (oder gibt es die
 *  Uebung nicht), bleibt auch das Array referenzgleich. */
function mapEntry(
  entries: LiveEntry[],
  ei: number,
  fn: (e: LiveEntry) => LiveEntry,
): LiveEntry[] {
  const cur = entries[ei];
  if (!cur) return entries;
  const next = fn(cur);
  if (next === cur) return entries;
  return entries.map((e, i) => (i === ei ? next : e));
}

/** Wiederholungen normalisieren: ganzzahlig, nie negativ; im 1RM-Test zusaetzlich
 *  auf den belastbaren Bereich geklemmt. */
function normReps(value: number, istRmTest: boolean): number {
  return istRmTest ? clampTestReps(value) : Math.max(0, Math.round(value) || 0);
}

/** Arbeitssatz abhaken oder loesen. */
export function withSetDone(
  entries: LiveEntry[],
  ei: number,
  si: number,
  done: boolean,
): LiveEntry[] {
  return mapEntry(entries, ei, (e) => {
    const cur = e.sets[si];
    if (!cur || cur.done === done) return e;
    return { ...e, sets: e.sets.map((x, j) => (j === si ? { ...x, done } : x)) };
  });
}

/** Aufwaermsatz einer Uebung abhaken oder loesen. */
export function withWarmDone(
  entries: LiveEntry[],
  ei: number,
  wi: number,
  done: boolean,
): LiveEntry[] {
  return mapEntry(entries, ei, (e) => {
    const cur = e.warmupSets[wi];
    if (!cur || cur.done === done) return e;
    return {
      ...e,
      warmupSets: e.warmupSets.map((w, j) => (j === wi ? { ...w, done } : w)),
    };
  });
}

/** Wert eines Arbeitssatzes uebernehmen (Wdh/kg/Bewertung).
 *  `istRmTest` kommt als Parameter herein, damit die Funktion rein bleibt. */
export function withSetValue(
  entries: LiveEntry[],
  ei: number,
  si: number,
  kind: "reps" | "weight" | "score",
  value: number,
  istRmTest: boolean,
): LiveEntry[] {
  return mapEntry(entries, ei, (e) => {
    if (!e.sets[si]) return e;
    return {
      ...e,
      sets: e.sets.map((x, j) => {
        if (j !== si) return x;
        if (kind === "reps") return { ...x, reps: normReps(value, istRmTest) };
        if (kind === "weight") {
          // Weicht das Gewicht vom geplanten Ziel ab, wird der Satz als angepasst
          // vermerkt (V1 markAdjust). Der Vermerk wird bewusst nie zurueckgenommen.
          if (value !== x.targetWeight) {
            return { ...x, weight: value, adjusted: true, adjustNote: "Gewicht angepasst" };
          }
          return { ...x, weight: value };
        }
        // score: 5 (RIR 0) markiert den Satz als nicht geschafft (V1 failed).
        return { ...x, score: value, failed: value === 5 };
      }),
    };
  });
}

/** Wert eines Aufwaermsatzes uebernehmen (Wdh/kg). */
export function withWarmValue(
  entries: LiveEntry[],
  ei: number,
  wi: number,
  kind: "reps" | "weight",
  value: number,
): LiveEntry[] {
  return mapEntry(entries, ei, (e) => {
    if (!e.warmupSets[wi]) return e;
    return {
      ...e,
      warmupSets: e.warmupSets.map((w, j) =>
        j === wi
          ? { ...w, [kind]: kind === "reps" ? Math.max(0, Math.round(value) || 0) : value }
          : w,
      ),
    };
  });
}

/** Satz anhaengen (uebernimmt die Zielwerte des letzten Satzes). */
export function withAppendedSet(entries: LiveEntry[], ei: number): LiveEntry[] {
  return mapEntry(entries, ei, (e) => ({ ...e, sets: [...e.sets, appendedSet(e)] }));
}

/** Letzten Satz entfernen. Mindestens ein Satz bleibt stehen. */
export function withRemovedSet(entries: LiveEntry[], ei: number): LiveEntry[] {
  return mapEntry(entries, ei, (e) =>
    e.sets.length > 1 ? { ...e, sets: e.sets.slice(0, -1) } : e,
  );
}

/** Stange einer Langhantel-Uebung wechseln. */
export function withBar(
  entries: LiveEntry[],
  ei: number,
  bar: { id: string; name: string; weight: number },
): LiveEntry[] {
  return mapEntry(entries, ei, (e) => ({
    ...e,
    barId: bar.id,
    barName: bar.name,
    barWeight: bar.weight,
  }));
}
