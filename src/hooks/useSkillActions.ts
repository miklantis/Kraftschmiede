import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseErfassungStore } from "@/lib/erfassungStore";
import { writeErfassungAction } from "@/lib/erfassungWrite";
import type { ErfassungAction } from "@/lib/erfassungWrite";
import { useUserId } from "./useUserId";
import { todayISO } from "@/lib/format";

// Manuelle Eingriffe der Skills-Seite in den Fortschritt: Phase zurueck und
// Zuruecksetzen. Beide setzen den Konsekutiv-Zaehler auf 0 und heben
// "gemeistert" auf. Jeder Skill ist immer aktiv (kein Aktiv-Schalter mehr); die
// Fortschritts-Zeile wird bei der ersten abgeschlossenen Skill-Einheit angelegt
// (useFinishSkill). Das automatische Fortschreiben nach einer Session kommt aus
// der Live-Session. Jede Aktion laedt Fortschritt + Uebersicht neu. Der Hook
// traegt nur noch Absicht und Auffrischung; die Datenbank-Handgriffe liegen
// hinter der Naht (lib/erfassungStore.ts), die Abfolge in lib/erfassungWrite.ts.
type SkillAction = Extract<
  ErfassungAction,
  { type: "skillRegress" | "skillReset" }
>;

export function useSkillActions(): {
  regress: (skillId: string) => Promise<void>;
  reset: (skillId: string) => Promise<void>;
  isBusy: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: SkillAction): Promise<void> =>
      writeErfassungAction(supabaseErfassungStore, userId, todayISO(), action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.skillProgress);
    },
  });

  return {
    regress: (skillId) =>
      mutation.mutateAsync({ type: "skillRegress", skillId }),
    reset: (skillId) => mutation.mutateAsync({ type: "skillReset", skillId }),
    isBusy: mutation.isPending,
    error: mutation.error,
  };
}
