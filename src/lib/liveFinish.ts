// Beenden einer Kraft-Einheit: verdichtet die laufende LiveSession zu den
// normalisierten Verlaufszeilen (Einheit + Einheit-Uebungen + Saetze) und den
// Katalog-Updates (naechstes Arbeitsgewicht, 1RM). Reine, vom Schema und von
// Supabase unabhaengige Logik - 1:1 aus V1 live.js finishSession:
//   - nur abgehakte Saetze ueberleben (ungemachte verfallen, Aufwaermen ebenso)
//   - Uebungen ohne erledigten Arbeitssatz fallen ganz raus
//   - je Uebung: metTarget je Satz, geschaetztes 1RM aus den sauberen Saetzen
//   - naechstes Arbeitsgewicht = hoechstes geleistetes Arbeitsgewicht
//
// Der Skill-Abschluss ist ein eigener Pfad (Lieferung 5) und nicht hier.

import type { RmFormula } from "@/engine/types";
import type {
  BodySnapshot,
  SessionInsert,
  SessionExerciseInsert,
  SetInsert,
} from "@/schemas";
import { deriveWorkSets } from "./setResult";
import type { WorkoutSession } from "./liveSession";

// ---- Ende-Vorschau (Popup) --------------------------------------------------
// Pro Uebung: Name, "erledigt / gesamt" der Arbeitssaetze und je Arbeitssatz ein
// Chip "Wdh × kg" (erledigte hervorgehoben). 1:1 aus V1 endSummaryData.

export interface EndSummaryChip {
  label: string;
  done: boolean;
}
export interface EndSummaryEntry {
  name: string;
  count: string;
  chips: EndSummaryChip[];
}

function commaWeight(w: number): string {
  return String(w).replace(".", ",");
}

export function liveEndSummary(session: WorkoutSession): EndSummaryEntry[] {
  return session.entries.map((en) => {
    const sets = en.sets ?? [];
    const done = sets.filter((s) => s.done).length;
    return {
      name: en.exerciseName,
      count: done + " / " + sets.length,
      chips: sets.map((s) => ({
        label: s.reps + "×" + commaWeight(s.weight) + " kg",
        done: s.done,
      })),
    };
  });
}

// ---- Verdichtung zu Verlaufszeilen -----------------------------------------

export interface FinishContext {
  session: WorkoutSession;
  userId: string;
  rmFormula: RmFormula;
  /** Eingefrorener Koerperzustand (heute, sonst zuletzt). */
  body: BodySnapshot;
  /** Eingefrorene globale Journey-Woche (nur Journey-Einheiten, sonst null). */
  week: number | null;
  /** Datum der Einheit (ISO yyyy-mm-dd). */
  date: string;
  /** Endzeitpunkt in ms (Date.now beim Beenden) - fuer die Dauer. */
  endedAt: number;
  /** ID-Erzeuger (Default crypto.randomUUID); injizierbar fuer Tests. */
  newId: () => string;
}

/** Kandidat fuer ein Katalog-Update (ob 1RM gesetzt wird, entscheidet der Hook
 *  anhand der Uebungs-Art). */
export interface ExerciseUpdate {
  exerciseId: string;
  workWeight: number;
  est1RM: number | null;
}

export interface FinishRows {
  sessionRow: SessionInsert & { id: string };
  exerciseRows: Array<SessionExerciseInsert & { id: string }>;
  setRows: Array<SetInsert & { id: string }>;
  exerciseUpdates: ExerciseUpdate[];
}

export function buildFinishRows(ctx: FinishContext): FinishRows {
  const { session, userId, rmFormula, body, week, date, endedAt, newId } = ctx;
  const sessionId = newId();
  const durationSec = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));

  const exerciseRows: Array<SessionExerciseInsert & { id: string }> = [];
  const setRows: Array<SetInsert & { id: string }> = [];
  const exerciseUpdates: ExerciseUpdate[] = [];

  let position = 0;
  session.entries.forEach((en) => {
    const warmDone = (en.warmupSets ?? []).filter((w) => w.done);
    const workDone = (en.sets ?? []).filter((s) => s.done);
    // Uebung ohne erledigten Arbeitssatz wird nicht gespeichert.
    if (workDone.length === 0) return;

    const seId = newId();

    // Aufwaermsaetze bleiben hier (nicht Teil des Satz-Ergebnis-Bausteins):
    // erst die erledigten Aufwaermsaetze, dann die Arbeitssaetze dahinter.
    let sp = 0;
    warmDone.forEach((w) => {
      setRows.push({
        id: newId(),
        user_id: userId,
        session_exercise_id: seId,
        kind: "warmup",
        position: sp++,
        reps: w.reps,
        weight: w.weight,
        duration_sec: null,
        score: null,
        failed: false,
        done: true,
        target_reps: null,
        target_weight: null,
        target_score: null,
        adjusted: false,
        adjust_note: "",
        met: null,
      });
    });

    // Arbeitssaetze: Zeilen + geschaetztes 1RM + naechstes Arbeitsgewicht.
    const work = deriveWorkSets(
      workDone.map((s) => ({
        reps: s.reps,
        weight: s.weight,
        score: s.score,
        targetReps: s.targetReps,
        targetWeight: s.targetWeight,
        adjusted: s.adjusted,
        adjustNote: s.adjustNote,
        failed: s.failed,
      })),
      { userId, sessionExerciseId: seId, rmFormula, newId, startPosition: sp },
    );
    work.setRows.forEach((r) => setRows.push(r));

    exerciseRows.push({
      id: seId,
      user_id: userId,
      session_id: sessionId,
      exercise_id: en.exerciseId,
      name: en.exerciseName,
      bar_id: en.barId,
      metric: null,
      tested_1rm: work.est1RM,
      suggestion: {},
      position: position++,
    });

    exerciseUpdates.push({
      exerciseId: en.exerciseId,
      workWeight: work.workWeight ?? 0,
      est1RM: work.est1RM,
    });
  });

  const sessionRow: SessionInsert & { id: string } = {
    id: sessionId,
    user_id: userId,
    date,
    type: "strength",
    status: "done",
    journey_id: session.journeyId,
    phase_id: session.phaseId,
    template_id: session.templateId,
    skill_id: null,
    week,
    duration_sec: durationSec,
    minutes: null,
    notes: "",
    started_at: new Date(session.startedAt).toISOString(),
    body,
    general_warmup: { sets: session.generalWarmup.sets },
    skill_phase: null,
    skill_result: null,
  };

  return { sessionRow, exerciseRows, setRows, exerciseUpdates };
}
