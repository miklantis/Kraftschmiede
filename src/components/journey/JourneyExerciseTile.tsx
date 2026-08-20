import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { JourneyExerciseChart } from "./JourneyExerciseChart";
import type { JourneyExerciseChart as JourneyChartData } from "@/lib/journeyExercises";
import type { JourneySeriesKey } from "@/lib/journeyChart";

// Kachel einer Uebung im Abschnitt "Uebungen in dieser Journey": oben der Name
// (antippbar zur Detailseite), darunter der Verlauf dieser Uebung in dieser
// Journey. Volle Breite, einspaltig; auf dem Desktop nimmt der Chart die linken
// zwei Drittel – das rechte Drittel bleibt in diesem Schritt leer und traegt
// spaeter den Coach-Block (#286).
export function JourneyExerciseTile({
  name,
  chart,
  activeKeys,
  unit,
  onOpen,
}: {
  name: string;
  chart: JourneyChartData;
  /** Eingeschaltete Serien (Schalterreihe im Abschnittskopf). */
  activeKeys: readonly JourneySeriesKey[];
  unit: string;
  onOpen: () => void;
}): React.ReactElement {
  // Stabile Referenz: der Chart zeichnet nur neu, wenn sich Daten oder
  // Schalterstand wirklich aendern - nicht bei jedem Rendern der Seite.
  const series = useMemo(
    () => chart.series.filter((s) => activeKeys.includes(s.key)),
    [chart.series, activeKeys],
  );

  return (
    <div className="overflow-hidden rounded-[18px] bg-card shadow-card">
      <button
        type="button"
        onClick={onOpen}
        aria-label={name + " öffnen"}
        className="flex w-full items-center gap-2 px-4 pt-3.5 pb-1 text-left transition-colors hover:bg-primary/5 min-[960px]:px-5"
      >
        <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-foreground min-[960px]:text-[15px]">
          {name}
        </span>
        <ChevronRight className="size-[18px] flex-none text-foreground-subtle" />
      </button>
      <div className="grid grid-cols-1 gap-y-2 px-4 pb-3 min-[960px]:grid-cols-[2fr_1fr] min-[960px]:gap-x-5 min-[960px]:px-5">
        <div className="min-w-0">
          <JourneyExerciseChart
            dates={chart.dates}
            series={series}
            marks={chart.marks}
            unit={unit}
          />
        </div>
        {/* Rechte Spalte: Coach-Block folgt in Schritt 3. */}
        <div className="min-w-0" />
      </div>
    </div>
  );
}
