import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { supabaseCompositionStore } from "@/lib/compositionStore";
import { writeCompositionAction } from "@/lib/compositionWrite";
import type {
  CompositionAction,
  CompositionFelder,
} from "@/lib/compositionWrite";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die Koerpermessungen (composition), gebuendelt in einem
// Hook mit gemeinsamem Lade-/Fehlerzustand. Ersetzt den frueheren JSON-Import:
// jede Messung wird einzeln von Hand gepflegt. Der Hook traegt nur noch Absicht
// und Auffrischung; die Datenbank-Handgriffe liegen hinter der Naht
// (lib/compositionStore.ts), die Abfolge in lib/compositionWrite.ts.
//
// Wichtig zum Ueberschreib-Verhalten: Beim Bearbeiten wird der Eintrag mit
// seinen Ist-Werten vorbefuellt; was im Feld steht, wird gespeichert, ein leer
// geraeumtes Feld entfernt den Wert bewusst (null). Es gilt weiterhin ein
// Eintrag pro Tag (unique user_id,date) – ein bereits belegtes Datum wird beim
// Anlegen nicht still ueberschrieben, das prueft die UI vorab.

export type { CompositionFelder };

export function useCompositionActions(): {
  add: (felder: CompositionFelder) => Promise<void>;
  update: (id: string, felder: CompositionFelder) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: (action: CompositionAction): Promise<void> =>
      writeCompositionAction(supabaseCompositionStore, userId, action),
    onSuccess: () => {
      invalidateGroup(queryClient, INVALIDATE.composition);
    },
  });

  return {
    add: (felder) => mutation.mutateAsync({ type: "add", felder }),
    update: (id, felder) => mutation.mutateAsync({ type: "update", id, felder }),
    remove: (id) => mutation.mutateAsync({ type: "delete", id }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
