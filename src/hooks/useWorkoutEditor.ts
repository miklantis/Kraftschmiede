import { useEffect, useMemo, useRef, useState } from "react";
import { useTemplates } from "./useTemplates";
import { useExercises } from "./useExercises";
import { useTemplateActions } from "./useTemplateActions";
import { useExerciseMuscles } from "./useExerciseMuscles";
import {
  addExercise as addEx,
  canSaveDraft,
  draftJourneyCapable,
  nameStatus,
  removeExercise as removeEx,
  reorderExercise,
  trimmedName,
  type NameStatus,
  type WorkoutDraft,
} from "@/lib/workoutEditor";
import {
  aggregateMuscleValues,
  muscleValuesFromRows,
} from "@/lib/muscles";
import type { ExerciseRow } from "@/schemas";

// Eine Zeile in der Editor-Uebungsliste (Name aus dem Katalog, Position = Index).
export interface EditorExerciseRow {
  exerciseId: string;
  name: string;
}

export interface UseWorkoutEditor {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Nur beim Bearbeiten: true, sobald geladen und das Workout nicht existiert. */
  notFound: boolean;

  name: string;
  setName: (name: string) => void;
  rows: EditorExerciseRow[];
  journeyCapable: boolean;
  nameState: NameStatus;
  canSave: boolean;
  isSaving: boolean;

  /**
   * Region->Intensitaet (0..1) fuer die MuscleMap: Schwerpunkt des Entwurfs
   * ueber alle enthaltenen Uebungen. Leer = kein Abschnitt (nichts hinterlegt).
   */
  muscleValues: Record<string, number>;

  /** Aktiver Katalog fuer den Auswaehler und die schon gewaehlten Ids. */
  catalog: ExerciseRow[];
  selectedIds: Set<string>;

  addExercise: (exerciseId: string) => void;
  removeExercise: (exerciseId: string) => void;
  reorder: (from: number, to: number) => void;

  /** Speichert und liefert die Workout-Id zurueck (fuer die Navigation). */
  save: () => Promise<string>;
  archive: () => Promise<void>;
  /** true beim Anlegen (kein Archivieren, andere Kopfzeile). */
  isNew: boolean;
}

// templateId = null -> neues Workout; sonst wird das bestehende geladen.
export function useWorkoutEditor(templateId: string | null): UseWorkoutEditor {
  const templatesQ = useTemplates();
  const exercisesQ = useExercises();
  const musclesQ = useExerciseMuscles();
  const actions = useTemplateActions();

  const isLoading = templatesQ.isLoading || exercisesQ.isLoading;
  const isError = templatesQ.isError || exercisesQ.isError;
  const error = templatesQ.error ?? exercisesQ.error;

  // Stabile Id fuer ein neu angelegtes Workout (einmal vergeben).
  const newIdRef = useRef<string>(crypto.randomUUID());
  const effectiveId = templateId ?? newIdRef.current;
  const isNew = templateId === null;

  const existing = useMemo(
    () =>
      templateId != null
        ? (templatesQ.data ?? []).find((t) => t.id === templateId) ?? null
        : null,
    [templatesQ.data, templateId],
  );
  const notFound = !isNew && !isLoading && !isError && existing === null;

  const [draft, setDraft] = useState<WorkoutDraft>({ name: "", exercises: [] });
  const initFor = useRef<string | null>(null);

  // Entwurf einmalig aus dem geladenen Workout (bzw. leer) setzen.
  useEffect(() => {
    if (isLoading || isError) return;
    if (initFor.current === effectiveId) return;
    if (isNew) {
      setDraft({ name: "", exercises: [] });
    } else if (existing) {
      setDraft({
        name: existing.name,
        exercises: existing.exercises
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((e) => ({ exerciseId: e.exerciseId })),
      });
    } else {
      return; // noch nicht gefunden – nicht initialisieren
    }
    initFor.current = effectiveId;
  }, [isLoading, isError, isNew, existing, effectiveId]);

  // Profile fuer die Journey-Faehigkeit und Namen fuer die Anzeige.
  const profiles: Record<string, string | undefined> = {};
  const names: Record<string, string> = {};
  for (const e of exercisesQ.data ?? []) {
    profiles[e.id] = e.profile;
    names[e.id] = e.name;
  }

  // Namen aller anderen Workouts (inkl. archivierter) fuer die Eindeutigkeit.
  const otherNames = useMemo(() => {
    const set = new Set<string>();
    for (const t of templatesQ.data ?? []) {
      if (t.id === effectiveId) continue;
      set.add(trimmedName(t.name));
    }
    return set;
  }, [templatesQ.data, effectiveId]);

  const nameState = nameStatus(draft.name, otherNames);
  const journeyCapable = draftJourneyCapable(draft, profiles);
  const canSave = canSaveDraft(draft, nameState);

  const rows: EditorExerciseRow[] = draft.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: names[e.exerciseId] ?? "Unbekannte Übung",
  }));

  // Beanspruchte Muskeln des Entwurfs: Beteiligung jeder enthaltenen Uebung
  // (Tabelle exercise_muscles) zu einer Karte zusammenfassen, Schwerpunkt-Regel
  // in aggregateMuscleValues. Bewusst NICHT Teil von isLoading/isError: laedt
  // die Zuordnung nicht, bleibt der Editor voll bedienbar und der Abschnitt
  // faellt still weg (leere Karte).
  const muscleRows = musclesQ.data;
  const muscleValues = useMemo(() => {
    if (!muscleRows) return {};
    const byExercise = new Map<string, typeof muscleRows>();
    for (const r of muscleRows) {
      const list = byExercise.get(r.exercise_id);
      if (list) list.push(r);
      else byExercise.set(r.exercise_id, [r]);
    }
    return aggregateMuscleValues(
      draft.exercises.map((e) =>
        muscleValuesFromRows(byExercise.get(e.exerciseId) ?? []),
      ),
    );
  }, [muscleRows, draft.exercises]);

  const catalog = exercisesQ.data ?? [];
  const selectedIds = new Set(draft.exercises.map((e) => e.exerciseId));

  const nextPosition = useMemo(() => {
    const positions = (templatesQ.data ?? []).map((t) => t.position);
    return positions.length ? Math.max(...positions) + 1 : 0;
  }, [templatesQ.data]);

  const save = async (): Promise<string> => {
    await actions.saveWorkout({
      templateId: effectiveId,
      name: trimmedName(draft.name),
      isNew,
      position: existing ? existing.position : nextPosition,
      exercises: draft.exercises.map((e) => ({
        exerciseId: e.exerciseId,
      })),
    });
    return effectiveId;
  };

  const archive = (): Promise<void> => actions.archiveWorkout(effectiveId);

  return {
    isLoading,
    isError,
    error,
    notFound,
    name: draft.name,
    setName: (name) => setDraft((d) => ({ ...d, name })),
    rows,
    journeyCapable,
    nameState,
    canSave,
    isSaving: actions.isSaving,
    muscleValues,
    catalog,
    selectedIds,
    addExercise: (id) => setDraft((d) => addEx(d, id)),
    removeExercise: (id) => setDraft((d) => removeEx(d, id)),
    reorder: (from, to) => setDraft((d) => reorderExercise(d, from, to)),
    save,
    archive,
    isNew,
  };
}
