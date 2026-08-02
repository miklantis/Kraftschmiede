import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtNum, fmtWeight, longDateShort } from "@/lib/format";

// Generischer Fortschrittsbalken "aktuell gegen Ziel". Rein darstellend, kennt
// keine Datenbank – nutzbar fuer Uebungs-Meilensteine und spaeter fuer andere
// Ziele (Skill, Koerper). Zeigt:
//   - offen: schmaler Balken (Fuellung = aktuell/Ziel, gedeckelt bei 100 %),
//     darunter "aktuell / Ziel" und der Abstand ("noch X kg"). Fehlt der
//     aktuelle Wert, steht der Balken bei 0 mit dezentem Hinweis.
//   - erreicht: voller Balken plus "erreicht am <Datum>".
// current == null bedeutet "kein Messwert vorhanden".
export function ProgressToGoal({
  current,
  target,
  unit,
  achievedAt = null,
  className,
}: {
  current: number | null;
  target: number;
  unit: string;
  achievedAt?: string | null;
  className?: string;
}): React.ReactElement {
  const achieved = achievedAt != null;
  const hasCurrent = current != null;

  // Fuellgrad 0..1. Ohne Messwert 0; erreicht immer voll.
  const ratio = achieved
    ? 1
    : hasCurrent && target > 0
      ? Math.max(0, Math.min(1, current / target))
      : 0;
  const pct = Math.round(ratio * 100);

  const gap = hasCurrent ? Math.max(0, target - current) : null;

  return (
    <div className={cn("w-full", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            achieved ? "bg-primary" : "bg-foreground",
          )}
          style={{ width: pct + "%" }}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-muted-foreground">
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {hasCurrent ? fmtWeight(current, unit) : "–"}
          </span>{" "}
          / {fmtWeight(target, unit)}
        </span>

        {achieved ? (
          <span className="flex items-center gap-1 font-medium text-primary">
            <Check className="size-[14px]" strokeWidth={2.6} />
            erreicht am {longDateShort(achievedAt)}
          </span>
        ) : hasCurrent ? (
          <span className="font-medium text-muted-foreground">
            {gap === 0 ? "Ziel erreicht" : "noch " + fmtNum(gap) + " " + unit}
          </span>
        ) : (
          <span className="font-medium text-muted-foreground">
            noch kein 1RM
          </span>
        )}
      </div>
    </div>
  );
}
