import { compChips } from "@/lib/composition";
import { longDateYearDE } from "@/lib/format";
import type { CompositionRow } from "@/schemas";

// Mess-Liste (read-only): je Messung Datum + Chips der vorhandenen Werte,
// neueste zuerst. Nichts, wenn es keine Messung gibt (die Mess-Karte zeigt dann
// schon den Hinweis).
export function BodyMeasureList({
  rows,
}: {
  rows: CompositionRow[];
}): React.ReactElement | null {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-[18px] bg-card shadow-card">
      {rows.map((e) => (
        <div
          key={e.date}
          className="border-t border-[#f0f0f2] p-[14px_16px] first:border-t-0 min-[960px]:p-[14px_18px]"
        >
          <div className="mb-2 text-[14px] font-semibold text-foreground">
            {longDateYearDE(e.date)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {compChips(e).map((c, i) => (
              <span
                key={i}
                className="rounded-pill bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/70"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
