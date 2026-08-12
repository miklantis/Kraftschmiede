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
  return patch;
}
