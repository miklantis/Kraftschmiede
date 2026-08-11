// Aufbau der laufenden Einheit (Vorhaben #55, Schritt 4) - die reine
// Feldabbildung. Eine Einheit kann auf drei Wegen beginnen: Kraft und Skill
// ueber das Start-Popup, der 1RM-Test direkt von der Uebungsseite. Alle drei
// bauten ihr Session-Objekt bisher als langes Literal mitten im Store zusammen,
// Feld fuer Feld und ohne Absicherung - kommt ein Feld dazu, faellt es an einer
// der drei Stellen leicht unter den Tisch.
//
// Die neue Kennung (newLiveId) und die Startzeit reicht der Store herein, damit
// die Fabriken rein und ohne Uhr pruefbar bleiben.

import type {
  LiveEntry,
  RmTestSession,
  SkillLiveExercise,
  SkillSession,
  WorkoutSession,
} from "./liveSession";

export interface StartWorkoutInput {
  templateId: string;
  title: string;
  journeyId: string | null;
  phaseId: string | null;
  /** Hinweis zur vorgegebenen Last der Phase; null ohne Lastfaktor-Journey. */
  loadNote: string | null;
  entries: WorkoutSession["entries"];
  generalWarmup: WorkoutSession["generalWarmup"];
}

export interface StartSkillInput {
  skillId: string;
  skillName: string;
  phaseIndex: number;
  mastered: boolean;
  exercises: SkillLiveExercise[];
}

export interface StartRmTestInput {
  exerciseId: string;
  /** Anzeigename der Uebung (Kopf, Mini-Streifen, Dialoge). */
  exerciseName: string;
  /** Rekord vor dem Test. */
  previousRm: number | null;
  entry: LiveEntry;
  generalWarmup: RmTestSession["generalWarmup"];
}

/** Gefuehrte Kraft-Einheit aus einer Vorlage. Journey, Phase und Lastfaktor-
 *  Hinweis werden zum Startzeitpunkt eingefroren (wie V1 buildLive). */
export function buildWorkoutSession(
  input: StartWorkoutInput,
  id: string,
  now: number,
): WorkoutSession {
  return {
    id,
    kind: "workout",
    templateId: input.templateId,
    journeyId: input.journeyId,
    phaseId: input.phaseId,
    loadNote: input.loadNote,
    title: input.title,
    startedAt: now,
    generalWarmup: input.generalWarmup,
    entries: input.entries,
  };
}

/** Skill-Einheit der aktuellen Phase. */
export function buildSkillSession(
  input: StartSkillInput,
  id: string,
  now: number,
): SkillSession {
  return {
    id,
    kind: "skill",
    title: input.skillName,
    startedAt: now,
    skillId: input.skillId,
    phaseIndex: input.phaseIndex,
    mastered: input.mastered,
    exercises: input.exercises,
  };
}

/** 1RM-Test: genau eine Uebung, dazu der Rekord VOR dem Test. */
export function buildRmTestSession(
  input: StartRmTestInput,
  id: string,
  now: number,
): RmTestSession {
  return {
    id,
    kind: "rmtest",
    title: "1RM-Test · " + input.exerciseName,
    startedAt: now,
    exerciseId: input.exerciseId,
    previousRm: input.previousRm,
    generalWarmup: input.generalWarmup,
    entries: [input.entry],
  };
}
