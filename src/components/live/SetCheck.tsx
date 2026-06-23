import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Erledigt-Haken eines Satzes (Phase 11, Lieferung 3). Drei Zustaende wie V1:
//  - offen: leerer Rahmen
//  - aktiv (naechstes To-do): gruener Rahmen, hebt den faelligen Satz hervor
//  - erledigt: gruen gefuellt mit Haken
// Domaenenfrei gehalten; Klang/Vibration loest die aufrufende Aktion aus.
export function SetCheck({
  done,
  active,
  onToggle,
  ariaLabel,
}: {
  done: boolean;
  active: boolean;
  onToggle: () => void;
  ariaLabel: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={done}
      onClick={onToggle}
      className={cn(
        "ml-auto flex size-[24px] items-center justify-center rounded-md border transition-colors",
        done
          ? "border-primary bg-primary text-primary-foreground"
          : active
            ? "border-primary bg-background text-transparent"
            : "border-border bg-background text-transparent",
      )}
    >
      <Check className="size-[15px]" strokeWidth={3} />
    </button>
  );
}
