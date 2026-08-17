import { cn } from "@/lib/utils";
import { SCORE_MAP } from "@/engine/score";

// Score 1..5 als Zahl in einem runden Feld – die Optik der Score-Referenz in den
// Einstellungen, hier als wiederverwendbarer Baustein. Zwei Groessen: "md" (Skala
// in den Einstellungen) und "sm" (in Listen, z. B. der Uebungs-Verlauf).
// Der Titel nennt die Bedeutung aus der Engine (SCORE_MAP), damit Kreis und
// Skala nie auseinanderlaufen.
export function ScoreDot({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}): React.ReactElement {
  const info = SCORE_MAP[value];
  const label = info ? `Score ${value} – ${info.label}` : `Score ${value}`;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-muted font-mono font-semibold text-foreground tabular-nums",
        size === "md" && "size-7 text-sm",
        size === "sm" && "size-[22px] text-[12px]",
        className,
      )}
    >
      {value}
    </span>
  );
}
