import { useQuery } from "@tanstack/react-query";
import { leseZeilen } from "@/lib/tabelleLesen";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { PhaseTypeRow } from "@/schemas";

// Bausteine der Phasen (phase_types), nach position geordnet: Vorgabewerte und
// Grenzen je Phasentyp. Gelesen wird die Tabelle dort, wo eine Phase entsteht -
// nicht im Trainingsablauf. Engine und Coach lesen weiter die Phasenzeile, in
// die die Werte beim Anlegen kopiert werden.
export function usePhaseTypes() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.phaseTypes(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<PhaseTypeRow[]> =>
      leseZeilen<PhaseTypeRow>({
        tabelle: "phase_types",
        sortierung: [{ spalte: "position" }],
      }),
  });
}
