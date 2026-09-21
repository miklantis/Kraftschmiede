import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { Button } from "@/components/ui/button";
import { JourneyChip } from "@/components/ui/journey-chip";
import { SearchField } from "@/components/ui/search-field";
import { WorkoutIcon } from "@/components/ui/training-icons";
import { filterWorkoutRows, SUCHE_AB_WORKOUTS } from "@/lib/workouts";
import { useWorkoutsView } from "@/hooks/useWorkoutsView";

// Workouts – Bibliothek. Zeigt die Workouts als Liste (Name, Uebungen in
// Kurzform, Hinweis "journey-faehig"); tippen fuehrt auf die lesende
// Detailseite. Unter der Liste "Neues Workout" (Editor). Geloescht wird im
// Editor, nicht hier – den frueheren Archiv-Abschnitt gibt es nicht mehr
// (Issue #491).
//
// Ab SUCHE_AB_WORKOUTS Workouts steht ganz oben ein Suchfeld (Schwelle geteilt
// mit dem Auswahl-Popup der Journey-Seite). Gefiltert wird ueber den
// Workout-Namen. Der Suchbegriff ist reiner Ansichtszustand – nicht in der URL,
// nicht gespeichert; nach einem Seitenwechsel faengt man leer an.
export const Route = createFileRoute("/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, workouts } = useWorkoutsView();
  const [query, setQuery] = useState("");

  const zeigtSuche = workouts.length >= SUCHE_AB_WORKOUTS;
  const sucht = zeigtSuche && query.trim().length > 0;
  const gezeigteWorkouts = sucht
    ? filterWorkoutRows(workouts, query)
    : workouts;

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
        {zeigtSuche && (
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Workout suchen …"
            ariaLabel="Workout suchen"
            className="mb-6 min-[960px]:mb-[30px]"
          />
        )}
        <Section>
          {gezeigteWorkouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {sucht
                ? "Kein passendes Workout."
                : "Noch keine Workouts. Lege unten ein neues an."}
            </p>
          ) : (
            <List bordered>
              {gezeigteWorkouts.map((w) => (
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
      </PageReveal>
    </div>
  );
}
