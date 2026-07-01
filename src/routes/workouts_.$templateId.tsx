import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { useWorkoutDetail } from "@/hooks/useWorkoutDetail";

// Workout-Detail (lesend). Eigenstaendige Vollseite (entschachtelt mit _). Zeigt
// den Namen, den Hinweis zur Journey-Faehigkeit und die enthaltenen Uebungen
// nach Rolle gruppiert (Haupt -> Assistenz -> Core). Bearbeiten folgt in
// Lieferung 3.
export const Route = createFileRoute("/workouts_/$templateId")({
  component: WorkoutDetailPage,
});

function WorkoutDetailPage(): React.ReactElement {
  const { templateId } = Route.useParams();
  const { isLoading, isError, error, workout } = useWorkoutDetail(templateId);

  if (isLoading) {
    return (
      <div>
        <BackLink to="/workouts" label="Workouts" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <BackLink to="/workouts" label="Workouts" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div>
        <BackLink to="/workouts" label="Workouts" />
        <p className="text-sm text-muted-foreground">
          Dieses Workout wurde nicht gefunden.
        </p>
      </div>
    );
  }

  return (
    <>
      <BackLink to="/workouts" label="Workouts" />
      <PageHeader title={workout.name} className="mb-3 min-[960px]:mb-4" />
      <div className="-mt-2 mb-5 flex flex-wrap items-center gap-2 min-[960px]:mb-6">
        {workout.journeyCapable ? (
          <span className="rounded-[20px] bg-foreground px-2.5 py-1 text-[13px] font-medium text-background">
            journey-fähig
          </span>
        ) : (
          <span className="rounded-[20px] bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">
            nicht journey-fähig
          </span>
        )}
      </div>

      <PageReveal>
        {workout.groups.map((g) => (
          <Section
            key={g.role}
            eyebrow={g.label}
            className="mb-5 min-[960px]:mb-6"
          >
            <List bordered>
              {g.exercises.map((name, i) => (
                <ListRow key={g.role + "-" + i} title={name} />
              ))}
            </List>
          </Section>
        ))}
      </PageReveal>
    </>
  );
}
