import type { StatCell } from "@/components/ui/stat-row";
import { cn } from "@/lib/utils";

// Die flache Geschwister-Form von StatRow: dieselben Zellen, aber als eine
// Textzeile (Wert fett, Label dahinter) statt als Kacheln. Sie steht unter dem
// Coach-Block der Uebungsseite und unter dem Block der Journey-Kachel – in der
// Testwoche traegt die Kachel dort das Testergebnis statt der Coach-Vorgabe
// (#480), die Zahlen darunter bleiben dieselben.
//
// Ohne eigenen Rahmen und ohne Abstand nach oben: wo die Zeile abgesetzt
// gehoert, setzt der Aufrufer die Trennlinie ueber className.
export function StatLine({
  cells,
  className,
}: {
  cells: readonly StatCell[];
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-[22px] gap-y-2 text-[15px] text-muted-foreground",
        className,
      )}
    >
      {cells.map((c, i) => (
        <span key={i}>
          <span
            className={cn(
              "font-semibold tabular-nums",
              c.accent ? "text-primary" : "text-foreground",
            )}
          >
            {c.value}
          </span>{" "}
          {c.label}
        </span>
      ))}
    </div>
  );
}
