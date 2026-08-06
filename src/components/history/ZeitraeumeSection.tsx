import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { ZeitraumFormModal } from "@/components/history/ZeitraumFormModal";
import { useZeitraeume } from "@/hooks/useZeitraeume";
import { useZeitraumActions } from "@/hooks/useZeitraumActions";
import { zeitraumLabel, zeitraumSpanne, ZEITRAUM_FARBE } from "@/lib/zeitraeume";
import type { ZeitraumRow } from "@/schemas";

// Sektion „Zeiträume“ im Verlauf-Block, direkt nach „Letzte Einheiten“. Zeigt die
// angelegten Marker (Typ-Punkt, Beschriftung, Spanne, Notiz) und erlaubt Anlegen,
// Bearbeiten und Loeschen. Loeschen ist zweistufig (kurzes Nachfragen in der
// Zeile), weil es ohne weitere Verknuepfung sofort greift. Anlegen/Bearbeiten
// laeuft ueber das gemeinsame Formular-Popup.

export function ZeitraeumeSection(): React.ReactElement {
  const { isLoading, isError, data } = useZeitraeume();
  const { remove, isPending } = useZeitraumActions();
  const [formOpen, setFormOpen] = useState(false);
  const [editZeitraum, setEditZeitraum] = useState<ZeitraumRow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const oeffnenNeu = (): void => {
    setEditZeitraum(null);
    setFormOpen(true);
  };

  const oeffnenBearbeiten = (z: ZeitraumRow): void => {
    setConfirmId(null);
    setEditZeitraum(z);
    setFormOpen(true);
  };

  const inhalt = (): React.ReactElement => {
    if (isLoading) {
      return (
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      );
    }
    if (isError || !data) {
      return (
        <p className="text-sm text-danger">
          Die Zeiträume konnten nicht geladen werden.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-2.5">
        <Button variant="outline" className="w-full" onClick={oeffnenNeu}>
          <Plus className="size-4" />
          Zeitraum anlegen
        </Button>

        {data.length === 0 ? (
          <div className="rounded-[16px] bg-card px-[18px] py-[22px] text-center text-sm text-muted-foreground shadow-card">
            Noch keine Zeiträume. Lege z. B. eine Fastenphase an.
          </div>
        ) : (
          data.map((z) => (
            <div
              key={z.id}
              className="flex items-center gap-3 rounded-[16px] bg-card px-4 py-3 shadow-card"
            >
              <span
                aria-hidden
                className={
                  "size-2.5 flex-none rounded-full " + ZEITRAUM_FARBE[z.typ]
                }
              />
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-foreground">
                  {zeitraumLabel(z.typ)}
                </div>
                <div className="truncate text-[13px] text-muted-foreground">
                  {zeitraumSpanne(z.start_datum, z.end_datum)}
                  {z.notiz ? " · " + z.notiz : ""}
                </div>
              </div>

              {confirmId === z.id ? (
                <div className="flex flex-none items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      void remove(z.id);
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
                    onClick={() => oeffnenBearbeiten(z)}
                    className="flex size-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="Löschen"
                    onClick={() => setConfirmId(z.id)}
                    className="flex size-9 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <Section eyebrow="Zeiträume">
      {inhalt()}
      <ZeitraumFormModal
        open={formOpen}
        zeitraum={editZeitraum}
        onClose={() => setFormOpen(false)}
      />
    </Section>
  );
}
