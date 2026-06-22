// Generischer Segment-Umschalter (Optik 1:1 aus V1 ks-seg). Zwei oder mehr
// gleichwertige Ansichten, von denen genau eine aktiv ist – z. B. Liste/Kalender
// im Verlauf. Bewusst klein und ohne Domaenenbezug, damit er ueberall passt.
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}): React.ReactElement {
  return (
    <div
      role="tablist"
      className={
        "flex gap-0 rounded-[13px] bg-secondary p-[3px] " + (className ?? "")
      }
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.value)}
            className={
              "flex-1 rounded-[10px] py-[9px] text-[14px] font-semibold transition-colors " +
              (on
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                : "text-muted-foreground")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
