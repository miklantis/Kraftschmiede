import { CoachStatusPill } from "@/components/ui/coach-status-pill";
import { StatLine } from "@/components/ui/stat-line";
import type { StatCell } from "@/components/ui/stat-row";
import type { CoachView } from "@/lib/coach";
import { coachLineLabel, coachOutlookLabel } from "@/lib/coachText";
import { fmtWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

// Der Coach-Block einer Uebung: Status-Pille, die Zahlen ("Diese Woche" bzw.
// "Beim naechsten Mal" mit Gewicht x Wdh), die Begruendung, der Ausblick auf
// die naechste Woche und darunter die Statistikzeile.
//
// Bewusst nur der Inhalt, ohne Kartenrahmen und ohne Bedienelemente: die
// Uebungs-Detailseite setzt ihn in ihre Coach-Karte samt "Anpassen"-Knopf, die
// Journey-Kachel in ihre rechte Spalte (dort ist die Seite reine Anzeige). So
// steht der Kasten an beiden Orten, wird aber nur an einer Stelle gepflegt.
//
// Bei Uebungen, die der Coach nur fortschreibt (Core, Koerpergewicht: Status
// "carry"), entfaellt die Zahlenzeile - dort gibt er keine Last vor, und die
// Begruendung sagt genau das.
export function CoachBlock({
  coach,
  stats,
  unit,
  className,
}: {
  coach: CoachView | null;
  stats: readonly StatCell[];
  unit: string;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("min-w-0", className)}>
      {coach && (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <CoachStatusPill state={coach.status.state} />
            {coach.status.state !== "carry" && (
              <span className="text-[15px] font-semibold text-foreground">
                {coachLineLabel(coach.scope, false)}:{" "}
                <span className="font-mono tabular-nums">
                  {fmtWeight(coach.status.weight, unit)} ×{" "}
                  {coach.status.targetReps}
                </span>
              </span>
            )}
          </div>
          <p className="mt-2.5 text-[14px] leading-snug text-muted-foreground">
            {coach.status.note}
          </p>
          {coach.outlook && (
            <p className="mt-1.5 text-[14px] font-semibold text-muted-foreground">
              {coachOutlookLabel(false)}:{" "}
              <span className="font-mono tabular-nums">
                {fmtWeight(coach.outlook.weight, unit)} ×{" "}
                {coach.outlook.targetReps}
              </span>
            </p>
          )}
        </>
      )}
      {stats.length > 0 && (
        <StatLine
          cells={stats}
          className={cn(coach && "mt-3.5 border-t border-border pt-3.5")}
        />
      )}
    </div>
  );
}
