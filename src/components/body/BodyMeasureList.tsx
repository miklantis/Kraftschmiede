import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Section } from "@/components/ui/section";
import { List } from "@/components/ui/list";
import { BodyMeasureDialog } from "./BodyMeasureDialog";
import { LoadMore } from "@/components/ui/load-more";
import { useMehrLaden } from "@/hooks/useMehrLaden";
import { compChips } from "@/lib/composition";
import { longDateYearDE } from "@/lib/format";
import type { CompositionRow } from "@/schemas";

// Abschnitt "Messungen": je Messung Datum + Chips der vorhandenen Werte,
// neueste zuerst. Die Zeilen sitzen in einer Karte mit Trennlinien
// (gemeinsamer List-Baustein) und tragen keine Aktions-Buttons: die ganze
// Zeile ist tippbar und oeffnet das Mess-Popup, Bearbeiten und Loeschen
// passieren dort. Der Knopf zum Hinzufuegen sitzt ganz unten unter der Liste
// und ist optisch an den "Meilenstein hinzufuegen"-Knopf angeglichen.
// Ohne Messung nur der Hinzufuegen-Knopf plus ein kurzer Hinweis.
export function BodyMeasureList({
  rows,
}: {
  rows: CompositionRow[];
}): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<CompositionRow | null>(null);
  const { sichtbar, hatMehr, mehrLaden } = useMehrLaden(rows);

  const belegteDaten = rows.map((r) => r.date);

  const oeffnenNeu = (): void => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const oeffnenBearbeiten = (r: CompositionRow): void => {
    setEditRow(r);
    setDialogOpen(true);
  };

  return (
    <Section eyebrow="Messungen">
      <div className="flex flex-col gap-2.5">
        {rows.length === 0 ? (
          <div className="rounded-[16px] bg-card px-[18px] py-[22px] text-center text-sm text-muted-foreground shadow-card">
            Noch keine Messung. Trage deine erste von Hand ein.
          </div>
        ) : (
          <List>
            {sichtbar.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-label={longDateYearDE(e.date) + " bearbeiten"}
                onClick={() => oeffnenBearbeiten(e)}
                className="flex w-full cursor-pointer items-center gap-3 border-t border-muted p-[14px_16px] text-left transition-colors first:border-t-0 hover:bg-primary/5 min-[960px]:p-[14px_18px]"
              >
                <div className="min-w-0 flex-1">
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
                <ChevronRight className="size-[18px] flex-none text-foreground-subtle" />
              </button>
            ))}
          </List>
        )}

        {hatMehr && <LoadMore onClick={mehrLaden} />}

        <button
          type="button"
          onClick={oeffnenNeu}
          className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95"
        >
          <Plus className="size-4" />
          Messung hinzufügen
        </button>
      </div>

      <BodyMeasureDialog
        open={dialogOpen}
        row={editRow}
        belegteDaten={belegteDaten}
        onClose={() => setDialogOpen(false)}
      />
    </Section>
  );
}
