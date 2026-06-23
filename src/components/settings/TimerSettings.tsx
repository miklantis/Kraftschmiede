import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { useUpdateSettings } from "@/hooks/useUpdateSettings";
import type { SettingsRow } from "@/schemas";

// Pausen-Timer: Satz- und Uebungspause in Sekunden plus drei Schalter
// (automatisch starten, Ton, Vibration). Alle Werte liegen im jsonb-Feld
// timers; jede Aenderung mischt das vollstaendige Objekt neu. Eingestellt wird
// hier, genutzt wird es spaeter in der Live-Session (Phase 11).
export function TimerSettings({
  settings,
}: {
  settings: SettingsRow;
}): React.ReactElement {
  const { update } = useUpdateSettings();
  const t = settings.timers;

  return (
    <SettingsGroup>
      <SettingRow label="Satz-Pause">
        <NumberField
          ariaLabel="Satz-Pause"
          value={t.setRestSec}
          step={5}
          min={0}
          suffix="Sek."
          onCommit={(n) => {
            if (n != null) void update({ timers: { ...t, setRestSec: n } });
          }}
        />
      </SettingRow>

      <SettingRow label="Übungs-Pause">
        <NumberField
          ariaLabel="Übungs-Pause"
          value={t.exerciseRestSec}
          step={5}
          min={0}
          suffix="Sek."
          onCommit={(n) => {
            if (n != null)
              void update({ timers: { ...t, exerciseRestSec: n } });
          }}
        />
      </SettingRow>

      <SettingRow label="Pause automatisch starten">
        <Switch
          label="Pause automatisch starten"
          checked={t.autoStart}
          onChange={(on) => void update({ timers: { ...t, autoStart: on } })}
        />
      </SettingRow>

      <SettingRow label="Ton am Pausenende">
        <Switch
          label="Ton am Pausenende"
          checked={t.sound}
          onChange={(on) => void update({ timers: { ...t, sound: on } })}
        />
      </SettingRow>

      <SettingRow label="Vibration am Pausenende">
        <Switch
          label="Vibration am Pausenende"
          checked={t.vibrate}
          onChange={(on) => void update({ timers: { ...t, vibrate: on } })}
        />
      </SettingRow>

      <SettingRow label="Bildschirm wachhalten">
        <Switch
          label="Bildschirm wachhalten"
          checked={t.wakeLock ?? false}
          onChange={(on) => void update({ timers: { ...t, wakeLock: on } })}
        />
      </SettingRow>
    </SettingsGroup>
  );
}
