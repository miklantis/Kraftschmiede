import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import { MessgeraetDialog } from "./MessgeraetDialog";
import { messungenJeGeraet, messungenText } from "@/lib/messgeraete";
import type { CompositionRow, MeasurementDeviceRow } from "@/schemas";

// Einstellungen - Messgeraete der Koerpermessungen. Je Geraet eine tippbare
// Zeile mit der Anzahl Messungen darunter (oeffnet das Popup zum
// Umbenennen/Loeschen), darunter der Knopf zum Hinzufuegen wie bei Zeitraeumen
// und Messungen. Ohne Geraet ein kurzer Hinweis. Die Liste startet leer; es
// gibt keinen Seed. Die Anzahl Messungen sperrt im Popup das Loeschen.
export function Messgeraete({
  geraete,
  messungen,
}: {
  geraete: MeasurementDeviceRow[];
  messungen: CompositionRow[];
}): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGeraet, setEditGeraet] = useState<MeasurementDeviceRow | null>(
    null,
  );
  const anzahl = messungenJeGeraet(messungen);

  const oeffnenNeu = (): void => {
    setEditGeraet(null);
    setDialogOpen(true);
  };

  const oeffnenBearbeiten = (g: MeasurementDeviceRow): void => {
    setEditGeraet(g);
    setDialogOpen(true);
  };

  return (
    <>
      <SettingsGroup>
        {geraete.length === 0 ? (
          <SettingRow
            label={
              <span className="text-muted-foreground">
                Noch kein Messgerät.
              </span>
            }
          />
        ) : (
          geraete.map((g) => (
            <SettingRow
              key={g.id}
              label={g.name}
              description={messungenText(anzahl.get(g.id) ?? 0)}
              onClick={() => oeffnenBearbeiten(g)}
            >
              <ChevronRight className="size-[18px] text-foreground-subtle" />
            </SettingRow>
          ))
        )}
      </SettingsGroup>

      <Button variant="outline" className="mt-3 w-full" onClick={oeffnenNeu}>
        <Plus className="size-[18px]" />
        Gerät hinzufügen
      </Button>

      <MessgeraetDialog
        open={dialogOpen}
        geraet={editGeraet}
        geraete={geraete}
        anzahlMessungen={editGeraet ? (anzahl.get(editGeraet.id) ?? 0) : 0}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
