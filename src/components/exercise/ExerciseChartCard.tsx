import { useMemo, useState } from "react";
import { ChipSwitch } from "@/components/ui/chip-switch";
import { ExerciseChart } from "./ExerciseChart";
import { usePinnedCharts } from "@/hooks/usePinnedCharts";
import { useMilestones } from "@/hooks/useMilestones";
import { fmtWeight } from "@/lib/format";
import {
  EX_METRIC_TITLE,
  exLineSeries,
  type ExHistoryEntry,
  type ExMetric,
  type ExMetricOption,
} from "@/lib/exerciseHistory";

// Verlaufs-Chartkarte der Detailseite (V1 ub-cc): weisse Karte mit Titel
// (= Metrik-Bezeichnung) und dem Anheften-Umschalter im Kopf, darunter der
// Metrik-Umschalter (entfaellt bei nur einer Metrik) und der Chart. Welche
// Metrik aktiv ist, haelt die Karte lokal; Standard kommt vom Aufrufer.
// "Anheften" merkt sich die gerade gewaehlte Metrik geraete-lokal (usePinnedCharts).

export interface ExerciseChartCardProps {
  exerciseId: string;
  history: readonly ExHistoryEntry[];
  options: readonly ExMetricOption[];
  defaultMetric: ExMetric;
  unit: string;
}

export function ExerciseChartCard({
  exerciseId,
  history,
  options,
  defaultMetric,
  unit,
}: ExerciseChartCardProps): React.ReactElement {
  const [metric, setMetric] = useState<ExMetric>(defaultMetric);
  // Falls der Standard nicht in den Optionen liegt, auf die erste zurueckfallen.
  const active = options.some((o) => o.key === metric)
    ? metric
    : (options[0]?.key ?? defaultMetric);

  const { has, toggle } = usePinnedCharts();
  const pinned = has(exerciseId, active);

  // Ziel-Linien nur in der 1RM-Ansicht und nur wenn es Ziele und Datenpunkte
  // gibt. Der Toggle merkt sich seinen Zustand lokal (Standard aus).
  const milestones = useMilestones(exerciseId).data ?? [];
  const rmPoints = useMemo(() => exLineSeries(history, "rm"), [history]);
  const goalsAvailable =
    milestones.length > 0 && active === "rm" && rmPoints.length > 0;
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
    <div className="rounded-[18px] bg-card p-4 shadow-card min-[960px]:px-5 min-[960px]:py-[18px]">
      <div className="mb-1.5 flex items-center justify-between gap-3 min-[960px]:mb-2">
        <span className="text-[14px] font-semibold">
          {EX_METRIC_TITLE[active]}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {goalsAvailable && (
            <button
              type="button"
              onClick={() => setShowGoals((v) => !v)}
              aria-pressed={goalsOn}
              className={
                "rounded-[20px] px-[11px] py-[5px] text-[11px] font-semibold transition-colors " +
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
            onClick={() => toggle(exerciseId, active)}
            aria-pressed={pinned}
            className={
              "rounded-[20px] px-[11px] py-[5px] text-[11px] font-semibold transition-colors " +
              (pinned
                ? "bg-primary/12 text-primary"
                : "bg-muted text-muted-foreground hover:brightness-95")
            }
          >
            {pinned ? "Angeheftet" : "Anheften"}
          </button>
        </div>
      </div>
      {options.length > 1 && (
        <ChipSwitch
          options={options}
          value={active}
          onChange={setMetric}
          ariaLabel="Metrik"
          className="mb-2"
        />
      )}
      <ExerciseChart
        history={history}
        metric={active}
        unit={unit}
        milestoneLines={milestoneLines}
      />
    </div>
  );
}
