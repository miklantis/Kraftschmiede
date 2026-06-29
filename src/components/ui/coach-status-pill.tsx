import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachState } from "@/lib/coach";

// Kleine Pille mit der groben Coach-Lesart fuer die naechste Einheit einer Uebung:
// Steigern / Halten / Senken, dazu "Frei" (Begleituebung ohne progressive Wertung)
// und "Start" (noch keine Vordaten). Akzentgruen nur beim Steigern; Senken ruhig
// gedeckt (keine Alarmfarbe - Senken ist normale Belastungssteuerung). Genutzt in
// der Uebungsliste (statt der Muskelzeile) und im Coach-Block der Detailseite.

type PillStyle = {
  label: string;
  cls: string;
  Icon?: typeof ArrowUp;
};

const STYLES: Record<CoachState, PillStyle> = {
  up: { label: "Steigern", cls: "bg-primary/10 text-[#0a7d5e]", Icon: ArrowUp },
  hold: { label: "Halten", cls: "bg-muted text-muted-foreground", Icon: Minus },
  down: { label: "Senken", cls: "bg-[#e9edf1] text-[#637083]", Icon: ArrowDown },
  carry: { label: "Frei", cls: "bg-muted text-muted-foreground" },
  start: { label: "Start", cls: "bg-muted text-muted-foreground" },
};

export function CoachStatusPill({
  state,
  className,
}: {
  state: CoachState;
  className?: string;
}): React.ReactElement {
  const s = STYLES[state];
  const Icon = s.Icon;
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1 rounded-pill px-2.5 py-1 text-[12px] font-semibold leading-none",
        s.cls,
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" strokeWidth={2.75} aria-hidden />}
      {s.label}
    </span>
  );
}
