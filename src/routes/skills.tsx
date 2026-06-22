import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { SkillCard } from "@/components/skills/SkillCard";
import { useSkillsView } from "@/hooks/useSkillsView";
import { useSkillActions } from "@/hooks/useSkillActions";

// Skills: Verwaltung (kein Trainieren - das kommt mit der Live-Session in
// Phase 11). Eine Liste aller Skills; jede Karte hat einen Schalter zum
// Aktivieren/Deaktivieren und ist aufklappbar (Phasen, Zaehler, Equipment-Tor,
// bei aktiven Skills die manuellen Aktionen). Einspaltig wie Journey.
export const Route = createFileRoute("/skills")({
  component: SkillsPage,
});

function SkillsPage(): React.ReactElement {
  const { isLoading, isError, error, skills } = useSkillsView();
  const actions = useSkillActions();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Skills" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Skills" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Skills" />
      <Section eyebrow="Skills">
        <div className="flex flex-col gap-2.5">
          {skills.map((s) => (
            <SkillCard
              key={s.skillId}
              model={s}
              busy={actions.isBusy}
              onToggle={(next) =>
                void (next
                  ? actions.activate(s.skillId)
                  : actions.deactivate(s.skillId))
              }
              onRegress={() => void actions.regress(s.skillId)}
              onReset={() => void actions.reset(s.skillId)}
            />
          ))}
        </div>
        {actions.error instanceof Error && (
          <p className="mt-3 text-sm text-danger">{actions.error.message}</p>
        )}
      </Section>
    </div>
  );
}
