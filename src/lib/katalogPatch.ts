// Katalog-Fortschreibung nach einer Kraft-Einheit: die eine Stelle mit der
// Regel „Arbeitsgewicht immer, 1RM nur als Rekord“.
//
// Das Arbeitsgewicht der Uebung wird bei jedem Nachziehen gesetzt – es ist der
// laufende Stand, kein Rekord. Das 1RM dagegen ist ein Rekord: es wird nur
// angehoben, wenn die Uebung ueberhaupt ein 1RM traegt (alles ausser reinem
// Koerpergewicht) und nextRecord1RM einen hoeheren Wert liefert. Automatisch
// gesenkt wird nie.
//
// Aufrufer sind das Beenden einer Einheit (useFinishSession) und die
// nachtraegliche Korrektur (editSession). exercisePatchToRecord in
// historyWrite.ts bleibt davon unberuehrt: das bildet nur auf DB-Felder ab.

import { nextRecord1RM } from "@/engine/oneRM";
import type { ExercisePatch } from "./finishMutation";

export interface KatalogPatchInput {
  /** Katalog-ID der Uebung. */
  exerciseId: string;
  /** Neues Arbeitsgewicht aus den Arbeitssaetzen der Einheit. */
  workWeight: number;
  /** Traegt die Uebung ein 1RM? (false bei reinem Koerpergewicht) */
  tracksRm: boolean;
  /** Bisher gespeicherter 1RM-Rekord (null = noch keiner). */
  currentRm: number | null;
  /** Rekord-Kandidat aus wenigen Wiederholungen. */
  record1RM: number | null;
  /** Geschaetztes 1RM der Einheit (Rueckfall, wenn es noch keinen Rekord gibt). */
  est1RM: number | null;
  /** Datum der Einheit (ISO) – wird als rm_as_of gesetzt. */
  date: string;
  /** Lastplan der Phase fuer diese Uebung; fehlt er, bleibt der Anker unberuehrt. */
  anchor?: AnchorInput | null;
}

/** Anker einer lastgesteuerten Phase, so wie er in diese Einheit einging. */
export interface AnchorInput {
  /** Phase, zu der der Anker gehoert. */
  phaseId: string;
  /** Anteil der Wochenlast am Anker (loadShareForWeek). */
  loadShare: number;
  /** Anker, mit dem die Einheit gerechnet wurde. */
  weight: number;
}

export function katalogPatch(input: KatalogPatchInput): ExercisePatch {
  const patch: ExercisePatch = {
    id: input.exerciseId,
    work_weight: input.workWeight,
  };
  const nextRm = input.tracksRm
    ? nextRecord1RM({
        current: input.currentRm,
        record: input.record1RM,
        estimate: input.est1RM,
      })
    : null;
  if (nextRm != null) {
    patch.rm = nextRm;
    patch.rm_as_of = input.date;
    patch.rm_stale = false;
  }
  const anker = ankerNachEinheit(input);
  if (anker != null) {
    patch.reference_weight = anker;
    patch.reference_phase_id = input.anchor?.phaseId ?? null;
  }
  return patch;
}

// Anker der Phase nach dieser Einheit. Er wandert nur nach unten: hat der Coach
// wegen Versagen oder zu hoher Anstrengung gesenkt, soll die Rampe der
// Restwochen auf dem tatsaechlich gestemmten Niveau weiterlaufen statt naechste
// Woche wieder gegen dieselbe zu schwere Wand zu laufen. Nach oben bleibt er
// stehen: ein guter Tag ueberholt den Plan nicht.
//
// null = nichts schreiben (keine lastgesteuerte Phase oder der Anker haelt).
function ankerNachEinheit(input: KatalogPatchInput): number | null {
  const a = input.anchor;
  if (!a || !(a.loadShare > 0) || !(a.weight > 0)) return null;
  if (!(input.workWeight > 0)) return a.weight;
  const ausLeistung = input.workWeight / a.loadShare;
  return ausLeistung < a.weight ? ausLeistung : a.weight;
}
