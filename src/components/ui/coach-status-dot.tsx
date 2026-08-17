import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachState } from "@/lib/coach";

// Rundes Coach-Zeichen ohne Text: die grobe Tendenz fuer die naechste Einheit
// (Steigern / Halten / Senken) als reines Symbol. Kleine Schwester der
// CoachStatusPill - gleiche Bedeutung, gleiche Farbzuordnung, nur ohne Label,
// damit es neben eine Ueberschrift passt. Genutzt am Uebungsblock der laufenden
// Einheit (#191), sobald alle Arbeitssaetze abgehakt sind.
//
// Akzentgruen nur beim Steigern; Senken bleibt ruhig gedeckt - Senken ist
// normale Belastungssteuerung, keine Alarmmeldung.

type DotStyle = {
  label: string;
  cls: string;
  Icon: typeof ArrowUp;
};

const STYLES: Record<CoachState, DotStyle> = {
  up: { label: "Steigern", cls: "bg-primary/10 text-skill-foreground", Icon: ArrowUp },
  hold: { label: "Halten", cls: "bg-muted text-muted-foreground", Icon: Minus },
  down: {
    label: "Senken",
    cls: "border border-border text-foreground-secondary",
    Icon: ArrowDown,
  },
  carry: { label: "Frei", cls: "bg-muted text-muted-foreground", Icon: Minus },
  start: { label: "Start", cls: "bg-muted text-muted-foreground", Icon: Minus },
};

/** Klartext-Bezeichnung des Zustands - fuer Vorlesehilfen und die
 *  aufklappende Erklaerzeile, damit beide dasselbe Wort benutzen. */
export function coachStateLabel(state: CoachState): string {
  return STYLES[state].label;
}

export function CoachStatusDot({
  state,
  provisional = false,
  className,
}: {
  state: CoachState;
  /** Zwischenstand, der noch wandern kann (offene Saetze im Block): gedaempft
   *  dargestellt, damit man ihm ansieht, dass er nicht fest ist. */
  provisional?: boolean;
  className?: string;
}): React.ReactElement {
  const s = STYLES[state];
  const Icon = s.Icon;
  return (
    <span
      className={cn(
        "inline-flex size-[26px] flex-none items-center justify-center rounded-full",
        s.cls,
        provisional && "opacity-50",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.75} aria-hidden />
    </span>
  );
}
