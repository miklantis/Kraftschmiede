import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackLink } from "@/components/ui/back-link";
import { PageReveal } from "@/components/ui/page-reveal";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import {
  TemplateCard,
  type TemplateCardModel,
} from "@/components/journey/TemplateCard";
import { JourneyNameEdit } from "@/components/journey/JourneyNameEdit";
import {
  useJourneyTemplates,
  type JourneyTemplateWithPhases,
} from "@/hooks/useJourneyTemplates";
import { useActiveJourney } from "@/hooks/useJourney";
import { useJourneyActions } from "@/hooks/useJourneyActions";
import { useTemplates } from "@/hooks/useTemplates";
import { useExercises } from "@/hooks/useExercises";
import { totalWeeks, type JourneyPhaseInput } from "@/lib/journey";
import { buildPeriodization, type PeriodizationData } from "@/lib/periodization";
import {
  filterCopyableAssignments,
  type WorkoutExerciseInfo,
  type WorkoutInput,
} from "@/lib/workouts";

// Vorlagen-Waehler: Zurueck-Knopf, optional Namensfeld der aktiven Journey,
// dann die Vorlagen als Karten. Eine Vorlage waehlen legt eine neue aktive
// Journey an und fuehrt zurueck ins Training (wie V1). Optik aus V1 (jr-pick).
export const Route = createFileRoute("/journey_/waehlen")({
  component: JourneyPickerPage,
});

const INTRO =
  "Eine Journey gibt dir über mehrere Wochen einen roten Faden mit aufeinander aufbauenden Phasen. Wähle die, die zu deinem Ziel passt.";

function JourneyPickerPage(): React.ReactElement {
  const navigate = useNavigate();
  const templatesQ = useJourneyTemplates();
  const journeyQ = useActiveJourney();
  const actions = useJourneyActions();
  const workoutsQ = useTemplates();
  const exercisesQ = useExercises();

  // Uebernahme-Angebot beim Journey-Wechsel: nach dem Anlegen der neuen Journey
  // gehalten, solange das Ja/Nein-Overlay offen ist.
  const [offer, setOffer] = useState<{
    newJourneyId: string;
    copyableIds: string[];
  } | null>(null);
  const [finishing, setFinishing] = useState(false);

  const active = journeyQ.data ?? null;
  const hasActive = active !== null;
  const title = hasActive ? "Vorlage wechseln" : "Journey wählen";

  const goHome = (): void => {
    void navigate({ to: "/" });
  };

  // Zuweisbarkeits-Nachschlagewerk fuer die Uebernahme (aktiv + journey-faehig).
  const buildCopyable = (previousIds: string[]): string[] => {
    if (previousIds.length === 0) return [];
    if (!workoutsQ.data || !exercisesQ.data) return [];
    const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
    for (const e of exercisesQ.data) {
      lookup[e.id] = { name: e.name, profile: e.profile };
    }
    return filterCopyableAssignments(
      workoutsQ.data as WorkoutInput[],
      lookup,
      new Set(previousIds),
    );
  };

  const start = (template: JourneyTemplateWithPhases): void => {
    void actions
      .createFromTemplate(template)
      .then(async ({ newJourneyId, previousJourneyId }) => {
        if (previousJourneyId === null) {
          goHome();
          return;
        }
        const previousIds = await actions.readAssignments(previousJourneyId);
        const copyableIds = buildCopyable(previousIds);
        if (copyableIds.length === 0) {
          goHome();
          return;
        }
        // Angebot zeigen; erst Ja/Nein entscheidet ueber die Uebernahme.
        setOffer({ newJourneyId, copyableIds });
      })
      .catch(() => {
        // Fehler beim Anlegen wird ueber actions.error angezeigt.
      });
  };

  const adopt = (): void => {
    if (offer === null) return;
    setFinishing(true);
    void actions
      .copyAssignments(offer.newJourneyId, offer.copyableIds)
      .finally(() => {
        setFinishing(false);
        setOffer(null);
        goHome();
      });
  };

  const skip = (): void => {
    setOffer(null);
    goHome();
  };

  const back = <BackLink to="/journey" label="Journey" />;

  if (templatesQ.isLoading || journeyQ.isLoading) {
    return (
      <div>
        {back}
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (templatesQ.isError) {
    return (
      <div>
        {back}
        <p className="text-sm text-danger">
          Vorlagen konnten nicht geladen werden
          {templatesQ.error instanceof Error
            ? ": " + templatesQ.error.message
            : "."}
        </p>
      </div>
    );
  }

  const templates = templatesQ.data ?? [];
  const models: Array<{
    template: JourneyTemplateWithPhases;
    card: TemplateCardModel;
    periodization: PeriodizationData;
  }> = templates.map((t) => {
    const phaseInputs: JourneyPhaseInput[] = t.phases.map((p) => ({
      name: p.name,
      focus: p.focus,
      weeks: p.weeks,
      setsStart: p.sets_start,
      setsEnd: p.sets_end,
      deloadWeek: p.deload_week,
      repTargetMin: p.rep_target_min,
      repTargetMax: p.rep_target_max,
    }));
    // Ohne "jetzt"-Marker ist die Gesamtwoche bedeutungslos; 1 als neutraler Wert.
    const periodization = buildPeriodization(phaseInputs, 1);
    return {
      template: t,
      periodization,
      card: {
        id: t.id,
        name: t.name,
        duration: `${totalWeeks(t.phases)} Wochen · ${t.phases.length} ${
          t.phases.length === 1 ? "Phase" : "Phasen"
        }`,
        tagline: t.tagline ?? "",
        forWhom: t.for_whom ?? "",
        summary: t.summary ?? "",
        active: active !== null && t.id === active.source_template_id,
      },
    };
  });

  return (
    <>
      {back}

      {active !== null && (
        <JourneyNameEdit
          name={active.name}
          busy={actions.isRenaming}
          onCommit={(next) => void actions.rename(active.id, next)}
        />
      )}

      <h1 className="mb-3 text-[28px] font-bold tracking-[-0.4px] text-foreground min-[960px]:mb-4 min-[960px]:text-[34px] min-[960px]:tracking-[-0.5px]">
        {title}
      </h1>
      <p className="mb-6 max-w-[680px] text-[13px] leading-[1.55] text-muted-foreground min-[960px]:mb-7 min-[960px]:text-[14.5px]">
        {INTRO}
      </p>

      {actions.error != null && (
        <p className="mb-4 text-sm text-danger">
          Aktion fehlgeschlagen
          {actions.error instanceof Error
            ? ": " + actions.error.message
            : "."}
        </p>
      )}

      <PageReveal>
        <div data-reveal-flatten className="grid grid-cols-1 gap-[18px]">
          {models.map(({ template, card, periodization }) => (
            <TemplateCard
              key={card.id}
              model={card}
              periodization={periodization}
              busy={actions.isCreating}
              onStart={() => start(template)}
            />
          ))}
        </div>
      </PageReveal>

      <Overlay
        open={offer !== null}
        onClose={skip}
        title="Workouts übernehmen?"
      >
        <p className="mb-5 text-[14px] leading-[1.55] text-muted-foreground">
          {offer !== null && offer.copyableIds.length === 1
            ? "Die vorherige Journey hatte ein zugewiesenes Workout. In die neue Journey übernehmen?"
            : `Die vorherige Journey hatte ${offer?.copyableIds.length ?? 0} zugewiesene Workouts. In die neue Journey übernehmen?`}{" "}
          Du kannst die Zuordnung später jederzeit anpassen.
        </p>
        <div className="flex flex-col gap-2.5">
          <Button onClick={adopt} disabled={finishing}>
            Übernehmen
          </Button>
          <Button variant="outline" onClick={skip} disabled={finishing}>
            Leer starten
          </Button>
        </div>
      </Overlay>
    </>
  );
}
