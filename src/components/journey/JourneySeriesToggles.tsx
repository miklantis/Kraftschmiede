import { cn } from "@/lib/utils";
import {
  JOURNEY_SERIES_CHIP,
  JOURNEY_SERIES_KEYS,
} from "@/lib/journeyChart";
import { JOURNEY_SERIES_VAR } from "./JourneyExerciseChart";
import { useJourneySeries } from "@/hooks/useJourneySeries";

// Schalterreihe der Verlaufs-Serien, zugleich Legende: der Farbpunkt ist
// dieselbe Farbe wie die Linie im Chart. Sie steht einmal im Abschnittskopf und
// gilt fuer alle Kacheln gemeinsam – eine Serie an- oder abzuschalten ist eine
// Frage an den Abschnitt ("zeig mir die Gewichte"), nicht an die einzelne
// Uebung. Der Stand wird geraete-lokal gemerkt (useJourneySeries).
export function JourneySeriesToggles(): React.ReactElement {
  const { has, toggle } = useJourneySeries();
  return (
    <div
      role="group"
      aria-label="Serien im Verlauf"
      className="flex flex-wrap gap-[7px]"
    >
      {JOURNEY_SERIES_KEYS.map((k) => {
        const on = has(k);
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-[9px] bg-muted px-[11px] py-[6px] text-[12.5px] font-semibold transition-colors",
              on
                ? "text-foreground"
                : "text-foreground-subtle hover:text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{
                backgroundColor: on
                  ? `var(${JOURNEY_SERIES_VAR[k]})`
                  : "var(--marker-idle)",
              }}
            />
            {JOURNEY_SERIES_CHIP[k]}
          </button>
        );
      })}
    </div>
  );
}
