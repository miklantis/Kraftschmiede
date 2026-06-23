import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Generisches Zahlenfeld: kompaktes Eingabefeld fuer eine Zahl mit optionalem
// Suffix (z. B. "kg", "Sek.", "h", "×/Woche"). Domaenenfrei. Der Wert wird beim
// Verlassen des Feldes oder mit Enter uebernommen (onCommit), nicht bei jedem
// Tastendruck - so bleibt das Tippen ruhig und es wird nicht bei jeder Ziffer
// gespeichert. Leeres Feld -> null. Wird in den Einstellungen (Frequenz,
// Schrittweite, Erholung, Timer) genutzt, spaeter auch andernorts.
function format(value: number | null): string {
  return value == null ? "" : String(value);
}

export function NumberField({
  value,
  onCommit,
  step,
  suffix,
  min,
  ariaLabel,
  className,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
  step?: number;
  suffix?: string;
  min?: number;
  ariaLabel?: string;
  className?: string;
}): React.ReactElement {
  const [text, setText] = useState<string>(() => format(value));

  // Aeusseren Wert uebernehmen, wenn er sich aendert (z. B. nach dem Speichern).
  useEffect(() => {
    setText(format(value));
  }, [value]);

  function commit(): void {
    const trimmed = text.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (Number.isNaN(parsed)) {
      setText(format(value));
      return;
    }
    onCommit(parsed);
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <input
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        step={step}
        min={min}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="h-9 w-[68px] rounded-control border border-border bg-input px-2 text-right text-sm text-foreground tabular-nums outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix != null && suffix !== "" && (
        <span className="select-none">{suffix}</span>
      )}
    </span>
  );
}
