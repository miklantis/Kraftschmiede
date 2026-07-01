import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { ScoreBadge } from "@/components/ui/score-badge";
import { TwoColumn } from "@/components/ui/two-column";
import { PageReveal } from "@/components/ui/page-reveal";
import { JourneyStrip } from "@/components/training/JourneyStrip";
import { UpdateBanner } from "@/components/training/UpdateBanner";
import { RecommendedWorkout } from "@/components/training/RecommendedWorkout";
import { YogaEntryModal } from "@/components/training/YogaEntryModal";
import { HistorySection } from "@/components/history/HistorySection";
import { useTrainingOverview } from "@/hooks/useTrainingOverview";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useLiveBuilder } from "@/hooks/useLiveBuilder";
import { useSkillLiveBuilder } from "@/hooks/useSkillLiveBuilder";

// Startroute = Training (wie V1). Reine Uebersichts-/Empfehlungsseite: zeigt an
// und fuehrt hin. Workout- und Skill-Start oeffnen das Live-Start-Popup; die
// gefuehrte Durchfuehrung selbst liegt im global gemounteten Live-Panel.
export const Route = createFileRoute("/")({
  component: TrainingPage,
});

function TrainingPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, data } = useTrainingOverview();
  const { openStartWorkout, openStartSkill } = useLiveSession();
  const builder = useLiveBuilder();
  const skillBuilder = useSkillLiveBuilder();
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

  const startSkill = (skillId: string): void => {
    const built = skillBuilder.buildSkill(skillId);
    if (!built) {
      setNote("Die Skill-Einheit konnte nicht aufgebaut werden.");
      return;
    }
    openStartSkill({
      skillId: built.skillId,
      skillName: built.skillName,
      phaseIndex: built.phaseIndex,
      mastered: built.mastered,
      exercises: built.exercises,
    });
  };

  const startWorkout = (w: {
    id: string;
    name: string;
    exerciseNames: string[];
  }): void => {
    const built = builder.buildWorkout(w.id);
    if (!built) {
      setNote("Die Einheit konnte nicht aufgebaut werden.");
      return;
    }
    openStartWorkout({
      templateId: w.id,
      title: w.name,
      journeyId: builder.journeyId,
      phaseId: builder.phaseId,
      entries: built.entries,
      generalWarmup: built.generalWarmup,
    });
  };

  const trainingColumn = (
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
        {data.libraryFallbackHint && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Keine Workouts dieser Journey zugewiesen – Empfehlung aus der ganzen
            Bibliothek.
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
                title={w.name}
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
                onClick={sk.gated ? undefined : () => startSkill(sk.id)}
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
      <PageReveal className="flex flex-col gap-[18px] min-[960px]:gap-[26px]">
        <UpdateBanner />
        {data.journey && (
          <JourneyStrip
            title={data.journey.title}
            subtitle={data.journey.subtitle}
            filled={data.journey.filled}
            total={data.journey.total}
          />
        )}
        <TwoColumn main={trainingColumn} side={<HistorySection />} />
      </PageReveal>
      <YogaEntryModal open={yogaOpen} onClose={() => setYogaOpen(false)} />
    </div>
  );
}
