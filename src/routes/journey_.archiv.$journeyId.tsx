import { createFileRoute } from "@tanstack/react-router";
import { BackLink } from "@/components/ui/back-link";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { JourneyHeadCard } from "@/components/journey/JourneyHeadCard";
import { PhaseList } from "@/components/journey/PhaseList";
import { JourneyReviewSessions } from "@/components/journey/JourneyReviewSessions";
import { JourneyCoachExport } from "@/components/journey/JourneyCoachExport";
import { useJourneyReview } from "@/hooks/useJourneyReview";

// Rueckschau einer abgeschlossenen Journey: eigenstaendige Vollseite (entschachtelt
// mit _), aufgerufen aus dem Archiv auf der Journey-Seite. Aufbau wie der
// Vorlagen-Waehler: Zurueck-Link oben links, darunter der Inhalt. Bewusst
// schlicht - Kopf, Phasen und die absolvierten Einheiten je Phase.
export const Route = createFileRoute("/journey_/archiv/$journeyId")({
  component: JourneyArchiveDetailPage,
});

function JourneyArchiveDetailPage(): React.ReactElement {
  const { journeyId } = Route.useParams();
  const { isLoading, isError, error, notFound, data } =
    useJourneyReview(journeyId);

  const back = <BackLink to="/journey" label="Journey" />;

  if (isLoading) {
    return (
      <div>
        {back}
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        {back}
        <p className="text-sm text-danger">
          Journey konnte nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div>
        {back}
        <p className="text-sm text-muted-foreground">
          Diese Journey gibt es nicht mehr.
        </p>
      </div>
    );
  }

  return (
    <div>
      {back}
      <PageReveal className="flex flex-col gap-7 min-[960px]:gap-8">
        <JourneyHeadCard name={data.name} metaLine={data.metaLine} />
        <JourneyCoachExport journeyId={journeyId} />
        {data.phases.length > 0 && (
          <Section eyebrow="Phasen · Ablauf">
            <PhaseList phases={data.phases} />
          </Section>
        )}
        <JourneyReviewSessions groups={data.review.groups} />
      </PageReveal>
    </div>
  );
}
