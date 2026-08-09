import { cn } from "@/lib/utils";
import { fmtScore } from "@/lib/format";

// Kleine Score-Anzeige des Coaches als Mono-Zahl mit Tabellenziffern. Zwei
// Varianten: "row" (klein, gedeckt – in Listenzeilen) und "hero" (gross, Akzent
// – in der Empfehlungskarte). Wert wird mit deutschem Dezimalkomma formatiert.
export function ScoreBadge({
  value,
  variant = "row",
  className,
}: {
  value: number;
  variant?: "row" | "hero";
  className?: string;
}): React.ReactElement {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        variant === "row" && "text-[13px] font-semibold text-foreground-subtle",
        variant === "hero" &&
          "text-[22px] leading-none font-bold text-primary min-[960px]:text-[30px] min-[960px]:leading-[1.05]",
        className,
      )}
    >
      {fmtScore(value)}
    </span>
  );
}
