import { useMemo } from "react";
import { X } from "lucide-react";
import { ExerciseChart } from "./ExerciseChart";
import { useMilestones } from "@/hooks/useMilestones";
import { usePinnedGoals } from "@/hooks/usePinnedGoals";
import { usePinnedCharts } from "@/hooks/usePinnedCharts";
import { useRmTests } from "@/hooks/useRmTests";
import { fmtWeight } from "@/lib/format";
import { recordSeries } from "@/lib/exerciseHistory";
import type { PinnedCard } from "@/hooks/usePinnedView";

// Eine angeheftete Verlaufs-Kachel. Eigene Komponente, damit useMilestones je
// Kachel auf oberster Ebene laeuft. Kopfzeile: Titel links, rechts der optionale
// „Ziele"-Toggle und ganz aussen ein X, das die Anheftung sofort (ohne
// Rueckfrage) loest. Der „Ziele"-Toggle erscheint nur, wenn die
// Kachel-Metrik 1RM ist, die Uebung Meilensteine hat und Datenpunkte vorliegen
// (gleiches Verhalten wie auf der Detailseite). Der An/Aus-Zustand liegt
// geraete-lokal (usePinnedGoals) und ueberlebt Neuladen - wie die Anheftung.
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
  const tests = useRmTests(card.exerciseId).data ?? [];
  const rmTests = useMemo(
    () => tests.map((t) => ({ date: t.date, estRm: t.est_rm })),
    [tests],
  );
  const rmPoints = useMemo(
    () => recordSeries(card.history, rmTests, card.rm),
    [card.history, rmTests, card.rm],
  );
  const goalsAvailable =
    milestones.length > 0 && card.metric === "rm" && rmPoints.length > 0;

  const { has: goalShown, toggle: toggleGoal } = usePinnedGoals();
  const goalsOn = goalsAvailable && goalShown(card.exerciseId, card.metric);

  // Direktes Loesen der Anheftung ueber denselben Store wie die Detailseite:
  // toggle entfernt den vorhandenen Pin sofort (ohne Rueckfrage), Sync inklusive.
  const { toggle: togglePin } = usePinnedCharts();

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
        <div className="flex flex-none items-center gap-1.5">
          {goalsAvailable && (
            <button
              type="button"
              onClick={() => toggleGoal(card.exerciseId, card.metric)}
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
          <button
            type="button"
            aria-label={card.title + " – Anheftung entfernen"}
            onClick={() => togglePin(card.exerciseId, card.metric)}
            className="flex size-7 flex-none items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </div>
      </div>
      <ExerciseChart
        history={card.history}
        metric={card.metric}
        unit={unit}
        height={height}
        milestoneLines={milestoneLines}
        rmTests={card.metric === "rm" && rmTests.length > 0 ? rmTests : undefined}
        recordRm={card.rm}
      />
    </div>
  );
}
