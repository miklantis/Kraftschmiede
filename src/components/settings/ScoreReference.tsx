import { SCORE_MAP } from "@/engine/score";

// Nur-Lese-Referenz: die Score-Skala 1..5 mit ihrem RIR- und RPE-Pendant. Reine
// Anzeige, nichts editierbar. Werte stammen aus der Engine (SCORE_MAP), damit
// Skala und Anzeige nie auseinanderlaufen. Optik wie V1: links die Zahl in einem
// runden Feld plus Kurzbeschreibung, rechts RIR und RPE in Mono.
export function ScoreReference(): React.ReactElement {
  const rows = [1, 2, 3, 4, 5];

  return (
    <div className="divide-y divide-border overflow-hidden rounded-card bg-card shadow-card">
      {rows.map((n) => {
        const info = SCORE_MAP[n];
        return (
          <div
            key={n}
            className="flex min-h-[44px] items-center gap-3 px-4 py-2.5"
          >
            <span className="flex size-7 flex-none items-center justify-center rounded-full bg-muted font-mono text-sm font-semibold text-foreground">
              {n}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {info?.label ?? ""}
            </span>
            <span className="flex-none font-mono text-xs text-muted-foreground tabular-nums">
              RIR {info?.rir ?? ""}
            </span>
            <span className="flex-none font-mono text-xs text-muted-foreground tabular-nums">
              RPE {info?.rpe ?? ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
