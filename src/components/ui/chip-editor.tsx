import { X } from "lucide-react";
import { CHIP_BASE } from "./chip-list";
import { cn } from "@/lib/utils";

// Generischer Chip-Editor, domaenenfrei. Oben die vorhandenen Eintraege als
// loeschbare Chips (Label + ×), darunter die noch nicht gewaehlten Optionen als
// "+ Label"-Knoepfe zum Hinzufuegen. Werte sind Strings (z. B. Gewichte); die
// aufrufende Karte parst und schreibt. Genutzt fuer Scheiben und Kettlebells in
// den Einstellungen, spaeter ueberall, wo aus festen Optionen eine Mehrfachauswahl
// gepflegt wird. Die Pillen-Optik selbst steht in chip-list.tsx (CHIP_BASE) und
// wird von der reinen Anzeige (ChipList) mitbenutzt.
export interface ChipItem {
  id: string;
  label: string;
}
export interface AddOption {
  value: string;
  label: string;
}

export function ChipEditor({
  chips,
  onRemove,
  addOptions,
  onAdd,
  emptyText = "Nichts ausgewählt.",
  disabled = false,
  className,
}: {
  chips: ChipItem[];
  onRemove: (id: string) => void;
  addOptions: AddOption[];
  onAdd: (value: string) => void;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card bg-card p-4 shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        {chips.length === 0 ? (
          <span className="text-sm text-muted-foreground">{emptyText}</span>
        ) : (
          chips.map((c) => (
            <span
              key={c.id}
              className={cn(CHIP_BASE, "gap-1 py-1 pr-1 pl-3")}
            >
              {c.label}
              <button
                type="button"
                aria-label={`${c.label} entfernen`}
                disabled={disabled}
                onClick={() => onRemove(c.id)}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      {addOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {addOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onAdd(o.value)}
              className="inline-flex items-center rounded-pill border border-dashed border-border px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-50"
            >
              + {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
