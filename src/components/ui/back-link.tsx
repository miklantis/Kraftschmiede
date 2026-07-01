import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// Einheitlicher Zurueck-Link oben links auf Unterseiten. Fuehrt zur uebergeordneten
// Seite und sieht ueberall gleich aus: Markengruen, halbfett, Chevron, fester
// Abstand nach unten. label ist der Name der Zielseite (z. B. "Journey").
export interface BackLinkProps {
  to: LinkProps["to"];
  label: string;
  /** Optionale Route-Params, falls das Ziel einen Parameter hat (z. B. Workout-Detail). */
  params?: LinkProps["params"];
  className?: string;
}

export function BackLink({
  to,
  label,
  params,
  className,
}: BackLinkProps): React.ReactElement {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "mb-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary",
        className,
      )}
    >
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  );
}
