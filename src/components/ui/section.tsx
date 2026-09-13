import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Abschnitt mit kleiner Eyebrow-Ueberschrift plus Inhalt. Auf jeder Seite
// gebraucht. Optik aus V1 (train-eyebrow): kleine, gesperrte Versal-Ueberschrift
// in muted, darunter der Inhalt.
//
// Optional sitzt rechts neben der Ueberschrift eine Aktion (action) – bewusst
// schlank gehalten: der Baustein gibt nur den Platz und die Ausrichtung vor,
// was dort steht (heute der Stift-Knopf am Journey-Workout-Abschnitt) bleibt
// Sache des Aufrufers.
export function Section({
  eyebrow,
  action,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  /** Element rechts neben der Ueberschrift, z. B. ein Icon-Knopf. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section className={cn("flex flex-col", className)}>
      {(eyebrow != null || action != null) && (
        <div className="mb-2.5 flex items-center gap-2 min-[960px]:mb-3">
          {eyebrow != null && (
            <div className="min-w-0 flex-1 text-[13px] font-semibold tracking-[0.6px] text-muted-foreground uppercase min-[960px]:text-[12px] min-[960px]:tracking-[0.7px]">
              {eyebrow}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
