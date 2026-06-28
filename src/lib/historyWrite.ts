// Schreib-Baustein des Verlaufs: die drei Schreib-Folgen (Kraft beenden, Skill
// beenden, Einheit bearbeiten) als duenne Sequenzen ueber der Naht HistoryStore.
// Reihenfolge, Bedingungen (leere Listen ueberspringen) und die Katalog-Patch-
// Regel liegen hier an einem Ort; das eigentliche Schreiben und Fehlerwerfen
// macht der uebergebene Speicher. Damit sind die drei Folgen mit einem Speicher
// im Arbeitsspeicher pruefbar, ohne echte Datenbank.
//
// Haengt nur an der Naht (Typ HistoryStore) und an den Paket-Typen – alles als
// reine Typen, also keine Laufzeit-Abhaengigkeit nach oben. Der Modulgraph
// bleibt kreisfrei: die drei Mutationen rufen hier herein, hier wird nichts
// von ihnen zur Laufzeit gebraucht.

import type { HistoryStore } from "./historyStore";
import type { ExercisePatch, FinishPayload } from "./finishMutation";
import type { FinishSkillPayload } from "./finishSkillMutation";
import type { EditPayload } from "./editSession";

/** Aus einem Katalog-Patch die Datenbank-Felder bauen: Arbeitsgewicht immer,
 *  1RM nur wenn bestimmt (dann rm_stale zuruecksetzen). Eine Stelle fuer
 *  Beenden und Bearbeiten. */
function exercisePatchToRecord(p: ExercisePatch): Record<string, unknown> {
  const patch: Record<string, unknown> = { work_weight: p.work_weight };
  if (p.rm != null) {
    patch.rm = p.rm;
    patch.rm_as_of = p.rm_as_of;
    patch.rm_stale = false;
  }
  return patch;
}

/** Kraft-Einheit beenden: Einheit + Uebungen + Saetze einfuegen, Katalog
 *  nachziehen. */
export async function writeFinishStrength(
  store: HistoryStore,
  payload: FinishPayload,
): Promise<void> {
  await store.insertSession(payload.sessionRow);
  if (payload.exerciseRows.length) {
    await store.insertSessionExercises(payload.exerciseRows);
  }
  if (payload.setRows.length) {
    await store.insertSets(payload.setRows);
  }
  for (const p of payload.exercisePatches) {
    await store.updateExercise(p.id, exercisePatchToRecord(p));
  }
}

/** Skill-Einheit beenden: Einfuegen wie bei Kraft, danach Skill-Fortschritt
 *  nachziehen. */
export async function writeFinishSkill(
  store: HistoryStore,
  payload: FinishSkillPayload,
): Promise<void> {
  await store.insertSession(payload.sessionRow);
  if (payload.exerciseRows.length) {
    await store.insertSessionExercises(payload.exerciseRows);
  }
  if (payload.setRows.length) {
    await store.insertSets(payload.setRows);
  }
  if (payload.progressWrite) {
    await store.updateSkillProgress(payload.progressWrite);
  }
}

/** Einheit bearbeiten: Einheit-Felder (Dauer bzw. Minuten + Notiz), je Uebung
 *  Arbeitssaetze ersetzen und tested_1rm setzen, Katalog nachziehen (nur
 *  juengste – vom Hook entschieden). */
export async function writeEditSession(
  store: HistoryStore,
  payload: EditPayload,
): Promise<void> {
  const sessionPatch: Record<string, unknown> = {};
  if (payload.durationSec != null) {
    sessionPatch.duration_sec = payload.durationSec;
  }
  if (payload.minutes !== undefined) sessionPatch.minutes = payload.minutes;
  if (payload.notes !== undefined) sessionPatch.notes = payload.notes;
  if (Object.keys(sessionPatch).length > 0) {
    await store.updateSession(payload.sessionId, sessionPatch);
  }

  for (const ex of payload.exercises) {
    await store.replaceWorkSets(ex.sessionExerciseId, ex.workSetRows);
    await store.setTested1RM(ex.sessionExerciseId, ex.tested1RM);
  }

  for (const p of payload.exercisePatches) {
    await store.updateExercise(p.id, exercisePatchToRecord(p));
  }
}

/** Welche Ansichten nach welchem Schreibvorgang aufzufrischen sind – an einer
 *  Stelle, damit Beenden/Bearbeiten/Skill nicht je eigene Schluessel pflegen.
 *  Die Mutationen lesen diese Schluessel in ihrer onSuccess. */
export const HISTORY_INVALIDATE = {
  finishStrength: [["sessions"], ["sessions-detailed"], ["exercises"]],
  finishSkill: [
    ["sessions"],
    ["sessions-detailed"],
    ["skillProgress"],
    ["trainingOverview"],
  ],
  edit: [["sessions"], ["sessions-detailed"], ["exercises"]],
} as const;
