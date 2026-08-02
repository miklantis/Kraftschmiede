import { Section } from "@/components/ui/section";
import { PinnedChartTile } from "./PinnedChartTile";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import type { PinnedCard } from "@/hooks/usePinnedView";

// Angeheftet-Sektion ganz oben auf der Uebungsliste (V1 ub-pinned). Zeigt die
// angehefteten Verlaufs-Charts als flache Kacheln. Desktop zweispaltiges
// Raster, Handy einspaltige Liste (V1 ub-pin-grid/ub-pin-list). Leer -> kurzer
// Hinweistext (wie V1). Verwaltet wird ueber den Umschalter auf der
// Detailseite; hier gibt es bewusst kein Sortieren/Entfernen (V1-Paritaet).

export interface PinnedChartsProps {
  cards: readonly PinnedCard[];
  unit: string;
}

export function PinnedCharts({
  cards,
  unit,
}: PinnedChartsProps): React.ReactElement {
  const isDesktop = useIsDesktop();
  const chartHeight = isDesktop ? 150 : 120;

  return (
    <Section eyebrow="Angeheftet">
      {cards.length === 0 ? (
        <p className="text-[14px] leading-[1.5] text-muted-foreground">
          Noch nichts angeheftet. Öffne eine Übung und tippe beim Diagramm auf
          „Anheften“ – es erscheint dann hier oben.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[960px]:grid-cols-2 min-[960px]:gap-4">
          {cards.map((c) => (
            <PinnedChartTile
              key={c.key}
              card={c}
              unit={unit}
              height={chartHeight}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
