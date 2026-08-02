import { useMemo, useState } from "react";
import { ExerciseChart } from "./ExerciseChart";
import { useMilestones } from "@/hooks/useMilestones";
import { fmtWeight } from "@/lib/format";
import { exLineSeries } from "@/lib/exerciseHistory";
import type { PinnedCard } from "@/hooks/usePinnedView";

// Eine angeheftete Verlaufs-Kachel. Eigene Komponente, damit useMilestones je
// Kachel auf oberster Ebene laeuft. Der „Ziele"-Toggle erscheint nur, wenn die
// Kachel-Metrik 1RM ist, die Uebung Meilensteine hat und Datenpunkte vorliegen
// (gleiches Verhalten wie auf der Detailseite). Zustand lokal, Standard aus.
export function PinnedChartTile({
  card,
  unit,
  height,
}: {
  card: PinnedCard;
  unit: string;
  height: number;
}): React.ReactElement {
  const milestones = useMilestones(card.exerciseId).data ?? [];
  const rmPoints = useMemo(() => exLineSeries(card.history, "rm"), [card.history]);
  const goalsAvailable =
    milestones.length > 0 && card.metric === "rm" && rmPoints.length > 0;

  const [showGoals, setShowGoals] = useState(false);
  const goalsOn = goalsAvailable && showGoals;

  const milestoneLines = useMemo(
    () =>
      goalsOn
        ? milestones.map((m) => ({
            value: m.target_rm,
            achieved: m.achieved_at != null,
            label: m.name + " · " + fmtWeight(m.target_rm, unit),
          }))
        : undefined,
    [goalsOn, milestones, unit],
  );

  return (
    <div className="rounded-[18px] bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold">{card.title}</span>
        {goalsAvailable && (
          <button
            type="button"
            onClick={() => setShowGoals((v) => !v)}
            aria-pressed={goalsOn}
            className={
              "shrink-0 rounded-[20px] px-[11px] py-[5px] text-[11px] font-semibold transition-colors " +
              (goalsOn
                ? "bg-primary/12 text-primary"
                : "bg-muted text-muted-foreground hover:brightness-95")
            }
          >
            Ziele
          </button>
        )}
      </div>
      <ExerciseChart
        history={card.history}
        metric={card.metric}
        unit={unit}
        height={height}
        milestoneLines={milestoneLines}
      />
    </div>
  );
}
