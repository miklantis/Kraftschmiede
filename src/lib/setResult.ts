// Satz-Ergebnis: die gemeinsame Ableitung gespeicherter ARBEITSSAETZE einer
// Uebung. Reine, von Supabase und DOM unabhaengige Logik. Frueher lag dieselbe
// Ableitung dreimal fast gleich vor (liveFinish beim Kraft-Beenden, skillFinish
// beim Skill-Beenden, editSession beim nachtraeglichen Bearbeiten). Hier nun an
// einem Ort, mit Kraft und Skill als zwei Spielarten desselben Bausteins:
//   - Kraft: rechnet mit Gewicht, schaetzt das 1RM, bewertet je Satz „Ziel
//     erreicht“ (engine.metTarget) und nennt das naechste Arbeitsgewicht.
//   - Skill: rechnet mit Wiederholungen bzw. Haltezeit gegen das Phasen-Ziel
//     (engine.skillSetMet); kein Gewicht, kein 1RM.
//
// Bewusst NICHT hier: Aufwaermsaetze, der Kopf einer Einheit (Datum, Dauer,
// Journey/Phase) und das Coach-Nachziehen („nur juengste Einheit“) - die bleiben
// bei den jeweiligen Aufrufern, weil sie nur an je eine Stelle gehoeren.

import { best1RMFromSets } from "@/engine/oneRM";
import { metTarget } from "@/engine/target";
import { skillSetMet } from "@/engine/skills";
import type { EngineSet, RmFormula } from "@/engine/types";
import type { SetInsert } from "@/schemas";

// ---- Eingaben (aufrufer-unabhaengig) ---------------------------------------

/** Ein zu speichernder Kraft-Arbeitssatz. target* tragen den geplanten Wert
 *  (bei korrigierten/neuen Saetzen = der Wert selbst), damit „Ziel erreicht“
 *  stabil bleibt. failed ist optional (Default false – die Korrektur kennt kein
 *  Versagen). */
export interface WorkSetInput {
  reps: number;
  weight: number;
  score: number | null;
  targetReps: number;
  targetWeight: number;
  adjusted: boolean;
  adjustNote: string;
  failed?: boolean;
}

/** Ein zu speichernder Skill-Arbeitssatz: nur der Ergebniswert (Wdh bzw. Sek). */
export interface SkillSetInput {
  value: number;
}

/** Gemeinsamer Schreib-Bezug je Uebung. startPosition erlaubt es, hinter bereits
 *  vergebenen Positionen (z. B. Aufwaermsaetzen) weiterzuzaehlen. */
export interface SetRowContext {
  userId: string;
  sessionExerciseId: string;
  newId: () => string;
  startPosition?: number;
}

// ---- gemeinsame Satz-Zeile --------------------------------------------------
// Die eine Stelle, an der die Form einer gespeicherten Satz-Zeile lebt.

interface WorkRowFields {
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  score: number | null;
  failed: boolean;
  targetReps: number | null;
  targetWeight: number | null;
  adjusted: boolean;
  adjustNote: string;
  met: boolean | null;
}

function workRow(
  ctx: { userId: string; sessionExerciseId: string; newId: () => string },
  position: number,
  f: WorkRowFields,
): SetInsert & { id: string } {
  return {
    id: ctx.newId(),
    user_id: ctx.userId,
    session_exercise_id: ctx.sessionExerciseId,
    kind: "work",
    position,
    reps: f.reps,
    weight: f.weight,
    duration_sec: f.durationSec,
    score: f.score,
    failed: f.failed,
    done: true,
    target_reps: f.targetReps,
    target_weight: f.targetWeight,
    target_score: null,
    adjusted: f.adjusted,
    adjust_note: f.adjustNote,
    met: f.met,
  };
}

// ---- Kraft ------------------------------------------------------------------

function toEngineWork(s: WorkSetInput): EngineSet {
  return {
    type: "work",
    done: true,
    failed: s.failed ?? false,
    weight: s.weight,
    reps: s.reps,
    targetReps: s.targetReps,
    targetWeight: s.targetWeight,
    adjusted: s.adjusted,
  };
}

export interface WorkSetResult {
  /** Fertige Satz-Zeilen (work) fuer die DB. */
  setRows: Array<SetInsert & { id: string }>;
  /** Geschaetztes 1RM aus den sauberen Arbeitssaetzen (null wenn keins). */
  est1RM: number | null;
  /** Hoechstes geleistetes Arbeitsgewicht (null wenn keine Saetze). */
  workWeight: number | null;
  /** Naechste freie Position (startPosition + Anzahl Saetze). */
  nextPosition: number;
}

/** Kraft-Arbeitssaetze einer Uebung verdichten: Satz-Zeilen (je Satz „Ziel
 *  erreicht“), geschaetztes 1RM und naechstes Arbeitsgewicht. */
export function deriveWorkSets(
  sets: WorkSetInput[],
  ctx: SetRowContext & { rmFormula: RmFormula },
): WorkSetResult {
  const start = ctx.startPosition ?? 0;
  const setRows = sets.map((s, i) =>
    workRow(ctx, start + i, {
      reps: s.reps,
      weight: s.weight,
      durationSec: null,
      score: s.score,
      failed: s.failed ?? false,
      targetReps: s.targetReps,
      targetWeight: s.targetWeight,
      adjusted: s.adjusted,
      adjustNote: s.adjustNote,
      met: metTarget(toEngineWork(s)),
    }),
  );
  const est1RM = best1RMFromSets(sets.map(toEngineWork), ctx.rmFormula).value;
  const workWeight =
    sets.length > 0 ? Math.max(...sets.map((s) => s.weight)) : null;
  return { setRows, est1RM, workWeight, nextPosition: start + sets.length };
}

// ---- Skill ------------------------------------------------------------------

export interface SkillSetResult {
  setRows: Array<SetInsert & { id: string }>;
  nextPosition: number;
}

/** Skill-Arbeitssaetze einer Uebung verdichten: je Satz der Ergebniswert (Wdh
 *  in reps bzw. Haltezeit in duration_sec) und „Ziel erreicht“ gegen das
 *  Phasen-Ziel. Kein Gewicht, kein 1RM. */
export function deriveSkillSets(
  sets: SkillSetInput[],
  ctx: SetRowContext & { metric: "reps" | "duration"; target: number },
): SkillSetResult {
  const start = ctx.startPosition ?? 0;
  const isReps = ctx.metric === "reps";
  const setRows = sets.map((s, i) =>
    workRow(ctx, start + i, {
      reps: isReps ? s.value : null,
      weight: null,
      durationSec: isReps ? null : s.value,
      score: null,
      failed: false,
      targetReps: isReps ? ctx.target : null,
      targetWeight: null,
      adjusted: false,
      adjustNote: "",
      met: skillSetMet(ctx.metric, ctx.target, { value: s.value, done: true }),
    }),
  );
  return { setRows, nextPosition: start + sets.length };
}
