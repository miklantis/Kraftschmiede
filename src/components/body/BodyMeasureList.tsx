import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Section } from "@/components/ui/section";
import { BodyMeasureDialog } from "./BodyMeasureDialog";
import { useCompositionActions } from "@/hooks/useCompositionActions";
import { compChips } from "@/lib/composition";
import { longDateYearDE } from "@/lib/format";
import type { CompositionRow } from "@/schemas";

// Abschnitt "Messungen": je Messung Datum + Chips der vorhandenen Werte,
// neueste zuerst. Der Knopf zum Hinzufuegen sitzt ganz unten unter der Liste
// und ist optisch an den "Meilenstein hinzufuegen"-Knopf angeglichen. Je Zeile
// Bearbeiten und Loeschen. Anlegen und Bearbeiten laufen ueber das gemeinsame
// Mess-Popup; Loeschen ist zweistufig (kurze Rueckfrage in der Zeile), weil es
// sofort greift. Ohne Messung nur der Hinzufuegen-Knopf plus ein kurzer Hinweis.
export function BodyMeasureList({
  rows,
}: {
  rows: CompositionRow[];
}): React.ReactElement {
  const { remove, isPending } = useCompositionActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<CompositionRow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const belegteDaten = rows.map((r) => r.date);

  const oeffnenNeu = (): void => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const oeffnenBearbeiten = (r: CompositionRow): void => {
    setConfirmId(null);
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
          <div className="overflow-hidden rounded-[18px] bg-card shadow-card">
            {rows.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 border-t border-[#f0f0f2] p-[14px_16px] first:border-t-0 min-[960px]:p-[14px_18px]"
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

                {confirmId === e.id ? (
                  <div className="flex flex-none items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        void remove(e.id);
                        setConfirmId(null);
                      }}
                      className="rounded-control px-2.5 py-1.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-control px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-none items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Bearbeiten"
                      onClick={() => oeffnenBearbeiten(e)}
                      className="flex size-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="size-[18px]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Löschen"
                      onClick={() => setConfirmId(e.id)}
                      className="flex size-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-[18px]" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
