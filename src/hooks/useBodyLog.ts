import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { BodyLogRow } from "@/schemas";

// Alle Befinden-Eintraege (Muskelkater/Readiness/Schmerz) des Nutzers, neueste
// zuerst. Speist Rest-Empfehlung, Kater-Figur und Verlaufsliste auf der
// Koerper-Seite. Der heutige Eintrag und der letzte werden in der View daraus
// abgeleitet.
export function useBodyLog() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.bodyLog(userId),
    enabled: userId !== null,
    queryFn: (): Promise<BodyLogRow[]> =>
      leseZeilen<BodyLogRow>({
        tabelle: "body_log",
        sortierung: [{ spalte: "date", absteigend: true }],
      }),
  });
}
