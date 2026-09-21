import { createFileRoute } from "@tanstack/react-router";
import { BackLink } from "@/components/ui/back-link";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { JourneyHeadCard } from "@/components/journey/JourneyHeadCard";
import { PeriodizationChart } from "@/components/journey/PeriodizationChart";
import { PhaseList } from "@/components/journey/PhaseList";
import { JourneyArchiveWorkouts } from "@/components/journey/JourneyArchiveWorkouts";
import { JourneyExercisesSection } from "@/components/journey/JourneyExercisesSection";
import { JourneyCoachExport } from "@/components/journey/JourneyCoachExport";
import { useJourneyReview } from "@/hooks/useJourneyReview";

// Archiv einer abgeschlossenen Journey: eigenstaendige Vollseite (entschachtelt
// mit _), aufgerufen aus dem Archiv auf der Journey-Seite. Aufbau wie der
// Vorlagen-Waehler: Zurueck-Link oben links, darunter der Inhalt.
//
// Die Abfolge ist dieselbe wie auf der laufenden Journey-Seite (Issue #485):
// Kopf, Periodisierungskurve, Phasen, Workouts, Uebungen. Was die Journey
// gebracht hat, steht damit an derselben Stelle wie waehrend sie lief.
//
// Drei Unterschiede, alle bewusst: die Kurve zeigt keine "jetzt"-Marke
// (showNow={false}), die Workouts sind ein Schnappschuss aus den absolvierten
// Einheiten statt einer Bedienliste, und die Uebungskacheln zeigen statt der
// Coach-Vorgabe das Testergebnis dieser Journey - entschieden wird das nicht
// hier, sondern am Kennzeichen der Journey (useJourneyExercises).
export const Route = createFileRoute("/journey_/archiv/$journeyId")({
  component: JourneyArchiveDetailPage,
});

function JourneyArchiveDetailPage(): React.ReactElement {
  const { journeyId } = Route.useParams();
  const { isLoading, isError, error, notFound, data, journey } =
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
        <Section eyebrow="Abgeschlossene Journey">
          <JourneyHeadCard name={data.name} metaLine={data.metaLine} />
        </Section>
        {data.periodization.weeks.length > 0 && (
          <Section eyebrow="Periodisierung">
            <PeriodizationChart data={data.periodization} showNow={false} />
          </Section>
        )}
        {data.phases.length > 0 && (
          <Section eyebrow="Phasen · Ablauf">
            <PhaseList phases={data.phases} />
          </Section>
        )}
        <JourneyCoachExport journeyId={journeyId} />
        <JourneyArchiveWorkouts workouts={data.workouts} />
        <JourneyExercisesSection journey={journey} />
      </PageReveal>
    </div>
  );
}
