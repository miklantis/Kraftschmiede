import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Runder Fortschrittsring als SVG: ein ruhender Spurkreis, darueber der
// Fortschritt von oben im Uhrzeigersinn. Bewusst domaenenfrei - der Ring kennt
// weder Zeit noch Einheit, nur einen Fuellgrad von 0 bis 1. Farben kommen
// ausschliesslich als Klassen von aussen (stroke-*), damit keine Farbwerte in
// der Komponente stehen. `children` liegt zentriert in der Mitte des Rings.
export function ProgressRing({
  frac,
  size,
  stroke,
  className,
  trackClassName,
  children,
}: {
  /** Fuellgrad 0..1; ausserhalb liegende Werte werden geklemmt. */
  frac: number;
  /** Aussendurchmesser in Pixeln. */
  size: number;
  /** Strichstaerke in Pixeln. */
  stroke: number;
  /** Klasse des Fortschrittsbogens, z. B. "stroke-primary". */
  className?: string;
  /** Klasse des ruhenden Spurkreises, z. B. "stroke-marker-idle". */
  trackClassName?: string;
  children?: ReactNode;
}): React.ReactElement {
  const on = Math.max(0, Math.min(1, frac));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`} fill="none" strokeWidth={stroke}>
          <circle cx={size / 2} cy={size / 2} r={r} className={cn("stroke-marker-idle", trackClassName)} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - on)}
            className={cn("stroke-primary", className)}
          />
        </g>
      </svg>
      {children != null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}
