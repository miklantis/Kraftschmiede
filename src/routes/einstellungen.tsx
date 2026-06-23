import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { AccountCard } from "@/components/settings/AccountCard";
import { EngineSettings } from "@/components/settings/EngineSettings";
import { TimerSettings } from "@/components/settings/TimerSettings";
import { ScoreReference } from "@/components/settings/ScoreReference";
import { Datenstand } from "@/components/Datenstand";
import { V1Import } from "@/components/V1Import";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/einstellungen")({
  component: EinstellungenPage,
});

// Einstellungen-Seite im iOS-Stil: gruppierte Listen, Beschriftung links,
// Steuerelement rechts. Oben das Konto-/Verbindungs-Panel, darunter auf dem
// Desktop ein zweispaltiges Raster der Bereiche (mobil ein Stapel). Inventar
// (Stangen/Scheiben/Geraete) folgt in Lieferung 2; Export/Import-Politur in
// Phase 12 - daher steht der V1-Import vorerst unter "Daten".
function EinstellungenPage(): React.ReactElement {
  const settingsQuery = useSettings();
  const settings = settingsQuery.data ?? null;

  return (
    <div>
      <PageHeader title="Einstellungen" />

      <div className="flex flex-col gap-7">
        <AccountCard />

        <div className="grid grid-cols-1 items-start gap-7 min-[960px]:grid-cols-2 min-[960px]:gap-x-[26px]">
          <Section eyebrow="Engine & Einheiten">
            {settings ? (
              <EngineSettings settings={settings} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {settingsQuery.isError
                  ? "Einstellungen konnten nicht geladen werden."
                  : "Wird geladen …"}
              </p>
            )}
          </Section>

          <Section eyebrow="Pausen-Timer">
            {settings ? (
              <TimerSettings settings={settings} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {settingsQuery.isError
                  ? "Einstellungen konnten nicht geladen werden."
                  : "Wird geladen …"}
              </p>
            )}
          </Section>

          <Section eyebrow="Score ↔ RIR ↔ RPE">
            <ScoreReference />
          </Section>

          <Section eyebrow="Daten">
            <div className="flex flex-col gap-3">
              <Datenstand />
              <V1Import />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
