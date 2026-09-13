import { useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Einzeiliges Suchfeld im "Klar"-Look: Lupe links, Eingabefeld, Loeschen-Knopf
// rechts, sobald etwas drinsteht. Loeschen setzt den Wert zurueck und gibt den
// Fokus ans Feld, damit direkt weitergetippt werden kann.
//
// Bewusst domaenenfrei: Wert, Aenderungs-Callback, Platzhalter und aria-label
// kommen vom Aufrufer. Der Baustein filtert nichts und weiss nichts ueber die
// Liste darunter – das Filtern gehoert in die Aufbereitungslogik (lib/).
export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Beschriftung fuer Screenreader; das Feld hat keine sichtbare. */
  ariaLabel: string;
  className?: string;
}): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-10 pr-9 pl-9"
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Suche löschen"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
