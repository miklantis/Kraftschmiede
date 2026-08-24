import { useMemo } from "react";
import { JourneyExerciseChart } from "./JourneyExerciseChart";
import { CoachBlock } from "@/components/exercise/CoachBlock";
import type { JourneyExerciseChart as JourneyChartData } from "@/lib/journeyExercises";
import type { JourneyStat } from "@/lib/journeyStats";
import type { CoachView } from "@/lib/coach";
import type { JourneySeriesKey } from "@/lib/journeyChart";

// Kachel einer Uebung im Abschnitt "Uebungen in dieser Journey": oben der Name,
// links der Verlauf dieser Uebung in dieser Journey, rechts der Coach-Block –
// links wo die Uebung herkommt, rechts wo sie gerade steht. Volle Breite,
// einspaltig; auf dem Desktop zwei Drittel Chart / ein Drittel Coach, mobil
// Chart oben und Coach darunter.
//
// Zur Uebungs-Detailseite fuehrt allein der Name, nicht die Kopfzeile und nicht
// die Kachel: die Schaltflaeche ist genau so breit wie der Text und meldet sich
// ueber den Farbwechsel des Namens - dasselbe Muster wie im Workout-Start-Popup
// (StartModal/CardTitle). Ein Chevron steht bewusst nicht daneben, sonst sieht
// die ganze Zeile wieder antippbar aus.
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
      <div className="flex px-4 pt-3.5 pb-1 min-[960px]:px-5">
        <button
          type="button"
          onClick={onOpen}
          aria-label={name + " öffnen"}
          className="min-w-0 cursor-pointer truncate rounded-[8px] text-left text-[17px] font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-[960px]:text-[15px]"
        >
          {name}
        </button>
      </div>
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
