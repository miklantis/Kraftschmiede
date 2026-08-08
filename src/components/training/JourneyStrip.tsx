import { Link } from "@tanstack/react-router";
import { Map, ChevronRight } from "lucide-react";
import { ProgressDots } from "@/components/ui/progress-dots";

// Journey-Streifen oben auf dem Trainings-Screen: Symbol, Titel + Unterzeile,
// Wochenfortschritt als Punkte. Klick fuehrt zur Journey-Seite. Optik 1:1 aus V1
// (jstrip): weiche Karte, Akzent-getoentes Symbolfeld, Pfeil nur auf Desktop.
export function JourneyStrip({
  title,
  subtitle,
  filled,
  total,
  showDots = true,
}: {
  title: string;
  subtitle: string;
  filled: number;
  total: number;
  /** Wochenpunkte anzeigen. Ohne aktive Journey gibt es kein Pensum, dann
   *  bleibt der Streifen bewusst ohne Punkte. */
  showDots?: boolean;
}): React.ReactElement {
  return (
    <Link
      to="/journey"
      className="flex items-center gap-3 rounded-card bg-card px-4 py-[14px] text-foreground shadow-card min-[960px]:gap-[14px] min-[960px]:rounded-[18px] min-[960px]:px-5 min-[960px]:py-[18px]"
    >
      <div className="flex size-[38px] flex-none items-center justify-center rounded-control bg-primary/12 text-primary min-[960px]:size-[42px] min-[960px]:rounded-xl">
        <Map className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-foreground min-[960px]:text-[16px]">
          {title}
        </div>
        <div className="truncate text-[13px] text-muted-foreground">
          {subtitle}
        </div>
      </div>
      {showDots && <ProgressDots filled={filled} total={total} />}
      <ChevronRight className="hidden size-[18px] flex-none text-[#a0a0a5] min-[960px]:block" />
    </Link>
  );
}
