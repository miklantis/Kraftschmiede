// Bearbeitete Einheit zurueckschreiben: registrierter Mutations-Default analog
// zu finishMutation.ts, damit eine ohne Netz pausierte Korrektur den
// App-Neustart uebersteht und automatisch nachgeschickt wird
// (resumePausedMutations in main.tsx). Kennung (EDIT_MUTATION_KEY) und
// Registrier-Reihenfolge bleiben dafuer stabil.
//
// Das eigentliche Schreiben liegt im gemeinsamen Schreib-Baustein
// (historyWrite.writeEditSession) ueber der Naht HistoryStore.

import type { QueryClient } from "@tanstack/react-query";
import type { EditPayload } from "./editSession";
import { supabaseHistoryStore } from "./historyStore";
import { writeEditSession, HISTORY_INVALIDATE } from "./historyWrite";

export const EDIT_MUTATION_KEY = ["editSession"] as const;

/** Default-mutationFn + Auffrischung registrieren. Greift auch fuer nach einem
 *  Neustart fortgesetzte (pausierte) Mutationen, da onSuccess hier haengt. */
export function registerEditMutation(qc: QueryClient): void {
  qc.setMutationDefaults(EDIT_MUTATION_KEY, {
    mutationFn: (vars: unknown) =>
      writeEditSession(supabaseHistoryStore, vars as EditPayload),
    onSuccess: () => {
      for (const key of HISTORY_INVALIDATE.edit) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
