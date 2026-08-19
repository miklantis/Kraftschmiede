// Katalog-Fortschreibung nach einer Kraft-Einheit: die eine Stelle mit der
// Regel „Arbeitsgewicht immer, 1RM nur als Rekord“.
//
// Der Phasenanker einer Kraftphase mit Wochenplan liegt ebenfalls hier: er
// folgt der Vorgabe nach unten, nie nach oben (Issue #225). Beim Eintritt in die
// Phase wird derselbe Wert als Startgewicht X festgehalten - davon entlastet
// spaeter die Kombiwoche.
//
// Das Arbeitsgewicht der Uebung wird bei jedem Nachziehen gesetzt – es ist der
// laufende Stand, kein Rekord. Das 1RM dagegen ist ein Rekord: es wird nur
// angehoben, wenn die Uebung ueberhaupt ein 1RM traegt (alles ausser reinem
// Koerpergewicht) und nextRecord1RM einen hoeheren Wert liefert. Automatisch
// gesenkt wird nie.
//
// Aufrufer sind das Beenden einer Einheit (useFinishSession) und die
// nachtraegliche Korrektur (editSession). Den Phasenanker setzt nur das
// Beenden: die Korrektur reicht keinen planAnchor herein und laesst ihn stehen. exercisePatchToRecord in
// historyWrite.ts bleibt davon unberuehrt: das bildet nur auf DB-Felder ab.

import { nextRecord1RM } from "@/engine/oneRM";
import { anchorAfterSession } from "@/engine/planLoad";
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
  /** Anker der Phase mit Wochenplan – nur gesetzt, wenn der Plan diese Uebung
   *  in dieser Einheit gesteuert hat (Hauptuebung mit Kraftprofil in einer
   *  Kraft-/Schnellkraftphase). `plannedWeight` ist die Vorgabe der Einheit. */
  planAnchor?: {
    phaseId: string;
    plannedWeight: number | null;
    /** Phase, an die der bisherige Anker gebunden ist. Weicht sie ab, tritt die
     *  Uebung mit dieser Einheit in die Phase ein - dann wird ihr Startgewicht X
     *  zusaetzlich festgehalten (Bezug der Entlastung in der Kombiwoche). */
    boundPhaseId?: string | null;
  } | null;
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
  // Phasenanker des Wochenplans: die Vorgabe, aber nie hoeher als das
  // tatsaechlich Bewegte. Nach oben zieht der Anker nie mit (ein guter Tag
  // ueberholt den Plan nicht), nach unten zieht er nach, wenn im Training
  // selbst reduziert wurde. Das ist die eine Stelle mit dieser Regel.
  if (input.planAnchor) {
    const anchor = anchorAfterSession(
      input.planAnchor.plannedWeight,
      input.workWeight,
    );
    if (anchor != null && anchor > 0) {
      patch.reference_weight = anchor;
      patch.reference_phase_id = input.planAnchor.phaseId;
      // Erste Einheit der Uebung in dieser Phase: derselbe Wert ist ihr
      // Startgewicht X und bleibt stehen, waehrend der Anker weiterlaeuft. Die
      // Kombiwoche entlastet von X, nicht vom Stand am Phasenende.
      if (input.planAnchor.boundPhaseId !== input.planAnchor.phaseId) {
        patch.plan_start_weight = anchor;
      }
    }
  }
  return patch;
}
