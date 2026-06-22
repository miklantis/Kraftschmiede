import { cn } from "@/lib/utils";

// An/Aus-Schalter (role=switch). Generisch und domaenenfrei: nutzbar fuer
// Skill aktivieren/deaktivieren und spaeter Einstellungen (Equipment, Theme).
// Optik: gruene Wanne an, graue aus; runder Knopf gleitet. label fuer Screenreader.
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
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
        checked ? "bg-primary" : "bg-[#d4d4d8]",
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
