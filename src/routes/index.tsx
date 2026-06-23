import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { ScoreBadge } from "@/components/ui/score-badge";
import { TwoColumn } from "@/components/ui/two-column";
import { JourneyStrip } from "@/components/training/JourneyStrip";
import { RecommendedWorkout } from "@/components/training/RecommendedWorkout";
import { YogaEntryModal } from "@/components/training/YogaEntryModal";
import { useTrainingOverview } from "@/hooks/useTrainingOverview";
import { useLiveSession } from "@/hooks/useLiveSession";

// Startroute = Training (wie V1). Reine Uebersichts-/Empfehlungsseite: zeigt an
// und fuehrt hin, fuehrt aber nicht durch (gefuehrte Session = Phase 11).
export const Route = createFileRoute("/")({
  component: TrainingPage,
});

function TrainingPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, data } = useTrainingOverview();
  const { openStartWorkout } = useLiveSession();
  // Skill-Durchfuehrung folgt in Lieferung 5; bis dahin Platzhalter-Hinweis.
  const [note, setNote] = useState<string | null>(null);
  const [yogaOpen, setYogaOpen] = useState(false);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Training" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <PageHeader title="Training" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  const placeholder = (): void =>
    setNote("Die geführte Skill-Einheit folgt in Lieferung 5.");

  const startWorkout = (w: {
    id: string;
    name: string;
    exerciseNames: string[];
  }): void =>
    openStartWorkout({
      templateId: w.id,
      title: w.name,
      exercisesPreview: w.exerciseNames,
    });

  const mainColumn = (
    <>
      <Section eyebrow="Heute empfohlen">
        {data.hero ? (
          <RecommendedWorkout
            name={data.hero.name}
            score={data.hero.score}
            lifts={data.hero.lifts}
            excluded={data.hero.excluded}
            onStart={() => startWorkout(data.hero!)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Workout-Vorlagen vorhanden.
          </p>
        )}
        {note != null && (
          <p className="mt-3 text-[13px] text-muted-foreground">{note}</p>
        )}
      </Section>

      {data.others.length > 0 && (
        <Section eyebrow="Weitere Workouts">
          <List bordered>
            {data.others.map((w) => (
              <ListRow
                key={w.id}
                title={"Workout " + w.name}
                subtitle={w.lifts}
                trailing={<ScoreBadge value={w.score} />}
                chevron
                disabled={w.excluded}
                onClick={w.excluded ? undefined : () => startWorkout(w)}
              />
            ))}
          </List>
        </Section>
      )}
    </>
  );

  const sideColumn = (
    <>
      <Section eyebrow="Aktive Skills">
        <List bordered>
          {data.skills.length > 0 ? (
            data.skills.map((sk) => (
              <ListRow
                key={sk.id}
                title={sk.name}
                subtitle={sk.subtitle}
                chevron
                disabled={sk.gated}
                onClick={sk.gated ? undefined : placeholder}
              />
            ))
          ) : (
            <ListRow
              title="Noch kein aktiver Skill"
              subtitle="Im Skills-Tab aktivieren"
              chevron
              onClick={() => navigate({ to: "/skills" })}
            />
          )}
        </List>
      </Section>

      <Section eyebrow="Yoga">
        <List>
          <ListRow
            title="Yoga-Einheit eintragen"
            subtitle={data.yogaSubtitle}
            chevron
            onClick={() => setYogaOpen(true)}
          />
        </List>
      </Section>
    </>
  );

  return (
    <div>
      <PageHeader title="Training" date={data.date} />
      <div className="flex flex-col gap-[18px] min-[960px]:gap-[26px]">
        {data.journey && (
          <JourneyStrip
            title={data.journey.title}
            subtitle={data.journey.subtitle}
            filled={data.journey.filled}
            total={data.journey.total}
          />
        )}
        <TwoColumn main={mainColumn} side={sideColumn} />
      </div>
      <YogaEntryModal open={yogaOpen} onClose={() => setYogaOpen(false)} />
    </div>
  );
}
