import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { List, ListRow } from "@/components/ui/list";
import { LoadMore } from "@/components/ui/load-more";
import { ScoreDot } from "@/components/ui/score-dot";
import { useMehrLaden } from "@/hooks/useMehrLaden";
import { longDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VerlaufRow } from "@/hooks/useExerciseDetail";

// Trainingsverlauf einer Uebung: je Einheit eine Zeile mit Datum, bestem Satz
// und Ø-Score. Ein Tipp klappt die einzelnen Arbeitssaetze auf – dort
// steht je Satz die Leistung und rechts der Score als runde Zahl (gleiche Optik
// wie die Score-Skala in den Einstellungen). So laesst sich nachvollziehen, wie
// hart die Einheit war und an welchem Satz es kippte.
//
// Der dezente Nachlade-Pfeil (LoadMore) blendet jeweils eine weitere Seite ein;
// den Zaehler haelt useMehrLaden (reine Anzeige, die Daten liegen vollstaendig
// vor). Aufgeklappte Zeilen merkt sich das Set offen ueber ihren Index.
//
// Beim Auf- und Zuklappen waechst bzw. schrumpft die Zeile. Damit die Seite
// dabei nicht unter dem Finger wegspringt, wird die Bildschirmposition der
// angetippten Zeile gemerkt und direkt nach dem Umbau um die Differenz
// nachgescrollt – die Zeile bleibt also genau da stehen, wo sie war.
export function ExerciseHistoryList({
  verlauf,
}: {
  verlauf: VerlaufRow[];
}): React.ReactElement {
  const liste = useMehrLaden(verlauf);
  const [offen, setOffen] = useState<ReadonlySet<number>>(new Set());

  // Zeilen-Elemente je Index, dazu die vor dem Umschalten gemerkte Position.
  const zeilen = useRef(new Map<number, HTMLElement | null>());
  const gemerkt = useRef<{ index: number; top: number } | null>(null);

  const umschalten = (i: number): void => {
    const el = zeilen.current.get(i);
    gemerkt.current =
      el != null ? { index: i, top: el.getBoundingClientRect().top } : null;
    setOffen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  useLayoutEffect(() => {
    const merk = gemerkt.current;
    gemerkt.current = null;
    if (merk == null) return;
    const el = zeilen.current.get(merk.index);
    if (el == null) return;
    const diff = el.getBoundingClientRect().top - merk.top;
    if (Math.abs(diff) > 0.5) window.scrollBy(0, diff);
  }, [offen]);

  if (verlauf.length === 0) {
    return (
      <p className="text-[15px] text-muted-foreground">
        Noch keine absolvierte Session mit dieser Übung.
      </p>
    );
  }

  return (
    <>
      <List bordered>
        {liste.sichtbar.map((r, i) => {
          const aufklappbar = r.saetze.length > 0;
          const istOffen = aufklappbar && offen.has(i);
          return (
            <ListRow
              key={i}
              title={longDateShort(r.date)}
              subtitle={r.line || undefined}
              ariaLabel={
                aufklappbar
                  ? "Sätze vom " + longDateShort(r.date) + " ein-/ausblenden"
                  : undefined
              }
              onClick={aufklappbar ? () => umschalten(i) : undefined}
              align={istOffen ? "top" : "center"}
              elementRef={(el) => {
                if (el == null) zeilen.current.delete(i);
                else zeilen.current.set(i, el);
              }}
              trailing={
                <div className="flex items-center gap-2">
                  {r.right && (
                    <span className="font-mono text-[14px] text-muted-foreground tabular-nums">
                      {r.right}
                    </span>
                  )}
                  {aufklappbar && (
                    <ChevronDown
                      className={cn(
                        "size-[18px] flex-none text-foreground-subtle transition-transform",
                        istOffen && "rotate-180",
                      )}
                    />
                  )}
                </div>
              }
              footer={
                istOffen ? (
                  <div className="mt-1 flex flex-col gap-1.5 border-t border-muted pt-2.5">
                    {r.saetze.map((s, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2.5 text-[14px]"
                      >
                        <span className="w-4 flex-none font-mono text-[12px] text-foreground-subtle tabular-nums">
                          {j + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-foreground tabular-nums">
                          {s.line}
                        </span>
                        {s.score != null && (
                          <ScoreDot value={s.score} size="sm" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : undefined
              }
            />
          );
        })}
      </List>
      {liste.hatMehr && <LoadMore onClick={liste.mehrLaden} className="mt-1" />}
    </>
  );
}
