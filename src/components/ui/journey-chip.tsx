import { Map } from "lucide-react";
import { cn } from "@/lib/utils";

// Kleiner Journey-Marker: das Karten-Icon der Journey (wie im Hauptmenue),
// als weiche gruene Toenung (gleiche Toenung und Icon-Farbe wie das
// Symbolfeld im aktiven Journey-Block, JourneyStrip). Nur Icon, kein Text;
// die Bedeutung ("in der Journey" bzw.
// "journey-faehig") traegt der Seitenkontext. Label als aria-label/title fuer
// Screenreader und Hover. Genutzt auf Trainings- und Workouts-Seite.
export function JourneyChip({
  label,
  className,
}: {
  label: string;
  className?: string;
}): React.ReactElement {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-pill bg-primary/12 px-2 py-1 text-primary",
        className,
      )}
    >
      <Map className="size-3.5" strokeWidth={2.75} aria-hidden />
    </span>
  );
}
