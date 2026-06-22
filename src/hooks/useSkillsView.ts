import { useSkills, useSkillProgress } from "./useSkills";
import { useEquipment } from "./useInventory";
import { skillAdvice } from "@/engine";
import { skillMetricUnit } from "@/lib/labels";
import type { SkillDefAssembled } from "./useSkills";
import type { SkillProgressRow } from "@/schemas";

export interface SkillPhaseView {
  label: string;
  goal: string; // z. B. "3 × 8 Wdh." oder "3 × 30 Sek. · 3 × 5 Wdh."
  state: "done" | "current" | "future";
  isCurrent: boolean;
  equipmentMissing: boolean;
}

export interface MySkillView {
  skillId: string;
  name: string;
  phaseLabel: string;
  phaseIndex: number;
  phaseCount: number;
  counterText: string;
  mastered: boolean;
  startable: boolean;
  missingEquipment: string[]; // Labels der fehlenden Geraete
  canRegress: boolean;
  canReset: boolean;
  phases: SkillPhaseView[];
}

export interface CatalogSkillView {
  skillId: string;
  name: string;
  phaseCount: number;
  phaseLabels: string[];
  active: boolean;
}

export interface SkillsView {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  catalog: CatalogSkillView[];
  mine: MySkillView[];
}

function phaseGoal(
  exercises: SkillDefAssembled["phases"][number]["exercises"],
): string {
  return exercises
    .map((e) => `${e.sets} × ${e.target} ${skillMetricUnit(e.metric)}`.trim())
    .join(" · ");
}

// Fuehrt Definitionen, Fortschritt und Equipment zu fertigen Anzeige-Modellen
// zusammen. Die Engine (skillAdvice) liefert aktuelle Phase, Aufstiegsstand und
// das Equipment-Tor; hier wird nur in Strings/Flags fuer die Oberflaeche uebersetzt.
export function useSkillsView(): SkillsView {
  const skillsQ = useSkills();
  const progressQ = useSkillProgress();
  const equipmentQ = useEquipment();

  const isLoading =
    skillsQ.isLoading || progressQ.isLoading || equipmentQ.isLoading;
  const isError = skillsQ.isError || progressQ.isError || equipmentQ.isError;
  const error = skillsQ.error ?? progressQ.error ?? equipmentQ.error;

  const skills = skillsQ.data ?? [];
  const progress = progressQ.data ?? [];
  const equipment = equipmentQ.data ?? [];

  const progById = new Map<string, SkillProgressRow>();
  for (const p of progress) progById.set(p.skill_id, p);

  const ownedSet = new Set(equipment.filter((e) => e.active).map((e) => e.key));
  const labelByKey = new Map(equipment.map((e) => [e.key, e.label] as const));

  const catalog: CatalogSkillView[] = skills.map((s) => ({
    skillId: s.id,
    name: s.name,
    phaseCount: s.phases.length,
    phaseLabels: s.phases.map((p) => p.label),
    active: progById.get(s.id)?.active === true,
  }));

  const mine: MySkillView[] = skills
    .filter((s) => progById.get(s.id)?.active === true)
    .map((s) => {
      const prog = progById.get(s.id);
      const adv = skillAdvice(
        { phases: s.phases },
        prog
          ? {
              currentPhase: prog.current_phase,
              consecutiveCount: prog.counter,
              mastered: prog.mastered,
            }
          : undefined,
        Array.from(ownedSet),
      );
      const idx = adv.phaseIndex;
      const need = s.phases[idx]?.consecutiveSessions ?? 0;
      const counter = prog?.counter ?? 0;
      const counterText = adv.mastered
        ? "Gemeistert · Erhaltung"
        : `${counter} von ${need} sauberen Sessions`;

      const phases: SkillPhaseView[] = s.phases.map((p, i) => ({
        label: p.label,
        goal: phaseGoal(p.exercises),
        state: i < idx ? "done" : i === idx ? "current" : "future",
        isCurrent: i === idx,
        equipmentMissing: p.equipment.some((k) => !ownedSet.has(k)),
      }));

      return {
        skillId: s.id,
        name: s.name,
        phaseLabel: s.phases[idx]?.label ?? "",
        phaseIndex: idx,
        phaseCount: s.phases.length,
        counterText,
        mastered: adv.mastered,
        startable: !adv.equipmentMissing,
        missingEquipment: adv.missingEquipment.map(
          (k) => labelByKey.get(k) ?? k,
        ),
        canRegress: idx > 0 || adv.mastered,
        canReset: idx > 0 || counter > 0 || adv.mastered,
        phases,
      };
    });

  return { isLoading, isError, error, catalog, mine };
}
