import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import { MessgeraetDialog } from "./MessgeraetDialog";
import type { MeasurementDeviceRow } from "@/schemas";

// Einstellungen - Messgeraete der Koerpermessungen. Je Geraet eine tippbare
// Zeile (oeffnet das Popup zum Umbenennen/Loeschen), darunter der Knopf zum
// Hinzufuegen wie bei Zeitraeumen und Messungen. Ohne Geraet ein kurzer
// Hinweis. Die Liste startet leer; es gibt keinen Seed.
export function Messgeraete({
  geraete,
}: {
  geraete: MeasurementDeviceRow[];
}): React.ReactElement {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGeraet, setEditGeraet] = useState<MeasurementDeviceRow | null>(
    null,
  );

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
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
