import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import { cn } from "@/lib/utils";

// Hero-Karte "Heute empfohlen": das hoechstbewertete Workout mit Name, Score,
// enthaltenen Lifts und Start-Knopf. Optik 1:1 aus V1 (rec-hero): weiche
// Akzent-Elevation, grosser Name, Score in Mono. Eyebrow/Score-Label nur auf
// Desktop. Bei Ausschluss (Kater=3) gedimmt und Start gesperrt.
export function RecommendedWorkout({
  name,
  score,
  lifts,
  excluded = false,
  onStart,
}: {
  name: string;
  score: number;
  lifts: string;
  excluded?: boolean;
  onStart?: () => void;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-[22px] bg-card p-5 shadow-hi min-[960px]:px-7 min-[960px]:py-[26px]",
        excluded && "opacity-60",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-0 min-[960px]:items-start min-[960px]:gap-[14px]">
        <div className="min-w-0">
          <div className="hidden text-[13px] font-semibold tracking-[0.3px] text-muted-foreground min-[960px]:block">
            Empfohlen für heute
          </div>
          <div className="text-[22px] font-bold text-foreground min-[960px]:mt-[3px] min-[960px]:text-[30px] min-[960px]:tracking-[-0.4px]">
            {name}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="hidden text-[13px] font-medium text-muted-foreground min-[960px]:block">
            Score
          </div>
          <ScoreBadge value={score} variant="hero" />
        </div>
      </div>
      <div className="mb-[18px] text-[15px] leading-[1.5] text-[#5c5c61] min-[960px]:mb-[22px] min-[960px]:text-base">
        {lifts}
      </div>
      {excluded && (
        <div className="mb-3.5 text-[13px] text-danger">
          Wegen Muskelkater heute nicht empfohlen
        </div>
      )}
      <Button
        onClick={onStart}
        disabled={excluded}
        className="h-auto w-full rounded-[14px] border-0 py-3.5 text-base leading-tight min-[960px]:py-4 min-[960px]:text-[17px]"
      >
        Session starten
      </Button>
    </div>
  );
}
