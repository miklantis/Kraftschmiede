import { useState } from "react";
import { Plus } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { List, ListRow } from "@/components/ui/list";
import { ZeitraumFormModal } from "@/components/history/ZeitraumFormModal";
import { useZeitraeume } from "@/hooks/useZeitraeume";
import { zeitraumLabel, zeitraumSpanne, ZEITRAUM_FARBE } from "@/lib/zeitraeume";
import type { ZeitraumRow } from "@/schemas";

// Sektion „Zeiträume“ im Verlauf-Block, direkt nach „Letzte Einheiten“. Zeigt die
// angelegten Marker in derselben Listen-Optik wie die Workouts (List/ListRow):
// Typ-Punkt vorne, Name/Typ als Titel, Spanne/Typ/Notiz als Unterzeile, Chevron
// rechts. Die ganze Zeile ist tippbar und oeffnet das Formular-Popup; Bearbeiten
// und Loeschen passieren dort, die Liste selbst traegt keine Aktions-Buttons.

export function ZeitraeumeSection(): React.ReactElement {
  const { isLoading, isError, data } = useZeitraeume();
  const [formOpen, setFormOpen] = useState(false);
  const [editZeitraum, setEditZeitraum] = useState<ZeitraumRow | null>(null);

  const oeffnenNeu = (): void => {
    setEditZeitraum(null);
    setFormOpen(true);
  };

  const oeffnenBearbeiten = (z: ZeitraumRow): void => {
    setEditZeitraum(z);
    setFormOpen(true);
  };

  const untertitel = (z: ZeitraumRow): string =>
    zeitraumSpanne(z.start_datum, z.end_datum) +
    (z.name ? " · " + zeitraumLabel(z.typ) : "") +
    (z.notiz ? " · " + z.notiz : "");

  const inhalt = (): React.ReactElement => {
    if (isLoading) {
      return <p className="text-sm text-muted-foreground">Wird geladen …</p>;
    }
    if (isError || !data) {
      return (
        <p className="text-sm text-danger">
          Die Zeiträume konnten nicht geladen werden.
        </p>
      );
    }
    return (
      <>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Zeiträume. Lege z. B. eine Fastenphase an.
          </p>
        ) : (
          <List bordered>
            {data.map((z) => (
              <ListRow
                key={z.id}
                title={z.name ?? zeitraumLabel(z.typ)}
                subtitle={untertitel(z)}
                leading={
                  <span
                    aria-hidden
                    className={
                      "block size-3 flex-none rounded-full " +
                      ZEITRAUM_FARBE[z.typ]
                    }
                  />
                }
                chevron
                ariaLabel={(z.name ?? zeitraumLabel(z.typ)) + " bearbeiten"}
                onClick={() => oeffnenBearbeiten(z)}
              />
            ))}
          </List>
        )}

        <Button variant="outline" className="mt-5 w-full" onClick={oeffnenNeu}>
          <Plus className="size-[18px]" />
          Zeitraum anlegen
        </Button>
      </>
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
