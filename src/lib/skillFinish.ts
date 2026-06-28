// Beenden einer Skill-Einheit (Phase 11, Lieferung 5). Reine, von Supabase
// unabhaengige Logik - 1:1 aus V1 live.js finishSkillSession:
//   - je Satz: met = Ergebnis erreicht das Phasen-Ziel (engine.skillSetMet)
//   - Einheit-Ergebnis = engine.skillSessionResult (completed/missed/skipped)
//   - nur abgehakte Saetze ueberleben in den Verlauf
//   - Konsekutiv-Logik: completed zaehlt hoch (ab Schwelle Phase weiter bzw.
//     gemeistert), missed setzt auf 0, skipped laesst unveraendert
//
// Geschrieben wird die Einheit ohne Katalogbezug: session_exercises mit
// exercise_id null und dem Phasen-Uebungsnamen, sets mit value (Wdh in reps,
// Haltezeit in duration_sec) und met. Die Phasen-Uebungen werden ALLE als Zeile
// gespeichert (auch ohne erledigten Satz), damit die Position der Uebungs-
// Detailseite (skill_phase + Position) erhalten bleibt.

import { skillSessionResult } from "@/engine/skills";
import type {
  SkillPhaseExercise,
  SkillSet,
  SkillWorkExercise,
} from "@/engine/types";
import type {
  SessionInsert,
  SessionExerciseInsert,
  SetInsert,
} from "@/schemas";
import { deriveSkillSets } from "./setResult";
import type { SkillSession, SkillLiveExercise } from "./liveSession";

// ---- Ende-Vorschau (Popup) --------------------------------------------------
// Pro Uebung: Name, "erledigt / gesamt" und je Satz ein Chip mit dem Ergebnis
// (erledigte hervorgehoben); dazu Dauer und Gesamtzahl. 1:1 aus V1
// skillEndSummaryHTML.

export interface SkillEndChip {
  label: string;
  done: boolean;
}
export interface SkillEndEntry {
  name: string;
  count: string;
  allDone: boolean;
  chips: SkillEndChip[];
}
export interface SkillEndSummary {
  durationSec: number;
  doneSets: number;
  totalSets: number;
  entries: SkillEndEntry[];
}

export function skillEndSummary(
  session: SkillSession,
  endedAt: number,
): SkillEndSummary {
  const durationSec = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));
  let totalSets = 0;
  let doneSets = 0;
  const entries: SkillEndEntry[] = session.exercises.map((we) => {
    const unit = we.metric === "duration" ? " s" : "";
    const done = we.sets.filter((s) => s.done).length;
    totalSets += we.sets.length;
    doneSets += done;
    return {
      name: we.name,
      count: done + " / " + we.sets.length,
      allDone: we.sets.length > 0 && done === we.sets.length,
      chips: we.sets.map((s) => ({
        label: (s.value == null ? "–" : String(s.value)) + unit,
        done: s.done,
      })),
    };
  });
  return { durationSec, doneSets, totalSets, entries };
}

// ---- Verdichtung zu Verlaufszeilen + Fortschritt ----------------------------

/** Eine Phasen-Uebung als Planvorgabe (Ergebnis-Bewertung). */
export interface SkillFinishPlanExercise {
  metric: "reps" | "duration";
  target: number;
  sets: number;
}

/** Fortschritt nach der Einheit (Felder der skill_progress-Zeile). */
export interface SkillProgressPatch {
  currentPhase: number;
  consecutiveCount: number;
  mastered: boolean;
}

export interface SkillFinishContext {
  session: SkillSession;
  userId: string;
  /** Geplante Phasen-Uebungen (Ergebnis-Bewertung) - index-gleich zu den
   *  Einheit-Uebungen. */
  planExercises: SkillFinishPlanExercise[];
  /** Aufstiegsschwelle der aktuellen Phase (consecutiveSessions). */
  consecutiveSessions: number;
  /** Anzahl Phasen des Skills (fuer das Gemeistert-Erreichen). */
  phasesLength: number;
  /** Aktueller Fortschritt vor dieser Einheit. */
  progress: SkillProgressPatch;
  /** Datum der Einheit (ISO yyyy-mm-dd). */
  date: string;
  /** Endzeitpunkt in ms (Date.now beim Beenden) - fuer die Dauer. */
  endedAt: number;
  /** ID-Erzeuger (Default crypto.randomUUID); injizierbar fuer Tests. */
  newId: () => string;
}

export interface SkillFinishRows {
  sessionRow: SessionInsert & { id: string };
  exerciseRows: Array<SessionExerciseInsert & { id: string }>;
  setRows: Array<SetInsert & { id: string }>;
  result: "completed" | "missed" | "skipped";
  progressPatch: SkillProgressPatch;
}

// Einheit-Uebung in die Engine-Satzform (skillSessionResult bewertet selbst nach
// done). value/done direkt uebernehmen.
function toWorkExercise(ex: SkillLiveExercise): SkillWorkExercise {
  const sets: SkillSet[] = ex.sets.map((s) => ({ value: s.value, done: s.done }));
  return { sets };
}

// Konsekutiv-Logik wie V1 finishSkillSession: completed zaehlt hoch (ab Schwelle
// Phase weiter; letzte Phase erreicht -> gemeistert), missed setzt zurueck,
// skipped bleibt.
function advanceProgress(
  result: "completed" | "missed" | "skipped",
  prog: SkillProgressPatch,
  consecutiveSessions: number,
  phasesLength: number,
): SkillProgressPatch {
  if (result === "missed") {
    return { ...prog, consecutiveCount: 0 };
  }
  if (result !== "completed") {
    return prog; // skipped -> unveraendert
  }
  let count = prog.consecutiveCount + 1;
  let phase = prog.currentPhase;
  let mastered = prog.mastered;
  if (consecutiveSessions > 0 && count >= consecutiveSessions) {
    phase = phase + 1;
    count = 0;
    if (phase >= phasesLength) {
      phase = Math.max(0, phasesLength - 1);
      mastered = true;
    }
  }
  return { currentPhase: phase, consecutiveCount: count, mastered };
}

export function buildSkillFinishRows(ctx: SkillFinishContext): SkillFinishRows {
  const { session, userId, planExercises, date, endedAt, newId } = ctx;
  const sessionId = newId();
  const durationSec = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));

  const planForEngine: SkillPhaseExercise[] = planExercises.map((p) => ({
    metric: p.metric,
    target: p.target,
    sets: p.sets,
  }));
  const work = session.exercises.map(toWorkExercise);
  const result = skillSessionResult(planForEngine, work);

  const exerciseRows: Array<SessionExerciseInsert & { id: string }> = [];
  const setRows: Array<SetInsert & { id: string }> = [];

  session.exercises.forEach((we, i) => {
    const plan = planExercises[i] ?? { metric: we.metric, target: we.target, sets: we.sets.length };
    const seId = newId();
    // ALLE Phasen-Uebungen als Zeile (Position = Phasen-Index), damit die
    // Uebungs-Detailseite die Saetze ueber skill_phase + Position zuordnen kann.
    exerciseRows.push({
      id: seId,
      user_id: userId,
      session_id: sessionId,
      exercise_id: null,
      name: we.name,
      bar_id: null,
      metric: we.metric,
      tested_1rm: null,
      suggestion: {},
      position: i,
    });

    // Nur erledigte Saetze ueberleben; Zeilen + „Ziel erreicht“ kommen aus dem
    // gemeinsamen Satz-Ergebnis (Skill-Spielart). Ziel aus dem Plan.
    const skill = deriveSkillSets(
      we.sets.filter((s) => s.done).map((s) => ({ value: s.value ?? 0 })),
      {
        userId,
        sessionExerciseId: seId,
        metric: plan.metric,
        target: plan.target,
        newId,
      },
    );
    skill.setRows.forEach((r) => setRows.push(r));
  });

  const sessionRow: SessionInsert & { id: string } = {
    id: sessionId,
    user_id: userId,
    date,
    type: "skill",
    status: "done",
    skill_id: session.skillId,
    skill_phase: session.phaseIndex,
    skill_result: result,
    duration_sec: durationSec,
    started_at: new Date(session.startedAt).toISOString(),
  };

  const progressPatch = advanceProgress(
    result,
    ctx.progress,
    ctx.consecutiveSessions,
    ctx.phasesLength,
  );

  return { sessionRow, exerciseRows, setRows, result, progressPatch };
}
