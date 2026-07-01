import { QueryClient } from "@tanstack/react-query";
import { registerFinishMutation } from "./finishMutation";
import { registerFinishSkillMutation } from "./finishSkillMutation";
import { registerEditMutation } from "./editMutation";
import { registerTemplateMutation } from "./templateActions";

// Wie lange ein nicht mehr aktiv genutzter Eintrag im Speicher gehalten wird.
// Muss mindestens so lang sein wie die Lebensdauer des gespeicherten Caches
// (siehe offline.ts), damit Daten einen App-Neustart ohne Netz ueberstehen.
const GC_ZEIT_MS = 1000 * 60 * 60 * 24 * 7; // 7 Tage

// Wie lange frisch geladene Daten als aktuell gelten, bevor im Hintergrund
// neu geladen wird (sobald wieder Netz da ist). Je Entitaet spaeter ueberschreibbar.
const FRISCHE_MS = 1000 * 30; // 30 Sekunden

// Zentraler Query-Client fuer den gesamten Datenzugriff (TanStack Query).
// Die Datenzugriffe je Entitaet (useSessions, useExercises ...) bauen darauf auf.
// Mutationen werden bei fehlendem Netz automatisch pausiert (networkMode-Default
// "online") und nach Reconnect bzw. nach App-Neustart fortgesetzt.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: GC_ZEIT_MS,
      staleTime: FRISCHE_MS,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Beenden-Schreibvorgang als Mutations-Default registrieren (offline-pausierbar,
// ueberlebt Neustart). Muss vor resumePausedMutations stehen - daher hier.
registerFinishMutation(queryClient);
registerFinishSkillMutation(queryClient);
registerEditMutation(queryClient);
// Workout-Aktionen (Speichern/Archivieren/Reaktivieren). Bewusst nach den
// bestehenden und vor einer kuenftigen Journey-Zuordnung (Lieferung 4), damit
// ein offline neu angelegtes Workout vor seiner Zuordnung nachgereicht wird.
registerTemplateMutation(queryClient);
