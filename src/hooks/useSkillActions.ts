import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/format";
import { useUserId } from "./useUserId";
import type { SkillProgressRow, SkillLog } from "@/schemas";

// Manuelle Eingriffe der Skills-Seite in den Fortschritt: Phase zurueck und
// Zuruecksetzen. Beide setzen den Konsekutiv-Zaehler auf 0 und heben
// "gemeistert" auf. Jeder Skill ist immer aktiv (kein Aktiv-Schalter mehr); die
// Fortschritts-Zeile wird bei der ersten abgeschlossenen Skill-Einheit angelegt
// (useFinishSkill). Das automatische Fortschreiben nach einer Session kommt aus
// der Live-Session. Jede Aktion laedt Fortschritt + Uebersicht neu.
export function useSkillActions(): {
  regress: (skillId: string) => Promise<void>;
  reset: (skillId: string) => Promise<void>;
  isBusy: boolean;
  error: unknown;
} {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["skillProgress", userId] });
    void queryClient.invalidateQueries({
      queryKey: ["trainingOverview", userId],
    });
  };

  // Bestehenden Fortschritt lesen (oder null, wenn noch keiner existiert).
  async function loadProgress(
    skillId: string,
  ): Promise<SkillProgressRow | null> {
    const { data, error } = await supabase
      .from("skill_progress")
      .select("*")
      .eq("skill_id", skillId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as SkillProgressRow | null) ?? null;
  }

  function appendLog(prog: SkillProgressRow | null, entry: object): SkillLog {
    const prev = (prog?.log ?? []) as SkillLog;
    return [...prev, { date: todayISO(), ...entry }];
  }

  const regressM = useMutation({
    mutationFn: async (skillId: string): Promise<void> => {
      const prog = await loadProgress(skillId);
      if (!prog) return;
      const to = Math.max(0, prog.current_phase - 1);
      const log = appendLog(prog, {
        type: "regress",
        from: prog.current_phase,
        to,
      });
      const { error } = await supabase
        .from("skill_progress")
        .update({
          current_phase: to,
          counter: 0,
          mastered: false,
          log,
        })
        .eq("id", prog.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const resetM = useMutation({
    mutationFn: async (skillId: string): Promise<void> => {
      const prog = await loadProgress(skillId);
      if (!prog) return;
      const log = appendLog(prog, { type: "reset", from: prog.current_phase });
      const { error } = await supabase
        .from("skill_progress")
        .update({
          current_phase: 0,
          counter: 0,
          mastered: false,
          log,
        })
        .eq("id", prog.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  return {
    regress: (id) => regressM.mutateAsync(id),
    reset: (id) => resetM.mutateAsync(id),
    isBusy: regressM.isPending || resetM.isPending,
    error: regressM.error ?? resetM.error,
  };
}
