import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Umrahmter Listen-Container mit weichem Schatten und Trennlinien zwischen den
// Zeilen (Optik aus V1 ks-list). bordered=true gibt auch der ersten Zeile eine
// obere Linie (z. B. wenn ueber der Liste eine Eyebrow steht).
export function List({
  children,
  bordered = false,
  className,
}: {
  children: ReactNode;
  bordered?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <div
      data-bordered={bordered ? "" : undefined}
      className={cn(
        "group/list overflow-hidden rounded-[18px] bg-card shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

// Eine Listenzeile: Titel + optionale Unterzeile links, optionales Anhaengsel
// (Score, Notiz) rechts, optionaler Pfeil. Klickbar, wenn onClick gesetzt ist;
// disabled dimmt die Zeile und unterbindet den Klick (V1: .excl). Das Arbeitspferd
// fuer Workouts, Skills, Yoga – und spaeter Uebungen, Verlauf, Einstellungen.
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  chevron = false,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Fuehrendes Symbol ganz vorne (z. B. Trainingstyp-Icon). Dezent grau,
   *  einheitlich auf 20px gesetzt; der Aufrufer gibt nur das Icon herein. */
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}): React.ReactElement {
  const clickable = typeof onClick === "function" && !disabled;

  const inner = (
    <>
      {leading != null && (
        <span className="flex-none text-muted-foreground [&>svg]:size-5">
          {leading}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="text-[17px] font-semibold text-foreground min-[960px]:text-[15px]">
          {title}
        </div>
        {subtitle != null && (
          <div className="truncate text-[13px] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      {trailing != null && <div className="flex-none">{trailing}</div>}
      {chevron && (
        <ChevronRight className="size-[18px] flex-none text-[#a0a0a5]" />
      )}
    </>
  );

  // Trennlinie: jede Zeile ausser der ersten; in einer bordered-Liste auch die
  // erste. Hover-Tonung nur bei klickbaren Zeilen.
  const base =
    "flex w-full items-center gap-3 px-4 py-3.5 text-left text-foreground border-t border-[#f0f0f2] first:border-t-0 group-data-[bordered]/list:first:border-t min-[960px]:px-5 min-[960px]:py-4";

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(base, "cursor-pointer hover:bg-primary/5")}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(base, disabled && "opacity-50")}
    >
      {inner}
    </div>
  );
}
