import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { SkillCatalogCard } from "@/components/skills/SkillCatalogCard";
import { MySkillCard } from "@/components/skills/MySkillCard";
import { useSkillsView } from "@/hooks/useSkillsView";
import { useSkillActions } from "@/hooks/useSkillActions";

// Skills: Verwaltung (kein Trainieren – das kommt mit der Live-Session in
// Phase 11). Oben der Katalog zum Hinzufuegen, darunter die aktiven Skills mit
// Phasen, Zaehler, Equipment-Tor und den manuellen Aktionen. Einspaltig wie
// Journey; der Katalog ist auf Desktop zweispaltig.
export const Route = createFileRoute("/skills")({
  component: SkillsPage,
});

function SkillsPage(): React.ReactElement {
  const { isLoading, isError, error, catalog, mine } = useSkillsView();
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
      <div className="flex flex-col gap-7 min-[960px]:gap-8">
        <Section eyebrow="Meine Skills">
          {mine.length === 0 ? (
            <div className="rounded-[16px] bg-card p-5 text-[14px] leading-[1.5] text-muted-foreground shadow-card">
              Noch kein Skill aktiv. Füge unten einen aus dem Katalog hinzu –
              danach erscheint er hier mit Phase, Fortschritt und Aktionen.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {mine.map((m) => (
                <MySkillCard
                  key={m.skillId}
                  model={m}
                  busy={actions.isBusy}
                  onDeactivate={() => void actions.deactivate(m.skillId)}
                  onRegress={() => void actions.regress(m.skillId)}
                  onReset={() => void actions.reset(m.skillId)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section eyebrow="Katalog">
          <div className="grid grid-cols-1 gap-3.5 min-[960px]:grid-cols-2">
            {catalog.map((c) => (
              <SkillCatalogCard
                key={c.skillId}
                model={c}
                busy={actions.isBusy}
                onAdd={() => void actions.activate(c.skillId)}
              />
            ))}
          </div>
        </Section>

        {actions.error instanceof Error && (
          <p className="text-sm text-danger">{actions.error.message}</p>
        )}
      </div>
    </div>
  );
}
