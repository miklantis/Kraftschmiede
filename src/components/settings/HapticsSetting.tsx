import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import { Switch } from "@/components/ui/switch";
import { useUpdateSettings } from "@/hooks/useUpdateSettings";
import type { SettingsRow } from "@/schemas";

// Haptik: kurze taktile Rueckmeldung beim Tippen (Hauptnavigation, Satz-Haken).
// Liegt technisch im jsonb-Feld timers neben Ton/Vibration; fehlt der Wert in
// einer aelteren Datenzeile, gilt „an" als Standard (haptics ?? true).
export function HapticsSetting({
  settings,
}: {
  settings: SettingsRow;
}): React.ReactElement {
  const { update } = useUpdateSettings();
  const t = settings.timers;

  return (
    <SettingsGroup>
      <SettingRow
        label="Haptisches Tippen"
        description="Kurze Rückmeldung beim Tippen."
      >
        <Switch
          label="Haptisches Tippen"
          checked={t.haptics ?? true}
          onChange={(on) => void update({ timers: { ...t, haptics: on } })}
        />
      </SettingRow>
    </SettingsGroup>
  );
}
