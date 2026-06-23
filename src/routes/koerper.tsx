import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { RestBanner } from "@/components/body/RestBanner";
import { BodySoreMap } from "@/components/body/BodySoreMap";
import { BodyStateCard } from "@/components/body/BodyStateCard";
import { BodyHistoryCard } from "@/components/body/BodyHistoryCard";
import { BodyMeasureCard } from "@/components/body/BodyMeasureCard";
import { BodyMeasureList } from "@/components/body/BodyMeasureList";
import { BodyImportCard } from "@/components/body/BodyImportCard";
import { useBodyView } from "@/hooks/useBodyView";
import { useComposition } from "@/hooks/useComposition";

// Koerper-Seite. Zwei Haelften: links das taegliche Befinden (Empfehlungs-
// Banner volle Breite oben, dann Muskelkater-Figur, Eingabe, Verlauf), rechts
// die Koerpermessung (Metrik-Chart, Mess-Liste, JSON-Import). Mobil ein Stapel
// in derselben Reihenfolge (Befinden zuerst, dann Messung), wie V1.
export const Route = createFileRoute("/koerper")({
  component: KoerperPage,
});

function KoerperPage(): React.ReactElement {
  const view = useBodyView();
  const compQuery = useComposition();
  const comp = compQuery.data ?? [];

  if (view.isLoading) {
    return (
      <div>
        <PageHeader title="Körper" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (view.isError) {
    return (
      <div>
        <PageHeader title="Körper" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {view.error instanceof Error ? ": " + view.error.message : "."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Körper" />
      <RestBanner advice={view.advice} className="mb-6 min-[960px]:mb-[26px]" />

      <div className="grid grid-cols-1 items-start gap-y-7 min-[960px]:grid-cols-[1.05fr_1fr] min-[960px]:gap-x-[26px]">
        {/* Befinden */}
        <div className="flex min-w-0 flex-col gap-7">
          <Section eyebrow="Muskelkater">
            <BodySoreMap values={view.soreValues} info={view.soreInfo} />
          </Section>

          <Section eyebrow="Körperzustand heute">
            <BodyStateCard today={view.today} hasToday={view.hasToday} />
          </Section>

          <Section eyebrow="Verlauf">
            <BodyHistoryCard history={view.history} />
          </Section>
        </div>

        {/* Messung */}
        <div className="flex min-w-0 flex-col gap-4">
          <Section eyebrow="Körpermessung">
            <BodyMeasureCard rows={comp} />
          </Section>
          <BodyMeasureList rows={comp} />
          <BodyImportCard />
        </div>
      </div>
    </div>
  );
}
