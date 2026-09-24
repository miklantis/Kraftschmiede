import { cn } from "@/lib/utils";

// Segmentbalken fuer den Phasen-Stand eines Skills: ein Segment je Phase,
// nebeneinander ueber die volle Breite. Erledigte Phasen sind gefuellt, die
// aktuelle ist kraeftig hervorgehoben, kuenftige bleiben blass. Ist der Skill
// gemeistert, sind alle Segmente gefuellt. Bewusst andere Optik als die
// ProgressDots, die in der Journey fuer Wocheneinheiten stehen.
//
// Zweiter Einsatz: der Tagesbalken des Fastenbegleiters (ein Segment je
// Fastentag). Dafuer traegt der Balken den Ton des Heilfasten-Bands aus dem
// Kalender (`tone="green"`) und eine eigene Beschriftung (`ariaLabel`).

// Vollstaendige Klassenliterale je Ton (kein Laufzeit-Zusammenbau, sonst
// greift der Tailwind-Compiler sie nicht): erledigt, aktuell.
const TONE = {
  skill: { done: "bg-skill/45", current: "bg-skill" },
  green: { done: "bg-tone-green/45", current: "bg-tone-green" },
} as const;

export function PhaseBar({
  index,
  count,
  mastered = false,
  tone = "skill",
  ariaLabel,
  className,
}: {
  /** Nullbasierter Index der aktuellen Phase. */
  index: number;
  /** Anzahl der Phasen insgesamt. */
  count: number;
  mastered?: boolean;
  /** Farbton der Segmente. Standard: Skill-Farbe. */
  tone?: keyof typeof TONE;
  /** Eigene Beschriftung fuer Screenreader statt „Phase X von Y“. */
  ariaLabel?: string;
  className?: string;
}): React.ReactElement | null {
  const total = Math.max(0, Math.trunc(count));
  if (total === 0) return null;
  const current = Math.max(0, Math.min(Math.trunc(index), total - 1));

  return (
    <div
      className={cn("flex w-full items-center gap-1", className)}
      role="img"
      aria-label={
        ariaLabel ??
        (mastered
          ? "Alle " + total + " Phasen abgeschlossen"
          : "Phase " + (current + 1) + " von " + total)
      }
    >
      {Array.from({ length: total }, (_, i) => {
        const done = mastered || i < current;
        const isCurrent = !mastered && i === current;
        return (
          <span
            key={i}
            className={cn(
              "h-[5px] min-w-[6px] flex-1 rounded-pill",
              done
                ? TONE[tone].done
                : isCurrent
                  ? TONE[tone].current
                  : "bg-border",
            )}
          />
        );
      })}
    </div>
  );
}
