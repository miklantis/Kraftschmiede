import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Prose } from "@/components/ui/prose";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { SkillCard } from "@/components/skills/SkillCard";
import { useSkillsView } from "@/hooks/useSkillsView";
import { useSkillActions } from "@/hooks/useSkillActions";

// Skills: Verwaltung (kein Trainieren - das kommt mit der Live-Session in
// Phase 11). Eine Liste aller Skills; jeder Skill ist immer aktiv und
// aufklappbar (Phasen, Zaehler, Equipment-Tor, manuelle Aktionen). Einspaltig
// wie Journey.
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
      <PageReveal>
        <Prose>
          Eine Skill ist ein langfristiges Ziel aus mehreren aufbauenden Übungen.
          Du arbeitest dich von Vorstufen bis zur Meisterform vor – etwa einem
          sauberen Klimmzug oder 10×3 Pull-ups. Schritt für Schritt, bis die
          Zielübung in fester Technik sitzt.
        </Prose>
        <Section eyebrow="Skills">
          <div className="flex flex-col gap-2.5">
            {skills.map((s) => (
              <SkillCard
                key={s.skillId}
                model={s}
                busy={actions.isBusy}
                onRegress={() => void actions.regress(s.skillId)}
                onReset={() => void actions.reset(s.skillId)}
              />
            ))}
          </div>
          {actions.error instanceof Error && (
            <p className="mt-3 text-sm text-danger">{actions.error.message}</p>
          )}
        </Section>
      </PageReveal>
    </div>
  );
}
