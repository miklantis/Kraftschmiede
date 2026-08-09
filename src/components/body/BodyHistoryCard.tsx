import type { BodyHistEntry } from "@/hooks/useBodyView";
import { useMehrLaden } from "@/hooks/useMehrLaden";
import { LoadMore } from "@/components/ui/load-more";

// Befinden-Verlauf als Karte (neueste zuerst): Datum, Chips (Kater/Readiness,
// ggf. Schmerz) und optionale Notiz. Read-only wie V1. Zeigt zunaechst die
// juengsten Eintraege, „Mehr laden" blendet jeweils eine weitere Seite ein.
export function BodyHistoryCard({
  history,
}: {
  history: BodyHistEntry[];
}): React.ReactElement {
  const { sichtbar, hatMehr, mehrLaden } = useMehrLaden(history);

  if (!history.length) {
    return (
      <div className="rounded-[18px] bg-card p-5 text-[14px] text-muted-foreground shadow-card">
        Noch kein Eintrag. Stelle oben deine Werte ein und tippe „Eintragen".
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-[18px] bg-card shadow-card">
        {sichtbar.map((e) => (
          <div
            key={e.date}
            className="border-t border-[#f0f0f2] p-[14px_16px] first:border-t-0 min-[960px]:p-[14px_18px]"
          >
            <div className="mb-2 text-[14px] font-semibold text-foreground">
              {e.dateLabel}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {e.chips.map((c, i) => (
                <span
                  key={i}
                  className="rounded-pill bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/70"
                >
                  {c}
                </span>
              ))}
            </div>
            {e.notes && (
              <div className="mt-2 text-[12px] text-muted-foreground italic">
                {e.notes}
              </div>
            )}
          </div>
        ))}
      </div>
      {hatMehr && <LoadMore onClick={mehrLaden} />}
    </div>
  );
}
