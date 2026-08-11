import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { RmTestRow } from "@/schemas";

// Juengste zuerst (Datum, dann Anlage) – fuer beide Abfragen dieselbe Ordnung.
const NEUESTE_ZUERST = [
  { spalte: "date", absteigend: true },
  { spalte: "created_at", absteigend: true },
];

// 1RM-Tests einer Uebung. RLS scope't auf den Nutzer; der Query-Key traegt
// user_id und exercise_id, damit je Uebung getrennt gecached wird und beim
// Kontowechsel nichts gemischt wird.
export function useRmTests(exerciseId: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.rmTests(userId, exerciseId),
    enabled: userId !== null && exerciseId !== "",
    queryFn: (): Promise<RmTestRow[]> =>
      leseZeilen<RmTestRow>({
        tabelle: "rm_tests",
        gleich: { exercise_id: exerciseId },
        sortierung: NEUESTE_ZUERST,
      }),
  });
}

/** Alle 1RM-Tests des Nutzers (fuer Verlauf und Kalender), juengste zuerst. */
export function useAllRmTests() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.rmTestsAll(userId),
    enabled: userId !== null,
    queryFn: (): Promise<RmTestRow[]> =>
      leseZeilen<RmTestRow>({
        tabelle: "rm_tests",
        sortierung: NEUESTE_ZUERST,
      }),
  });
}
