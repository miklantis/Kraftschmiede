import { cn } from "@/lib/utils";

// Generische Bewertungs-Skala: eine Reihe gleichwertiger Buttons, genau einer
// aktiv. Domaenenfrei – die Komponente kennt weder "Kater" noch "Readiness" und
// keine feste Farbe. Die Farbgebung je Wert kommt ueber colorFor herein
// (gefuellt bei Auswahl, dezent sonst); ohne Vorgabe markengruen aktiv / grau
// inaktiv. Aktuell genutzt fuer Beine/Oberkoerper/Gesamt-Kater (0..3) und
// Readiness (1..5) auf der Koerper-Seite; mit weiteren Bewertungen spaeter
// wiederverwendbar (genau dafuer als Primitive gebaut). Optik aus V1 (kb-sore-btn).

export interface RatingScaleProps {
  // Auszuwaehlende Werte in Anzeige-Reihenfolge (z. B. [0,1,2,3] oder [1,2,3,4,5]).
  values: readonly number[];
  value: number;
  onChange: (next: number) => void;
  // Farbe je Wert. selected = gefuellt. Ohne Vorgabe: Marken-/Graustandard.
  colorFor?: (value: number, selected: boolean) => { bg: string; fg: string };
  // Optionales Label je Wert (sonst die Zahl selbst).
  labelFor?: (value: number) => string;
  ariaLabel?: string;
  className?: string;
}

function defaultColors(
  _value: number,
  selected: boolean,
): { bg: string; fg: string } {
  return selected
    ? { bg: "var(--primary)", fg: "var(--primary-foreground)" }
    : { bg: "var(--muted)", fg: "var(--muted-foreground)" };
}

export function RatingScale({
  values,
  value,
  onChange,
  colorFor = defaultColors,
  labelFor,
  ariaLabel,
  className,
}: RatingScaleProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-1.5", className)}
    >
      {values.map((v) => {
        const on = v === value;
        const c = colorFor(v, on);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v)}
            style={{ background: c.bg, color: c.fg }}
            className="flex size-[38px] flex-none items-center justify-center rounded-[10px] text-[15px] font-semibold transition-colors min-[960px]:size-[40px]"
          >
            {labelFor ? labelFor(v) : v}
          </button>
        );
      })}
    </div>
  );
}
