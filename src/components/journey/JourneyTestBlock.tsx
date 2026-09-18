import { Check } from "lucide-react";
import { StatLine } from "@/components/ui/stat-line";
import type { StatCell } from "@/components/ui/stat-row";
import type { JourneyTestView } from "@/lib/journeyTest";
import { cn } from "@/lib/utils";

// Der Block der Journey-Kachel WAEHREND der reinen Testwoche (#480) – an der
// Stelle, an der sonst der Coach-Block steht.
//
// In der Testwoche gibt der Coach nichts vor: getestet wird, mehr nicht. Eine
// Zeile "Beim naechsten Mal: 45 kg x 2" samt Begruendung und Ausblick waere
// dort falscher Rat. Stattdessen steht hier das Ergebnis – das gemessene Set,
// das 1RM daraus und wohin sich das 1RM in dieser Journey bewegt hat.
//
// Aufbau und Abstaende folgen bewusst dem Coach-Block (Pille, Zahlenzeile,
// erklaerende Zeilen, darunter dieselbe Statistikzeile), damit die Kachel beim
// Wechsel in die Testwoche nicht die Form aendert, sondern nur den Inhalt.
export function JourneyTestBlock({
  test,
  stats,
  className,
}: {
  /** Testergebnis dieser Uebung in dieser Journey; null = keine Daten. */
  test: JourneyTestView | null;
  stats: readonly StatCell[];
  className?: string;
}): React.ReactElement {
  const result = test?.result ?? null;
  const progress = test?.progress ?? null;
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "inline-flex flex-none items-center gap-1 rounded-pill px-2.5 py-1 text-[12px] font-semibold leading-none",
            result
              ? "bg-primary/10 text-skill-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {result && <Check className="size-3.5" strokeWidth={2.75} aria-hidden />}
          {result ? "Getestet" : "Testwoche"}
        </span>
        {result ? (
          <span className="text-[15px] font-semibold text-foreground">
            <span className="font-mono tabular-nums">{result.setText}</span>
          </span>
        ) : (
          <span className="text-[15px] font-semibold text-foreground">
            Noch nicht getestet
          </span>
        )}
      </div>
      {result ? (
        <p className="mt-2.5 text-[14px] leading-snug text-muted-foreground">
          1RM aus dem Test:{" "}
          <span className="font-mono tabular-nums">{result.rmText}</span>
        </p>
      ) : (
        <p className="mt-2.5 text-[14px] leading-snug text-muted-foreground">
          In dieser Woche steht der 1RM-Test an – eine Vorgabe gibt es dafür
          nicht.
        </p>
      )}
      {result && progress && (
        <p className="mt-1.5 text-[14px] font-semibold text-muted-foreground">
          In dieser Journey:{" "}
          <span className="font-mono tabular-nums">
            {progress.fromText} → {progress.toText}
          </span>
          {progress.pctText && (
            <span className="font-mono tabular-nums"> ({progress.pctText})</span>
          )}
        </p>
      )}
      {stats.length > 0 && (
        <StatLine
          cells={stats}
          className="mt-3.5 border-t border-border pt-3.5"
        />
      )}
    </div>
  );
}
