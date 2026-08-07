import { ChipSwitch } from "@/components/ui/chip-switch";
import { BodyMetricChart } from "./BodyMetricChart";
import {
  BODY_METRIC,
  BODY_METRIC_OPTIONS,
  bodyMetricSeries,
  type BodyMetric,
} from "@/lib/composition";
import type { CompositionRow } from "@/schemas";

// Mess-Karte: Metrik-Umschalter (Gewicht/Fett/Muskel/Wasser/Phasenwinkel) plus
// Verlaufslinie der gewaehlten Metrik. Bei gar keiner Messung ein Hinweis (die
// Mess-Liste zur Pflege von Hand liegt direkt darunter). Die gewaehlte Metrik
// haelt das umgebende Panel
// (damit der Meilenstein-Abschnitt derselben Metrik folgt); optional werden die
// Ziel-Linien der Metrik eingeblendet und ueber den „Ziele“-Umschalter gesteuert.
export function BodyMeasureCard({
  rows,
  metric,
  onMetricChange,
  milestoneLines,
  goalsAvailable,
  goalsOn,
  onToggleGoals,
}: {
  rows: CompositionRow[];
  metric: BodyMetric;
  onMetricChange: (m: BodyMetric) => void;
  milestoneLines?: readonly { value: number; label: string }[];
  goalsAvailable: boolean;
  goalsOn: boolean;
  onToggleGoals: () => void;
}): React.ReactElement {
  if (!rows.length) {
    return (
      <div className="rounded-[18px] bg-card p-5 text-[14px] text-muted-foreground shadow-card">
        Noch keine Messung. Trage deine erste unten in der Mess-Liste von Hand
        ein.
      </div>
    );
  }

  const series = bodyMetricSeries(rows, metric);

  return (
    <div className="rounded-[18px] bg-card p-[18px] shadow-card min-[960px]:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold text-foreground">
          {BODY_METRIC[metric].label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {goalsAvailable && (
            <button
              type="button"
              onClick={onToggleGoals}
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
          <span className="text-[12px] text-muted-foreground">
            InBody · Verlauf
          </span>
        </div>
      </div>
      <ChipSwitch
        options={BODY_METRIC_OPTIONS}
        value={metric}
        onChange={onMetricChange}
        className="mb-2"
        ariaLabel="Messmetrik"
      />
      <BodyMetricChart
        vals={series.vals}
        unit={series.unit}
        pad={series.pad}
        milestoneLines={milestoneLines}
      />
    </div>
  );
}
