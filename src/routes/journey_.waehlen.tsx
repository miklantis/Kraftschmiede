import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackLink } from "@/components/ui/back-link";
import { PageReveal } from "@/components/ui/page-reveal";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { TypeToConfirm } from "@/components/ui/type-to-confirm";
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
import { useSessions } from "@/hooks/useSessions";
import { useSettings } from "@/hooks/useSettings";
import { useLiveSession } from "@/hooks/useLiveSession";
import { derivePhaseContext } from "@/lib/phaseContext";
import {
  buildJourneySwitchStand,
  journeySwitchBlockReason,
} from "@/lib/journeySwitch";
import { todayISO } from "@/lib/format";
import {
  buildTemplatePhaseViews,
  totalWeeks,
  type JourneyPhaseInput,
  type PhaseView,
} from "@/lib/journey";
import { buildPeriodization, type PeriodizationData } from "@/lib/periodization";
import {
  filterCopyableAssignments,
  type WorkoutExerciseInfo,
  type WorkoutInput,
} from "@/lib/workouts";

// Vorlagen-Waehler: Zurueck-Knopf, optional Namensfeld der aktiven Journey,
// dann die Vorlagen als Karten. Eine Vorlage waehlen legt eine neue aktive
// Journey an und fuehrt zurueck ins Training (wie V1). Optik aus V1 (jr-pick).
//
// Laeuft bereits eine Journey, ist der Klick auf eine Karte kein Start mehr,
// sondern ein Wechsel - und der endet die laufende Journey unwiderruflich.
// Darum liegt davor der Bestaetigungs-Dialog (TypeToConfirm, Issue #257): er
// zeigt den Stand der laufenden Journey und verlangt, ihren Namen abzutippen.
// Ohne aktive Journey (erste Journey oder direkt nach dem Abschluss) gibt es
// nichts zu verlieren - dort startet der Klick weiterhin direkt.
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
  const sessionsQ = useSessions();
  const settingsQ = useSettings();
  const live = useLiveSession();

  // Uebernahme-Angebot beim Journey-Wechsel: nach dem Anlegen der neuen Journey
  // gehalten, solange das Ja/Nein-Overlay offen ist.
  const [offer, setOffer] = useState<{
    newJourneyId: string;
    copyableIds: string[];
  } | null>(null);
  const [finishing, setFinishing] = useState(false);
  // Vorlage, deren Wechsel gerade bestaetigt werden soll (null = kein Dialog).
  const [switchTo, setSwitchTo] = useState<JourneyTemplateWithPhases | null>(
    null,
  );

  const active = journeyQ.data ?? null;
  const hasActive = active !== null;
  const title = hasActive ? "Vorlage wechseln" : "Journey wählen";

  // Stand der laufenden Journey fuer den Wechsel-Dialog: Woche, Phase und
  // Startdatum kommen aus derselben Stelle wie ueberall (derivePhaseContext).
  const stand = useMemo(() => {
    if (active === null) return null;
    const ctx = derivePhaseContext(
      active,
      sessionsQ.data ?? [],
      settingsQ.data?.weekly_frequency_target || 3,
      todayISO(),
    );
    return buildJourneySwitchStand({
      name: active.name,
      globalWeek: ctx.placement?.globalWeek ?? 1,
      totalWeeks: totalWeeks(active.phases),
      phaseName: ctx.phase?.name ?? null,
      startDate: active.start_date,
    });
  }, [active, sessionsQ.data, settingsQ.data]);

  // Eine noch nicht beendete Einheit sperrt den Wechsel.
  const blockReason = journeySwitchBlockReason(live.session);

  const errorText =
    actions.error == null
      ? null
      : "Aktion fehlgeschlagen" +
        (actions.error instanceof Error ? ": " + actions.error.message : ".");

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

  // Legt die neue Journey an und fuehrt den bisherigen Ablauf unveraendert
  // weiter. Der Bestaetigungs-Dialog schliesst erst, wenn das Anlegen durch
  // ist - schlaegt es fehl (z. B. kein Netz), bleibt er offen und zeigt den
  // Fehler, statt still zu verschwinden.
  const start = (template: JourneyTemplateWithPhases): void => {
    void actions
      .createFromTemplate(template)
      .then(async ({ newJourneyId, previousJourneyId }) => {
        setSwitchTo(null);
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
        // Fehler wird ueber actions.error angezeigt - auf der Seite und im
        // offen bleibenden Dialog.
      });
  };

  // Klick auf eine Vorlagenkarte: ohne aktive Journey gibt es nichts zu
  // verlieren und es startet direkt. Sonst immer erst der Dialog - auch bei
  // einer Journey, die gerade erst gestartet wurde.
  const pick = (template: JourneyTemplateWithPhases): void => {
    if (!hasActive) {
      start(template);
      return;
    }
    setSwitchTo(template);
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

  if (
    templatesQ.isLoading ||
    journeyQ.isLoading ||
    sessionsQ.isLoading ||
    settingsQ.isLoading
  ) {
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
    phases: PhaseView[];
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
      loadFactor: p.load_factor ?? 1,
      weekPlan: p.week_plan,
    }));
    // Ohne "jetzt"-Marker ist die Gesamtwoche bedeutungslos; 1 als neutraler Wert.
    const periodization = buildPeriodization(phaseInputs, 1);
    return {
      template: t,
      periodization,
      // Phasen-Ablauf der Vorlage, damit sichtbar ist, wie die Journey gebaut ist.
      phases: buildTemplatePhaseViews(phaseInputs),
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

      {hasActive && (
        <div className="mb-6 rounded-[14px] border border-primary/30 bg-primary/10 px-4 py-3 text-[13px] leading-[1.55] text-foreground min-[960px]:mb-7">
          Gerade läuft die Journey <strong className="font-semibold">{active.name}</strong>.
          Eine andere Vorlage zu wählen beendet sie – sie wandert ins Archiv und
          kann nicht fortgesetzt werden.
        </div>
      )}

      {errorText !== null && (
        <p className="mb-4 text-sm text-danger">{errorText}</p>
      )}

      <PageReveal>
        <div data-reveal-flatten className="grid grid-cols-1 gap-[18px]">
          {models.map(({ template, card, periodization, phases }) => (
            <TemplateCard
              key={card.id}
              model={card}
              periodization={periodization}
              phases={phases}
              busy={actions.isCreating}
              switching={hasActive}
              onStart={() => pick(template)}
            />
          ))}
        </div>
      </PageReveal>

      {stand !== null && (
        <TypeToConfirm
          open={switchTo !== null}
          onClose={() => setSwitchTo(null)}
          title="Journey wechseln?"
          word={stand.name}
          confirmLabel="Journey wechseln"
          onConfirm={() => {
            if (switchTo !== null) start(switchTo);
          }}
          busy={actions.isCreating}
          blockedReason={blockReason}
          error={errorText}
        >
          <div className="mb-4 rounded-[14px] bg-muted px-4 py-3">
            <div className="text-[15px] font-bold text-foreground">
              {stand.name}
            </div>
            <div className="mt-1 text-[13px] leading-[1.5] text-muted-foreground">
              {stand.week}
              {stand.phase !== null && <> · {stand.phase}</>}
            </div>
            {stand.start !== null && (
              <div className="text-[13px] leading-[1.5] text-muted-foreground">
                {stand.start}
              </div>
            )}
          </div>
          <p className="mb-4 text-[14px] leading-[1.55] text-muted-foreground">
            Sie wandert ins Archiv und kann nicht fortgesetzt werden. Stattdessen
            startet{" "}
            <strong className="font-semibold text-foreground">
              {switchTo?.name ?? ""}
            </strong>{" "}
            in Woche 1.
          </p>
        </TypeToConfirm>
      )}

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
