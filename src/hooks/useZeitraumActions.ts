import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useUserId } from "./useUserId";
import type { ZeitraumTyp } from "@/schemas";

// Schreibzugriffe auf die Zeitraeume, gebuendelt in einem Hook (gemeinsamer
// Lade-/Fehlerzustand). Nach Erfolg wird die Liste neu geladen. Der Marker ist
// reiner Timeline-Kontext, es haengt nichts weiter daran.

export interface ZeitraumFelder {
  typ: ZeitraumTyp;
  startDatum: string;
  endDatum: string | null;
  name: string | null;
  notiz: string | null;
}

type ZeitraumAction =
  | { type: "add"; felder: ZeitraumFelder }
  | { type: "update"; id: string; felder: ZeitraumFelder }
  | { type: "delete"; id: string };

export function useZeitraumActions(): {
  add: (felder: ZeitraumFelder) => Promise<void>;
  update: (id: string, felder: ZeitraumFelder) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isPending: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const mutation = useMutation({
    mutationFn: async (action: ZeitraumAction): Promise<void> => {
      if (userId === null) throw new Error("Nicht angemeldet.");

      if (action.type === "add") {
        const { error } = await supabase.from("zeitraeume").insert({
          user_id: userId,
          typ: action.felder.typ,
          start_datum: action.felder.startDatum,
          end_datum: action.felder.endDatum,
          name: action.felder.name,
          notiz: action.felder.notiz,
        });
        if (error) throw new Error(error.message);
        return;
      }

      if (action.type === "update") {
        const { error } = await supabase
          .from("zeitraeume")
          .update({
            typ: action.felder.typ,
            start_datum: action.felder.startDatum,
            end_datum: action.felder.endDatum,
            name: action.felder.name,
            notiz: action.felder.notiz,
          })
          .eq("id", action.id);
        if (error) throw new Error(error.message);
        return;
      }

      const { error } = await supabase
        .from("zeitraeume")
        .delete()
        .eq("id", action.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["zeitraeume"] });
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
