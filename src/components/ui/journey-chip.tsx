import { Map } from "lucide-react";
import { cn } from "@/lib/utils";

// Kleiner Journey-Marker: das Karten-Icon der Journey (wie im Hauptmenue),
// als weiche gruene Toenung (analog zur "Steigern"-Pille) statt schwarzer
// Pille. Nur Icon, kein Text; die Bedeutung ("in der Journey" bzw.
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
        "inline-flex flex-none items-center justify-center rounded-pill bg-primary/10 px-2 py-1 text-[#0a7d5e]",
        className,
      )}
    >
      <Map className="size-3.5" strokeWidth={2.75} aria-hidden />
    </span>
  );
}
