import { useState } from "react";
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
// Verlaufslinie der gewaehlten Metrik. Bei gar keiner Messung ein Hinweis (der
// Import liegt direkt darunter). Standardmetrik Gewicht, wie V1.
export function BodyMeasureCard({
  rows,
}: {
  rows: CompositionRow[];
}): React.ReactElement {
  const [metric, setMetric] = useState<BodyMetric>("weight");

  if (!rows.length) {
    return (
      <div className="rounded-[18px] bg-card p-5 text-[14px] text-muted-foreground shadow-card">
        Noch keine Messung. Screenshots über den InBody-Skill in ein JSON wandeln
        und unten einspielen.
      </div>
    );
  }

  const series = bodyMetricSeries(rows, metric);

  return (
    <div className="rounded-[18px] bg-card p-[18px] shadow-card min-[960px]:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-semibold text-foreground">
          {BODY_METRIC[metric].label}
        </span>
        <span className="text-[12px] text-muted-foreground">InBody · Verlauf</span>
      </div>
      <ChipSwitch
        options={BODY_METRIC_OPTIONS}
        value={metric}
        onChange={setMetric}
        className="mb-2"
        ariaLabel="Messmetrik"
      />
      <BodyMetricChart vals={series.vals} unit={series.unit} pad={series.pad} />
    </div>
  );
}
