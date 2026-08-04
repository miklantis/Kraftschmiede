import { useMemo, useState } from "react";
import { Section } from "@/components/ui/section";
import { BodyMeasureCard } from "./BodyMeasureCard";
import { MetricMilestonesSection } from "./MetricMilestonesSection";
import { useCompositionMilestones } from "@/hooks/useCompositionMilestones";
import { fmtWeight } from "@/lib/format";
import {
  BODY_METRIC,
  bodyMetricSeries,
  type BodyMetric,
} from "@/lib/composition";
import type { CompositionRow } from "@/schemas";

// Bindeglied der Messungs-Spalte: haelt die gewaehlte Mess-Metrik, damit die
// Mess-Karte (Chart) und der Meilenstein-Abschnitt derselben Metrik folgen –
// so wie bei den Uebungen Chart und Meilensteine dieselbe Uebung teilen.
// Reicht die Ziel-Linien der aktiven Metrik in den Chart und steuert den
// „Ziele“-Umschalter. Reine Richtwerte: kein Erreicht-Zustand.
export function BodyMeasurePanel({
  rows,
}: {
  rows: CompositionRow[];
}): React.ReactElement {
  const [metric, setMetric] = useState<BodyMetric>("weight");
  const [showGoals, setShowGoals] = useState(false);

  const allMilestones = useCompositionMilestones().data ?? [];
  const forMetric = useMemo(
    () => allMilestones.filter((m) => m.metric === metric),
    [allMilestones, metric],
  );

  const def = BODY_METRIC[metric];
  const series = bodyMetricSeries(rows, metric);
  const current = series.vals.length ? series.vals[series.vals.length - 1] : null;

  const goalsAvailable = forMetric.length > 0 && series.vals.length > 0;
  const goalsOn = goalsAvailable && showGoals;

  const milestoneLines = useMemo(
    () =>
      goalsOn
        ? forMetric.map((m) => ({
            value: m.target,
            label: m.name + " · " + fmtWeight(m.target, def.unit),
          }))
        : undefined,
    [goalsOn, forMetric, def.unit],
  );

  return (
    <>
      <Section eyebrow="Körpermessung">
        <BodyMeasureCard
          rows={rows}
          metric={metric}
          onMetricChange={setMetric}
          milestoneLines={milestoneLines}
          goalsAvailable={goalsAvailable}
          goalsOn={goalsOn}
          onToggleGoals={() => setShowGoals((v) => !v)}
        />
      </Section>

      {rows.length > 0 && (
        <MetricMilestonesSection
          metric={metric}
          metricLabel={def.label}
          unit={def.unit}
          current={current}
          milestones={forMetric}
        />
      )}
    </>
  );
}
