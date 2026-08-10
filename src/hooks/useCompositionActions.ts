import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { INVALIDATE, invalidateGroup } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";

// Schreibzugriffe auf die Koerpermessungen (composition), gebuendelt in einem
// Hook mit gemeinsamem Lade-/Fehlerzustand. Ersetzt den frueheren JSON-Import:
// jede Messung wird einzeln von Hand gepflegt.
//
// Wichtig zum Ueberschreib-Verhalten: Beim Bearbeiten wird der Eintrag mit
// seinen Ist-Werten vorbefuellt; was im Feld steht, wird gespeichert, ein leer
// geraeumtes Feld entfernt den Wert bewusst (null). Es gilt weiterhin ein
// Eintrag pro Tag (unique user_id,date) – ein bereits belegtes Datum wird beim
// Anlegen nicht still ueberschrieben, das prueft die UI vorab.
//
// Die Felder decken die composition-Spalten ab (alle optional ausser Datum),
// inkl. der Wasserwerte ecw_kg/icw_kg.

export interface CompositionFelder {
  date: string;
  weight: number | null;
  body_fat_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  muscle_mass_kg: number | null;
  tbw_kg: number | null;
  ecw_kg: number | null;
  icw_kg: number | null;
  phase_angle: number | null;
  visceral_fat: number | null;
  bmr_kcal: number | null;
}

type CompositionAction =
  | { type: "add"; felder: CompositionFelder }
  | { type: "update"; id: string; felder: CompositionFelder }
  | { type: "delete"; id: string };

// Nur die Werte-Spalten (ohne date) – fuer Insert/Update gemeinsam genutzt.
function werteVon(felder: CompositionFelder): Omit<CompositionFelder, "date"> {
  const { date: _date, ...werte } = felder;
  void _date;
  return werte;
}

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
    mutationFn: async (action: CompositionAction): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");

      if (action.type === "add") {
        const { error } = await supabase.from("composition").insert({
          user_id: userId,
          date: action.felder.date,
          ...werteVon(action.felder),
        });
        if (error) throw new Error(error.message);
        return;
      }

      if (action.type === "update") {
        const { error } = await supabase
          .from("composition")
          .update({
            date: action.felder.date,
            ...werteVon(action.felder),
          })
          .eq("id", action.id);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase
        .from("composition")
        .delete()
        .eq("id", action.id);
      if (error) throw new Error(error.message);
    },
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
