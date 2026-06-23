import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Generisches Auswahlfeld (natives <select>). Domaenenfrei: Optionen kommen als
// {value,label}-Liste herein, der gewaehlte Wert und ein onChange-Rueckruf
// steuern es. Optik passend zum Eingabefeld (bg-input, sichtbarer Rahmen,
// 11px-Radius, gruener Fokusring); rechts ein dezenter Chevron. Genutzt fuer
// 1RM-Formel und Einheit in den Einstellungen, spaeter ueberall, wo aus wenigen
// festen Werten gewaehlt wird.
export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn("relative inline-flex", className)}>
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-control border border-border bg-input py-1 pr-8 pl-3 text-sm text-foreground outline-none transition-[color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
