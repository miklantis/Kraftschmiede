import { plateBreakdown } from "@/engine";
import { fmtNum } from "@/lib/format";

// Scheiben pro Seite als Pillen (1:1 aus V1 klSubChips/.kl-chip): pro Scheibe
// eine Pille mit Rahmen. `total` ist das Gesamtgewicht inkl. Stange; daraus
// rechnet die Engine die Belegung je Seite. Rest > 0 -> roter Warn-Chip (nicht
// exakt ladbar); nur Stange -> nichts (wie V1). Ist der zugehoerige Satz aktiv,
// faerben sich die Chips gruen (wie V1 `.kl-set.is-active + .kl-sub .kl-chip`).
export function PlateChips({
  total,
  barWeight,
  plates,
  active = false,
}: {
  total: number;
  barWeight: number;
  plates: number[];
  active?: boolean;
}): React.ReactElement | null {
  const pb = plateBreakdown(total, barWeight, plates);

  const wrap = "flex flex-wrap items-center gap-2 px-1.5 pt-2";
  const chipBase =
    "inline-flex rounded-full border px-3 py-[5px] font-mono text-[13px] font-semibold";

  if (pb.remainder > 0) {
    return (
      <div className={wrap}>
        <span className={chipBase + " border-danger/30 bg-danger/12 text-danger"}>
          Rest {fmtNum(pb.remainder * 2)}
        </span>
      </div>
    );
  }

  if (!pb.plates.length) return null;

  const tone = active
    ? " border-primary/30 bg-primary/[0.14] text-primary"
    : " border-border bg-muted text-foreground";

  const chips: string[] = [];
  pb.plates.forEach((pp) => {
    for (let i = 0; i < pp.count; i++) chips.push(fmtNum(pp.plate));
  });

  return (
    <div className={wrap}>
      {chips.map((c, i) => (
        <span key={i} className={chipBase + tone}>
          {c}
        </span>
      ))}
    </div>
  );
}
