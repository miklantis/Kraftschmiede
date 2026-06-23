import { SettingsGroup, SettingRow } from "@/components/ui/setting-list";
import { Select } from "@/components/ui/select";
import { NumberField } from "@/components/ui/number-field";
import { useUpdateSettings } from "@/hooks/useUpdateSettings";
import type { SettingsRow } from "@/schemas";

// Engine & Einheiten: 1RM-Formel, Wochen-Frequenzziel, Schrittweite, die beiden
// Erholungsfenster (Squat/Deadlift in Stunden) und die Gewichtseinheit. Werte
// kommen als geladene Einstellungs-Zeile herein; Aenderungen gehen ueber den
// Schreib-Hook zurueck. Die jsonb-Erholungsfenster werden hier vollstaendig
// gemischt (vorhandene Werte erhalten, nur das geaenderte Feld ersetzt).
const RM_OPTIONS = [
  { value: "mean", label: "Mittelwert" },
  { value: "brzycki", label: "Brzycki" },
  { value: "epley", label: "Epley" },
  { value: "wathan", label: "Wathan" },
];
const UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];

export function EngineSettings({
  settings,
}: {
  settings: SettingsRow;
}): React.ReactElement {
  const { update } = useUpdateSettings();
  const rec = settings.recovery_windows;

  return (
    <SettingsGroup>
      <SettingRow label="1RM-Formel">
        <Select
          ariaLabel="1RM-Formel"
          value={settings.rm_formula}
          options={RM_OPTIONS}
          onChange={(v) =>
            void update({ rm_formula: v as SettingsRow["rm_formula"] })
          }
        />
      </SettingRow>

      <SettingRow label="Wochen-Frequenzziel">
        <NumberField
          ariaLabel="Wochen-Frequenzziel"
          value={settings.weekly_frequency_target}
          step={1}
          min={1}
          suffix="×/Woche"
          onCommit={(n) => {
            if (n != null) void update({ weekly_frequency_target: n });
          }}
        />
      </SettingRow>

      <SettingRow label="Schrittweite">
        <NumberField
          ariaLabel="Schrittweite"
          value={settings.weight_step}
          step={0.25}
          min={0}
          suffix={settings.unit}
          onCommit={(n) => {
            if (n != null) void update({ weight_step: n });
          }}
        />
      </SettingRow>

      <SettingRow label="Erholung Squat">
        <NumberField
          ariaLabel="Erholung Squat"
          value={rec.squat ?? null}
          step={1}
          min={0}
          suffix="h"
          onCommit={(n) => {
            if (n != null)
              void update({ recovery_windows: { ...rec, squat: n } });
          }}
        />
      </SettingRow>

      <SettingRow label="Erholung Deadlift">
        <NumberField
          ariaLabel="Erholung Deadlift"
          value={rec.deadlift ?? null}
          step={1}
          min={0}
          suffix="h"
          onCommit={(n) => {
            if (n != null)
              void update({ recovery_windows: { ...rec, deadlift: n } });
          }}
        />
      </SettingRow>

      <SettingRow label="Einheit">
        <Select
          ariaLabel="Einheit"
          value={settings.unit}
          options={UNIT_OPTIONS}
          onChange={(v) => void update({ unit: v as SettingsRow["unit"] })}
        />
      </SettingRow>
    </SettingsGroup>
  );
}
