// Kraft-Einheit beenden: registrierter Mutations-Default, damit ein ohne Netz
// pausierter Speichervorgang den App-Neustart uebersteht und nach dem
// Wiederherstellen automatisch nachgeschickt wird (resumePausedMutations in
// main.tsx). Der Default wird beim Erzeugen des Query-Clients registriert, also
// bevor die Wiederherstellung laeuft – Kennung (FINISH_MUTATION_KEY) und
// Reihenfolge bleiben dafuer stabil.
//
// Das eigentliche Schreiben liegt im gemeinsamen Schreib-Baustein
// (historyWrite.writeFinishStrength) ueber der Naht HistoryStore; hier bleibt
// nur das Verdrahten von Default-mutationFn und Auffrischung.

import type { QueryClient } from "@tanstack/react-query";
import type {
  SessionInsert,
  SessionExerciseInsert,
  SetInsert,
} from "@/schemas";
import { supabaseHistoryStore } from "./historyStore";
import { writeFinishStrength } from "./historyWrite";
import { INVALIDATE, invalidateGroup } from "./queryKeys";

export const FINISH_MUTATION_KEY = ["finishSession"] as const;

/** Fertig berechnetes Schreib-Paket (alle IDs schon vergeben). Wird als
 *  Mutations-Variable uebergeben, damit die Mutation auch nach einem Neustart
 *  ohne den urspruenglichen React-Zustand allein laufen kann. */
export interface FinishPayload {
  sessionRow: SessionInsert & { id: string };
  exerciseRows: Array<SessionExerciseInsert & { id: string }>;
  setRows: Array<SetInsert & { id: string }>;
  exercisePatches: ExercisePatch[];
  /** Gesetzt, wenn diese Einheit die Journey abschliesst: sie wird im selben
   *  Schreibvorgang archiviert (wichtig fuer offline pausierte Speicherungen). */
  journeyArchive?: { journeyId: string; endDate: string };
}

export interface ExercisePatch {
  id: string;
  work_weight: number;
  rm?: number;
  rm_as_of?: string;
  rm_stale?: boolean;
  /** Anker einer Phase mit Wochenplan samt Phasenbindung (nur gesetzt, wenn der
   *  Plan diese Uebung gesteuert hat). */
  reference_weight?: number;
  reference_phase_id?: string;
  /** Startgewicht X der Phase – nur beim Eintritt der Uebung in die Phase. */
  plan_start_weight?: number;
}

/** Default-mutationFn + Auffrischung registrieren. Greift auch fuer nach einem
 *  Neustart fortgesetzte (pausierte) Mutationen, da die onSuccess hier haengt. */
export function registerFinishMutation(qc: QueryClient): void {
  qc.setMutationDefaults(FINISH_MUTATION_KEY, {
    mutationFn: (vars: unknown) =>
      writeFinishStrength(supabaseHistoryStore, vars as FinishPayload),
    onSuccess: () => {
      invalidateGroup(qc, INVALIDATE.finishStrength);
    },
  });
}
