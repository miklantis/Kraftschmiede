import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { useWorkoutsView } from "@/hooks/useWorkoutsView";

// Workouts – Bibliothek (lesend). Zeigt die aktiven Workouts als Liste: Name,
// enthaltene Uebungen in Kurzform, Hinweis "journey-faehig". Tippen fuehrt auf
// die Detailseite. Anlegen/Bearbeiten/Archivieren folgt in Lieferung 3.
export const Route = createFileRoute("/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, workouts } = useWorkoutsView();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Workouts" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Workouts" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div>
        <PageHeader title="Workouts" />
        <p className="text-sm text-muted-foreground">
          Noch keine Workouts vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Workouts" />
      <PageReveal>
        <Section>
          <List bordered>
            {workouts.map((w) => (
              <ListRow
                key={w.id}
                title={w.name}
                subtitle={w.summary || "Keine Übungen"}
                trailing={
                  w.journeyCapable ? (
                    <span className="rounded-[20px] bg-foreground px-2.5 py-1 text-[12px] font-medium text-background">
                      journey-fähig
                    </span>
                  ) : undefined
                }
                chevron
                ariaLabel={w.name + " öffnen"}
                onClick={() =>
                  void navigate({
                    to: "/workouts/$templateId",
                    params: { templateId: w.id },
                  })
                }
              />
            ))}
          </List>
        </Section>
      </PageReveal>
    </div>
  );
}
