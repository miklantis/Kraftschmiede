import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useUserId } from "./useUserId";
import type { JourneyTemplateRow, JourneyTemplatePhaseRow } from "@/schemas";

// Journey-Vorlage plus ihre Phasen, nach position geordnet.
export interface JourneyTemplateWithPhases extends JourneyTemplateRow {
  phases: JourneyTemplatePhaseRow[];
}

// Kuratierte Periodisierungs-Vorlagen (journey_templates) mit ihren Phasen. Eine
// verschachtelte Abfrage holt journey_template_phases mit; die Reihenfolge wird
// clientseitig nach position sortiert.
export function useJourneyTemplates() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.journeyTemplates(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<JourneyTemplateWithPhases[]> => {
      const { data, error } = await supabase
        .from("journey_templates")
        .select("*, journey_template_phases(*)")
        .order("position", { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<
        JourneyTemplateRow & {
          journey_template_phases: JourneyTemplatePhaseRow[];
        }
      >;
      return rows.map((row) => {
        const { journey_template_phases, ...template } = row;
        const phases = (journey_template_phases ?? [])
          .slice()
          .sort((a, b) => a.position - b.position);
        return { ...template, phases };
      });
    },
  });
}
