import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/format";
import { useUserId } from "./useUserId";
import type { JourneyInsert, PhaseInsert } from "@/schemas";
import type { JourneyTemplateWithPhases } from "./useJourneyTemplates";

// Schreibaktionen der Journey-Seite. Anlegen kopiert die Vorlagenphasen in eine
// neue, aktive Journey und deaktiviert die bisherige (Invariante: genau eine
// aktive Journey – als Partial Unique Index in der DB). Umbenennen aendert nur
// den Namen. Beide laden danach die aktive Journey neu, damit Seite und
// Trainings-Uebersicht sofort stimmen.
export function useJourneyActions(): {
  createFromTemplate: (
    template: JourneyTemplateWithPhases,
  ) => Promise<{ newJourneyId: string; previousJourneyId: string | null }>;
  readAssignments: (journeyId: string) => Promise<string[]>;
  copyAssignments: (
    newJourneyId: string,
    templateIds: string[],
  ) => Promise<void>;
  rename: (journeyId: string, name: string) => Promise<void>;
  isCreating: boolean;
  isRenaming: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["activeJourney", userId] });
  };

  const create = useMutation({
    mutationFn: async (
      template: JourneyTemplateWithPhases,
    ): Promise<{ newJourneyId: string; previousJourneyId: string | null }> => {
      if (userId === null) throw new Error("Nicht angemeldet.");

      // Bisherige aktive Journey zuerst deaktivieren, damit der Unique-Index
      // beim Einfuegen der neuen aktiven Journey nicht verletzt wird. Ihre Id
      // merken wir uns fuer das Uebernahme-Angebot (Lieferung 4b); ihre
      // journey_workouts bleiben erhalten (nur active=false).
      let previousJourneyId: string | null = null;
      const { data: current, error: curErr } = await supabase
        .from("journeys")
        .select("id")
        .eq("active", true)
        .maybeSingle();
      if (curErr) throw new Error(curErr.message);
      if (current) {
        previousJourneyId = (current as { id: string }).id;
        const { error: deErr } = await supabase
          .from("journeys")
          .update({ active: false })
          .eq("id", previousJourneyId);
        if (deErr) throw new Error(deErr.message);
      }

      const insert: JourneyInsert = {
        user_id: userId,
        name: template.name,
        active: true,
        status: "active",
        source_template_id: template.id,
        start_date: todayISO(),
      };
      const { data: created, error: insErr } = await supabase
        .from("journeys")
        .insert(insert)
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      const journeyId = (created as { id: string }).id;

      const phaseRows: PhaseInsert[] = template.phases.map((p, i) => ({
        user_id: userId,
        journey_id: journeyId,
        name: p.name,
        focus: p.focus,
        weeks: p.weeks,
        sets_start: p.sets_start,
        sets_end: p.sets_end,
        deload_week: p.deload_week,
        rep_target_min: p.rep_target_min,
        rep_target_max: p.rep_target_max,
        position: i,
      }));
      const { error: phErr } = await supabase.from("phases").insert(phaseRows);
      if (phErr) throw new Error(phErr.message);

      return { newJourneyId: journeyId, previousJourneyId };
    },
    onSuccess: invalidate,
  });

  // Zugewiesene Workout-Ids einer Journey lesen (fuer das Uebernahme-Angebot).
  const readAssignments = async (journeyId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("journey_workouts")
      .select("template_id")
      .eq("journey_id", journeyId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ template_id: string }>).map(
      (r) => r.template_id,
    );
  };

  // Zuweisungen in die neue Journey kopieren (Uebernahme beim Wechsel). Nur die
  // uebergebenen (bereits auf zuweisbar gefilterten) Workouts; IDs clientseitig.
  const copyAssignments = async (
    newJourneyId: string,
    templateIds: string[],
  ): Promise<void> => {
    if (userId === null) throw new Error("Nicht angemeldet.");
    if (templateIds.length === 0) return;
    const rows = templateIds.map((templateId) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      journey_id: newJourneyId,
      template_id: templateId,
    }));
    const { error } = await supabase.from("journey_workouts").insert(rows);
    if (error) throw new Error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["journeyWorkouts"] });
  };

  const renameM = useMutation({
    mutationFn: async (vars: {
      journeyId: string;
      name: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from("journeys")
        .update({ name: vars.name })
        .eq("id", vars.journeyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return {
    createFromTemplate: (t) => create.mutateAsync(t),
    readAssignments,
    copyAssignments,
    rename: (journeyId, name) => renameM.mutateAsync({ journeyId, name }),
    isCreating: create.isPending,
    isRenaming: renameM.isPending,
    error: create.error ?? renameM.error,
  };
}
