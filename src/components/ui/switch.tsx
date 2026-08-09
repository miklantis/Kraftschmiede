import { cn } from "@/lib/utils";

const TONE_ON: Record<"primary" | "skill" | "yoga", string> = {
  primary: "bg-primary",
  skill: "bg-skill",
  yoga: "bg-yoga",
};

// An/Aus-Schalter (role=switch). Generisch und domaenenfrei: nutzbar fuer
// Skill aktivieren/deaktivieren und spaeter Einstellungen (Equipment, Theme).
// tone faerbt den Ein-Zustand (Skills blau, Journey gruen, Yoga lila); aus ist
// immer grau. label fuer Screenreader.
export function Switch({
  checked,
  onChange,
  disabled = false,
  tone = "primary",
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  tone?: "primary" | "skill" | "yoga";
  label?: string;
  className?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-[44px] flex-none items-center rounded-pill transition-colors disabled:opacity-50",
        checked ? TONE_ON[tone] : "bg-marker-idle",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[21px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
