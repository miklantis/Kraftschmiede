import * as React from "react";

import { cn } from "@/lib/utils";

// Optik 1:1 aus dem V1-"Klar"-Theme: leicht gefuelltes Feld (bg-input = #fafafa)
// mit sichtbarem Rahmen (border-border = --line2), 11px-Radius
// (rounded-control); Fokus faerbt den Rahmen gruen (border-ring) plus dezenter
// Ring.
function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">): React.ReactElement {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-control border border-border bg-input px-3 py-1 text-base transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
