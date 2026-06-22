import { Lock } from "lucide-react";
import type { SkillPhaseView } from "@/hooks/useSkillsView";

// Phasen eines Skills als kompakte Liste: Nummer, Label, Ziel; die aktuelle
// Phase ist akzent-getoent mit "Du bist hier", erledigte gedimmt, kuenftige
// blass. Ein Schloss-Symbol markiert Phasen, deren Equipment fehlt. Optik aus
// V1 angelehnt an die Journey-Phasen.
export function SkillPhaseList({
  phases,
}: {
  phases: SkillPhaseView[];
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      {phases.map((p, i) => (
        <div
          key={i}
          className={
            "flex items-start gap-3 rounded-[12px] px-3 py-2.5 " +
            (p.isCurrent
              ? "bg-primary/10"
              : p.state === "done"
                ? "bg-secondary"
                : "bg-white/60")
          }
        >
          <span
            className={
              "mt-px flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full font-mono text-[12px] font-semibold " +
              (p.isCurrent
                ? "bg-primary text-primary-foreground"
                : p.state === "done"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-[#a0a0a5]")
            }
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={
                  "text-[14px] font-semibold " +
                  (p.state === "future"
                    ? "text-[#a0a0a5]"
                    : "text-foreground")
                }
              >
                {p.label}
              </span>
              {p.equipmentMissing && (
                <Lock size={13} className="flex-none text-[#a0a0a5]" />
              )}
              {p.isCurrent && (
                <span className="flex-none rounded-pill bg-primary/15 px-2 py-px text-[10px] font-semibold text-primary">
                  Du bist hier
                </span>
              )}
            </div>
            {p.goal !== "" && (
              <div className="mt-px font-mono text-[12px] text-muted-foreground">
                {p.goal}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
