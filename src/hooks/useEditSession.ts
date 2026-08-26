import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { asRmFormula } from "@/lib/rmTest";
import { misstGewicht } from "@/lib/exercises";
import {
  buildEditPayload,
  buildSkillEditPayload,
  buildYogaEditPayload,
  type EditDraftExercise,
  type SkillEditDraftExercise,
  type EditPayload,
} from "@/lib/editSession";
import { EDIT_MUTATION_KEY } from "@/lib/editMutation";
import { useUserId } from "./useUserId";
import { useSettings } from "./useSettings";
import { useExercises } from "./useExercises";
import { useSessionsDetailed } from "./useSessionsDetailed";

/** Eingabe fuer das Speichern einer Bearbeitung – der Entwurf aus dem Panel. */
export interface EditSaveInput {
  sessionId: string;
  /** Datum der bearbeiteten Einheit (ISO) – fuer die „nur juengste“-Regel. */
  date: string;
  durationSec: number | null;
  /** Notiz der Einheit (sessions.notes); undefined = nicht anfassen. */
  notes?: string;
  exercises: Array<
    Pick<EditDraftExercise, "sessionExerciseId" | "exerciseId"> & {
      sets: EditDraftExercise["sets"];
      note?: string;
    }
  >;
}

export interface UseEditSession {
  /** Schreibt die Bearbeitung zurueck. Ohne Netz wird pausiert und nachgeholt. */
  save: (input: EditSaveInput) => void;
  /** Skill-Bearbeitung zurueckschreiben (Phasen-Fortschritt bleibt unberuehrt). */
  saveSkill: (input: SkillEditSaveInput) => void;
  /** Yoga-Bearbeitung zurueckschreiben (Minuten + Notiz). */
  saveYoga: (input: YogaEditSaveInput) => void;
  isSaving: boolean;
}

/** Eingabe fuer das Speichern einer Skill-Bearbeitung. */
export interface SkillEditSaveInput {
  sessionId: string;
  durationSec: number | null;
  exercises: SkillEditDraftExercise[];
  /** Notiz der ganzen Einheit (sessions.notes); undefined = nicht anfassen. */
  notes?: string;
}

/** Eingabe fuer das Speichern einer Yoga-Bearbeitung. */
export interface YogaEditSaveInput {
  sessionId: string;
  minutes: number;
  notes: string;
}

export function useEditSession(): UseEditSession {
  const userId = useUserId();
  const settingsQ = useSettings();
  const exercisesQ = useExercises();
  const detailedQ = useSessionsDetailed();

  const mutation = useMutation<void, Error, EditPayload>({
    mutationKey: EDIT_MUTATION_KEY,
  });

  const save = useCallback(
    (input: EditSaveInput): void => {
      if (!userId) return;
      const rmFormula = asRmFormula(settingsQ.data?.rm_formula);

      // 1RM-Tracking je Uebung aus dem Katalog: nur Uebungen, die sich in
      // Gewicht messen (siehe misstGewicht). Frueher stand hier das Profil,
      // was Dauer-Uebungen ausserhalb des Bodyweight-Profils uebersah.
      const byId = new Map((exercisesQ.data ?? []).map((e) => [e.id, e]));
      const tracksRm = (exerciseId: string): boolean => {
        const exo = byId.get(exerciseId);
        return exo ? misstGewicht(exo.metric) : false;
      };
      const currentRm = (exerciseId: string): number | null => {
        return byId.get(exerciseId)?.rm ?? null;
      };

      // „Nur juengste“: gibt es eine ANDERE Kraft-Einheit mit spaeterem Datum,
      // die diese Uebung enthaelt? Wenn nein, ist die bearbeitete die juengste.
      const sessions = detailedQ.data ?? [];
      const isYoungest = (exerciseId: string): boolean => {
        return !sessions.some(
          (s) =>
            s.id !== input.sessionId &&
            s.type === "strength" &&
            s.date > input.date &&
            s.exercises.some((e) => e.exerciseId === exerciseId),
        );
      };

      const payload = buildEditPayload({
        sessionId: input.sessionId,
        durationSec: input.durationSec,
        userId,
        rmFormula,
        date: input.date,
        notes: input.notes,
        exercises: input.exercises.map((e) => ({
          sessionExerciseId: e.sessionExerciseId,
          exerciseId: e.exerciseId,
          sets: e.sets,
          note: e.note,
        })),
        isYoungest,
        tracksRm,
        currentRm,
        newId: () => crypto.randomUUID(),
      });

      mutation.mutate(payload);
    },
    [userId, settingsQ.data, exercisesQ.data, detailedQ.data, mutation],
  );

  const saveSkill = useCallback(
    (input: SkillEditSaveInput): void => {
      if (!userId) return;
      const payload = buildSkillEditPayload({
        sessionId: input.sessionId,
        durationSec: input.durationSec,
        userId,
        exercises: input.exercises,
        notes: input.notes,
        newId: () => crypto.randomUUID(),
      });
      mutation.mutate(payload);
    },
    [userId, mutation],
  );

  const saveYoga = useCallback(
    (input: YogaEditSaveInput): void => {
      if (!userId) return;
      const payload = buildYogaEditPayload({
        sessionId: input.sessionId,
        minutes: input.minutes,
        notes: input.notes,
      });
      mutation.mutate(payload);
    },
    [userId, mutation],
  );

  return { save, saveSkill, saveYoga, isSaving: mutation.isPending };
}
