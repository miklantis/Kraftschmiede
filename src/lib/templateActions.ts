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
//
// Diese Datei traegt nur noch Kennung, Registrierung und Auffrischung. Die
// Abfolge des Schreibens liegt in lib/journeyWrite.ts, die Datenbank-Handgriffe
// hinter der Naht lib/journeyStore.ts.

import type { QueryClient } from "@tanstack/react-query";
import { supabaseJourneyStore } from "./journeyStore";
import { writeVorlageAction } from "./journeyWrite";
import { INVALIDATE, invalidateGroup } from "./queryKeys";

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

// Das gespeicherte Paket (kind) auf die Absicht der Naht (type) bringen. Die
// Feldnamen des Pakets bleiben Zeichen fuer Zeichen gleich: pausierte Mutationen
// aus einer aelteren Sitzung werden nach dem Neustart genau so wieder
// eingespielt (ADR-0001/ADR-0009). Die Abfolge des Speicherns (Kopf, dann
// Uebungsliste ersetzen) liegt in lib/journeyWrite.ts.
async function writeTemplateAction(p: TemplateActionPayload): Promise<void> {
  await writeVorlageAction(
    supabaseJourneyStore,
    p.kind === "save"
      ? {
          type: "save",
          userId: p.userId,
          templateId: p.templateId,
          name: p.name,
          isNew: p.isNew,
          position: p.position,
          exercises: p.exercises,
        }
      : {
          type: "setActive",
          templateId: p.templateId,
          aktiv: p.active,
        },
  );
}

/** Default-mutationFn + Auffrischung registrieren. Greift auch fuer nach einem
 *  Neustart fortgesetzte (pausierte) Mutationen, da onSuccess hier haengt. */
export function registerTemplateMutation(qc: QueryClient): void {
  qc.setMutationDefaults(TEMPLATE_MUTATION_KEY, {
    mutationFn: (vars: unknown) =>
      writeTemplateAction(vars as TemplateActionPayload),
    onSuccess: () => {
      // Prefix-Match trifft ["templates", userId].
      invalidateGroup(qc, INVALIDATE.templates);
    },
  });
}
