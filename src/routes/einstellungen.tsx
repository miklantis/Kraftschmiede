import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { SettingsGroup } from "@/components/ui/setting-list";
import { AccountCard } from "@/components/settings/AccountCard";
import { AppVersionCard } from "@/components/settings/AppVersionCard";
import { EngineSettings } from "@/components/settings/EngineSettings";
import { TimerSettings } from "@/components/settings/TimerSettings";
import { ScoreReference } from "@/components/settings/ScoreReference";
import { InventoryBars } from "@/components/settings/InventoryBars";
import {
  InventoryPlates,
  InventoryKettlebells,
} from "@/components/settings/InventoryWeights";
import { InventoryEquipment } from "@/components/settings/InventoryEquipment";
import { DataExport } from "@/components/settings/DataExport";
import { DataRestore } from "@/components/settings/DataRestore";
import { AppReset } from "@/components/settings/AppReset";
import { CoachExport } from "@/components/settings/CoachExport";
import { useSettings } from "@/hooks/useSettings";
import {
  useBars,
  usePlates,
  useKettlebells,
  useEquipment,
} from "@/hooks/useInventory";

export const Route = createFileRoute("/einstellungen")({
  component: EinstellungenPage,
});

// Einstellungen-Seite im iOS-Stil: gruppierte Listen, Beschriftung links,
// Steuerelement rechts. Oben das Konto-/Verbindungs-Panel, darunter auf dem
// Desktop ein zweispaltiges Raster der Bereiche (mobil ein Stapel). Reihenfolge
// wie V1: Engine, Timer, Inventar (Stangen/Scheiben/Kettlebells/Geraete), Score,
// dann Daten in zwei Karten: "Sicherung" (Export/Wiederherstellen) und
// "Coaching". Ganz unten der App-Version-Block (wie ueblich am Seitenende).
// Plate-Loader bekommt keine eigene UI - das Inventar fuettert den schon
// portierten Engine-Loader.
function EinstellungenPage(): React.ReactElement {
  const settingsQuery = useSettings();
  const settings = settingsQuery.data ?? null;
  const unit = settings?.unit ?? "kg";

  const bars = useBars().data ?? [];
  const plates = usePlates().data ?? [];
  const kettlebells = useKettlebells().data ?? [];
  const equipment = useEquipment().data ?? [];

  const placeholder = (
    <p className="text-sm text-muted-foreground">
      {settingsQuery.isError
        ? "Einstellungen konnten nicht geladen werden."
        : "Wird geladen …"}
    </p>
  );

  return (
    <div>
      <PageHeader title="Einstellungen" hideAccount />

      <PageReveal className="flex flex-col gap-7">
        <AccountCard />

        <div
          data-reveal-flatten
          className="columns-1 gap-x-[26px] [&>*]:mb-7 [&>*]:break-inside-avoid min-[960px]:columns-2"
        >
          <Section eyebrow="Engine & Einheiten">
            {settings ? <EngineSettings settings={settings} /> : placeholder}
          </Section>

          <Section eyebrow="Pausen-Timer">
            {settings ? <TimerSettings settings={settings} /> : placeholder}
          </Section>

          <Section eyebrow="Inventar · Stangen">
            <InventoryBars bars={bars} unit={unit} />
          </Section>

          <Section eyebrow="Inventar · Scheiben · pro Seite (kg)">
            <InventoryPlates plates={plates} />
          </Section>

          <Section eyebrow="Inventar · Kettlebells · kg">
            <InventoryKettlebells kettlebells={kettlebells} />
          </Section>

          {equipment.length > 0 && (
            <Section eyebrow="Inventar · Geräte (Skills)">
              <InventoryEquipment equipment={equipment} />
            </Section>
          )}

          <Section eyebrow="Score ↔ RIR ↔ RPE">
            <ScoreReference />
          </Section>

          <Section eyebrow="Daten · Sicherung">
            <SettingsGroup>
              <div className="p-4">
                <DataExport />
              </div>
              <div className="p-4">
                <DataRestore />
              </div>
              <div className="p-4">
                <AppReset />
              </div>
            </SettingsGroup>
          </Section>

          <Section eyebrow="Daten · Coaching">
            <SettingsGroup>
              <div className="p-4">
                <CoachExport />
              </div>
            </SettingsGroup>
          </Section>
        </div>

        <Section eyebrow="App">
          <AppVersionCard />
        </Section>
      </PageReveal>
    </div>
  );
}
