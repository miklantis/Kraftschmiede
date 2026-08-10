import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { todayISO } from "@/lib/format";
import { supabaseJourneyStore } from "@/lib/journeyStore";
import {
  readJourneyZuordnungen,
  writeJourneyRename,
  writeJourneyStart,
  writeJourneyZuordnungUebernahme,
} from "@/lib/journeyWrite";
import { useUserId } from "./useUserId";
import type { JourneyTemplateWithPhases } from "./useJourneyTemplates";

// Schreibaktionen der Journey-Seite. Der Hook traegt nur noch Absicht und
// Auffrischung; die Datenbank-Handgriffe liegen hinter der Naht
// (lib/journeyStore.ts), die Abfolge in lib/journeyWrite.ts.
//
// Anlegen kopiert die Vorlagenphasen in eine neue, aktive Journey und
// deaktiviert die bisherige (Invariante: genau eine aktive Journey – als
// Partial Unique Index in der DB, ADR-0004). Umbenennen aendert nur den Namen.
// Beide laden danach die aktive Journey neu, damit Seite und
// Trainings-Uebersicht sofort stimmen.
export function useJourneyActions(): {
  createFromTemplate: (
    template: JourneyTemplateWithPhases,
  ) => Promise<{ newJourneyId: string; previousJourneyId: string | null }>;
  readAssignments: (journeyId: string) => Promise<string[]>;
  copyAssignments: (
    newJourneyId: string,
    templateIds: string[],
  ) => Promise<void>;
  rename: (journeyId: string, name: string) => Promise<void>;
  isCreating: boolean;
  isRenaming: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  // Die abgeloeste Journey landet im Archiv – die Gruppe frischt beides auf.
  const invalidate = (): void => {
    invalidateGroup(queryClient, INVALIDATE.journeyChange);
  };

  const create = useMutation({
    mutationFn: (
      template: JourneyTemplateWithPhases,
    ): Promise<{ newJourneyId: string; previousJourneyId: string | null }> =>
      writeJourneyStart(supabaseJourneyStore, userId, template, todayISO()),
    onSuccess: invalidate,
  });

  // Zugewiesene Workout-Ids einer Journey lesen (fuer das Uebernahme-Angebot).
  const readAssignments = (journeyId: string): Promise<string[]> =>
    readJourneyZuordnungen(supabaseJourneyStore, journeyId);

  // Zuweisungen in die neue Journey kopieren (Uebernahme beim Wechsel).
  const copyAssignments = async (
    newJourneyId: string,
    templateIds: string[],
  ): Promise<void> => {
    await writeJourneyZuordnungUebernahme(
      supabaseJourneyStore,
      userId,
      newJourneyId,
      templateIds,
      () => crypto.randomUUID(),
    );
    if (templateIds.length === 0) return;
    invalidateGroup(queryClient, INVALIDATE.journeyWorkouts);
  };

  const renameM = useMutation({
    mutationFn: (vars: { journeyId: string; name: string }): Promise<void> =>
      writeJourneyRename(supabaseJourneyStore, vars.journeyId, vars.name),
    onSuccess: invalidate,
  });

  return {
    createFromTemplate: (t) => create.mutateAsync(t),
    readAssignments,
    copyAssignments,
    rename: (journeyId, name) => renameM.mutateAsync({ journeyId, name }),
    isCreating: create.isPending,
    isRenaming: renameM.isPending,
    error: create.error ?? renameM.error,
  };
}
