import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import type { BarItem } from "@/hooks/useInventory";
import { fmtKg } from "@/lib/format";
import { barBuildLabel } from "@/lib/labels";

// Inventar - Stangen. Fester Satz Langhantel-Typen: Name links mit der Bauart
// darunter ("lang · gerade"), Gewicht rechts. Das Set ist abgeschlossen - kein
// Loeschen, kein Hinzufuegen in der Oberflaeche; der Bestand wird ueber die
// Datenbank gepflegt (feste Stangen mit key), und dasselbe gilt fuer die Bauart.
// Optik wie Scheiben/Kettlebells: alles in einer Karte. unit kommt aus den
// Einstellungen.
export function InventoryBars({
  bars,
  unit,
}: {
  bars: BarItem[];
  unit: string;
}): React.ReactElement {
  return (
    <SettingsGroup>
      {bars.length === 0 ? (
        <SettingRow
          label={<span className="text-muted-foreground">Keine Stangen.</span>}
        />
      ) : (
        bars.map((b) => (
          <SettingRow
            key={b.id}
            label={b.name}
            description={barBuildLabel(b.bar_length, b.bar_shape)}
          >
            <span className="font-mono text-sm text-muted-foreground tabular-nums">
              {fmtKg(b.weight)} {unit}
            </span>
          </SettingRow>
        ))
      )}
    </SettingsGroup>
  );
}
