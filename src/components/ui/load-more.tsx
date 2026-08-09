import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Nachlade-Element fuer gekuerzte Listen: bewusst zurueckhaltend, damit die
// Liste selbst im Vordergrund bleibt. Kein Rahmen, kein Hintergrund, kein Text
// – nur ein dezent grauer Chevron nach unten, zentriert ueber die volle Breite
// als grosszuegige Tippflaeche. Die Beschriftung traegt nur das aria-label.
//
// Verbindlicher Standard: jede Liste, die zunaechst einen Teil zeigt und
// nachladen kann, nutzt diesen Baustein (siehe Designsystem.md).
export function LoadMore({
  onClick,
  label = "Mehr laden",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex w-full items-center justify-center rounded-control py-2 text-[#c4c4c9]",
        "transition-colors outline-none hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
    >
      <ChevronDown className="size-5" strokeWidth={2.2} aria-hidden="true" />
    </button>
  );
}
