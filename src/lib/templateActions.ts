// Workout-Aktionen (Speichern, Archivieren, Reaktivieren) als registrierter
// Mutations-Default – analog zu finishMutation.ts/editMutation.ts, damit eine
// ohne Netz pausierte Aenderung den App-Neustart uebersteht und automatisch
// nachgeschickt wird (resumePausedMutations in main.tsx). Kennung
// (TEMPLATE_MUTATION_KEY) und Registrier-Reihenfolge bleiben dafuer stabil;
// die Registrierung liegt vor der einer spaeteren Journey-Zuordnung (Lieferung 4),
// damit ein offline neu angelegtes Workout vor seiner Zuordnung landet (ADR-0009).
//
// Speichern schreibt Workout und Uebungsliste zusammen mit vorab vergebenen IDs:
// bei bestehenden Workouts wird die Uebungsliste sauber ersetzt (die Vorlage ist
// nur ein Rezept; der Verlauf kopiert Uebungen beim Start und haengt nicht an
// template_exercises). Archivieren/Reaktivieren setzt nur templates.active.

import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const TEMPLATE_MUTATION_KEY = ["templateAction"] as const;

// Eine Uebung im Speicher-Paket (IDs bereits vergeben, Position aus der
// Reihenfolge).
export interface WorkoutSaveExercise {
  id: string;
  exercise_id: string;
  position: number;
}

// Speicher-Paket: Workout-Kopf + vollstaendige Uebungsliste. isNew unterscheidet
// Anlegen (Insert des Kopfes) von Bearbeiten (Update des Namens).
export interface WorkoutSavePayload {
  kind: "save";
  userId: string;
  templateId: string;
  name: string;
  isNew: boolean;
  position: number;
  exercises: WorkoutSaveExercise[];
}

// Archivieren/Reaktivieren: nur der active-Schalter.
export interface WorkoutActivePayload {
  kind: "setActive";
  templateId: string;
  active: boolean;
}

export type TemplateActionPayload = WorkoutSavePayload | WorkoutActivePayload;

async function writeSave(p: WorkoutSavePayload): Promise<void> {
  if (p.isNew) {
    const { error } = await supabase.from("templates").insert({
      id: p.templateId,
      user_id: p.userId,
      key: null,
      name: p.name,
      image: null,
      active: true,
      position: p.position,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("templates")
      .update({ name: p.name })
      .eq("id", p.templateId);
    if (error) throw new Error(error.message);
  }

  // Uebungsliste sauber ersetzen (Loeschen + Neu-Einfuegen). Unbedenklich, da
  // template_exercises nur das Rezept ist und der Verlauf beim Start kopiert.
  const del = await supabase
    .from("template_exercises")
    .delete()
    .eq("template_id", p.templateId);
  if (del.error) throw new Error(del.error.message);

  if (p.exercises.length > 0) {
    const rows = p.exercises.map((e) => ({
      id: e.id,
      user_id: p.userId,
      template_id: p.templateId,
      exercise_id: e.exercise_id,
      position: e.position,
    }));
    const ins = await supabase.from("template_exercises").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
}

async function writeSetActive(p: WorkoutActivePayload): Promise<void> {
  const { error } = await supabase
    .from("templates")
    .update({ active: p.active })
    .eq("id", p.templateId);
  if (error) throw new Error(error.message);
}

async function writeTemplateAction(p: TemplateActionPayload): Promise<void> {
  if (p.kind === "save") await writeSave(p);
  else await writeSetActive(p);
}

/** Default-mutationFn + Auffrischung registrieren. Greift auch fuer nach einem
 *  Neustart fortgesetzte (pausierte) Mutationen, da onSuccess hier haengt. */
export function registerTemplateMutation(qc: QueryClient): void {
  qc.setMutationDefaults(TEMPLATE_MUTATION_KEY, {
    mutationFn: (vars: unknown) =>
      writeTemplateAction(vars as TemplateActionPayload),
    onSuccess: () => {
      // Prefix-Match trifft ["templates", userId].
      void qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
