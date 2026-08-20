import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { JourneyExerciseChart } from "./JourneyExerciseChart";
import { CoachBlock } from "@/components/exercise/CoachBlock";
import type { JourneyExerciseChart as JourneyChartData } from "@/lib/journeyExercises";
import type { JourneyStat } from "@/lib/journeyStats";
import type { CoachView } from "@/lib/coach";
import type { JourneySeriesKey } from "@/lib/journeyChart";

// Kachel einer Uebung im Abschnitt "Uebungen in dieser Journey": oben der Name
// (antippbar zur Detailseite), links der Verlauf dieser Uebung in dieser
// Journey, rechts der Coach-Block – links wo die Uebung herkommt, rechts wo sie
// gerade steht. Volle Breite, einspaltig; auf dem Desktop zwei Drittel Chart /
// ein Drittel Coach, mobil Chart oben und Coach darunter.
//
// Der Coach-Block ist derselbe wie auf der Uebungs-Detailseite (CoachBlock),
// nur ohne "Anpassen"-Knopf: die Journey-Seite ist Anzeige. Seine
// Statistikzeile rechnet auf die Journey (bestes Set in dieser Journey,
// Veraenderung seit Journey-Start, Einheiten in dieser Journey).
export function JourneyExerciseTile({
  name,
  chart,
  stats,
  coach,
  activeKeys,
  unit,
  onOpen,
}: {
  name: string;
  chart: JourneyChartData;
  stats: readonly JourneyStat[];
  coach: CoachView | null;
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
        <CoachBlock
          coach={coach}
          stats={stats}
          unit={unit}
          className="border-t border-border pt-3 min-[960px]:border-t-0 min-[960px]:pt-1"
        />
      </div>
    </div>
  );
}
