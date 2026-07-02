import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { Button } from "@/components/ui/button";
import { JourneyChip } from "@/components/ui/journey-chip";
import { WorkoutIcon } from "@/components/ui/training-icons";
import { useWorkoutsView } from "@/hooks/useWorkoutsView";
import { useTemplateActions } from "@/hooks/useTemplateActions";

// Workouts – Bibliothek. Zeigt die aktiven Workouts als Liste (Name, Uebungen
// in Kurzform, Hinweis "journey-faehig"); tippen fuehrt auf die lesende
// Detailseite. Unter der Liste "Neues Workout" (Editor), darunter ein
// ausklappbarer Archiv-Abschnitt mit Reaktivieren.
export const Route = createFileRoute("/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, workouts, archived } = useWorkoutsView();
  const { reactivateWorkout, isSaving } = useTemplateActions();
  const [showArchived, setShowArchived] = useState(false);

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

  return (
    <div>
      <PageHeader title="Workouts" />
      <PageReveal>
        <Section>
          {workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine aktiven Workouts. Lege unten ein neues an.
            </p>
          ) : (
            <List bordered>
              {workouts.map((w) => (
                <ListRow
                  key={w.id}
                  title={w.name}
                  subtitle={w.summary || "Keine Übungen"}
                  leading={<WorkoutIcon />}
                  trailing={
                    w.journeyCapable ? (
                      <JourneyChip label="Journey-fähig" />
                    ) : undefined
                  }
                  chevron
                  ariaLabel={w.name + " bearbeiten"}
                  onClick={() =>
                    void navigate({
                      to: "/workouts/$templateId/bearbeiten",
                      params: { templateId: w.id },
                    })
                  }
                />
              ))}
            </List>
          )}
        </Section>

        <Button asChild variant="outline" className="mt-5 w-full">
          <Link to="/workouts/neu">
            <Plus className="size-[18px]" />
            Neues Workout
          </Link>
        </Button>

        {archived.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center gap-1.5 text-[13px] font-semibold text-muted-foreground"
            >
              {showArchived ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              Archivierte ({archived.length})
            </button>

            {showArchived && (
              <div className="mt-3">
                <List bordered>
                  {archived.map((w) => (
                    <ListRow
                      key={w.id}
                      title={w.name}
                      subtitle={w.summary || "Keine Übungen"}
                      leading={<WorkoutIcon />}
                      trailing={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => void reactivateWorkout(w.id)}
                        >
                          Reaktivieren
                        </Button>
                      }
                    />
                  ))}
                </List>
              </div>
            )}
          </div>
        )}
      </PageReveal>
    </div>
  );
}
