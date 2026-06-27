import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackLink } from "@/components/ui/back-link";
import { PageReveal } from "@/components/ui/page-reveal";
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
import { totalWeeks, type JourneyPhaseInput } from "@/lib/journey";
import { buildPeriodization, type PeriodizationData } from "@/lib/periodization";

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

  const active = journeyQ.data ?? null;
  const hasActive = active !== null;
  const title = hasActive ? "Vorlage wechseln" : "Journey wählen";

  const start = (template: JourneyTemplateWithPhases): void => {
    void actions.createFromTemplate(template).then(() => {
      void navigate({ to: "/" });
    });
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
    <PageReveal>
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
  );
}
