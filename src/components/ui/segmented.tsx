import { cn } from "@/lib/utils";

// Der eine Auswahl-Umschalter der App: zwei oder mehr gleichwertige Optionen,
// genau eine aktiv. Optik ist die graue Schiene mit weisser Markierung –
// bewusst ohne Akzentfarbe, damit Gruen dem Aktionsknopf und echten Signalen
// vorbehalten bleibt. Domaenenfrei, deshalb ueberall einsetzbar: Spanne im
// Coaching-Export (Einstellungen), Tageswahl im Yoga-Dialog, Zielart im
// Meilenstein-Dialog.
//
// Zwei Groessen, gleiche Optik: "md" (Standard) in Karten und Abschnitten,
// "lg" in Dialogen, wo die Reihe ein Formularfeld ist und bequem zu treffen
// sein muss.
//
// Davon getrennt die Flaeche, auf der die Reihe liegt: auf einer weissen Karte
// ("card", Standard) traegt die Schiene den gedeckten Ton, auf dem Canvas- bzw.
// Dialog-Grund ("canvas") eine Stufe dunkler. Ohne das verschmilzt die Schiene
// mit dem Grund – der ist dunkler als die gedeckte Flaeche.
//
// Abgrenzung: ChipSwitch bleibt die kompakte Chip-Reihe fuer Umschalter mit
// vielen Optionen (Metriken ueber den Diagrammen), die in einer Zeile gleich
// breiter Segmente nicht aufgehen. Mehrfachauswahl ist der ChipEditor.

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export type SegmentedSize = "md" | "lg";
export type SegmentedSurface = "card" | "canvas";

const PAD: Record<SegmentedSize, string> = {
  md: "py-[9px]",
  lg: "py-[11px]",
};

const TRACK: Record<SegmentedSurface, string> = {
  card: "bg-muted",
  canvas: "bg-marker-idle",
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  surface = "card",
  disabled = false,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: SegmentedSize;
  surface?: SegmentedSurface;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-0 rounded-[13px] p-[3px]",
        TRACK[surface],
        disabled && "opacity-60",
        className,
      )}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-[10px] px-1.5 text-[14px] font-semibold transition-colors",
              PAD[size],
              on
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                : "text-muted-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
