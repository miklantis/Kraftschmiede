import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Kompaktes Zahlenfeld fuer die Satzwerte der laufenden Einheit (Wdh/kg).
// Bewusst eigenes Feld statt des Einstellungs-NumberField: hier zaehlt die
// fokus-erhaltende Eingabe (Phase 11, Lieferung 3). Der getippte Text bleibt
// waehrend der Eingabe LOKAL in der Komponente; erst beim Verlassen des Feldes
// oder mit Enter wird der Wert in den geraete-lokalen Live-Speicher committet.
// So loest kein Tastendruck ein Neuzeichnen des ganzen Panels aus, der Cursor
// bleibt stehen - der Ersatz fuer V1s chirurgische DOM-Updates.
//
// Komma wird als Dezimaltrenner akzeptiert und angezeigt (deutsche Eingabe).

function fmt(value: number): string {
  return String(value).replace(".", ",");
}

export function LiveNumberInput({
  value,
  onCommit,
  decimal,
  ariaLabel,
  className,
}: {
  value: number;
  onCommit: (next: number) => void;
  /** true: Dezimalzahl (kg), false: Ganzzahl (Wdh). Steuert Tastatur + Parsen. */
  decimal: boolean;
  ariaLabel: string;
  className?: string;
}): React.ReactElement {
  const [text, setText] = useState<string>(() => fmt(value));
  const focused = useRef(false);

  // Aeusseren Wert nur uebernehmen, solange das Feld NICHT fokussiert ist - sonst
  // wuerde ein Re-Render die laufende Eingabe ueberschreiben.
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);

  function commit(): void {
    const trimmed = text.trim();
    if (trimmed === "") {
      setText(fmt(value));
      return;
    }
    const parsed = decimal
      ? Number(trimmed.replace(",", "."))
      : parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      setText(fmt(value));
      return;
    }
    onCommit(parsed);
  }

  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      aria-label={ariaLabel}
      className={cn(
        "w-full rounded-[8px] border border-border bg-background px-2 py-1 text-center font-mono text-[14px] text-foreground outline-none focus:border-primary",
        className,
      )}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
