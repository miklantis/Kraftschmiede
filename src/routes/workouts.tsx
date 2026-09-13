import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
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
import { useTemplateActions } from "@/hooks/useTemplateActions";

// Workouts – Bibliothek. Zeigt die aktiven Workouts als Liste (Name, Uebungen
// in Kurzform, Hinweis "journey-faehig"); tippen fuehrt auf die lesende
// Detailseite. Unter der Liste "Neues Workout" (Editor), darunter ein
// ausklappbarer Archiv-Abschnitt mit Reaktivieren.
//
// Ab SUCHE_AB_WORKOUTS aktiven Workouts steht ganz oben ein Suchfeld (Schwelle
// geteilt mit dem Auswahl-Popup der Journey-Seite). Gefiltert wird ueber den
// Workout-Namen, aktive Liste und Archiv getrennt: die Zahl an "Archivierte"
// zeigt beim Suchen die Treffer darin, aufklappen muss man weiterhin selbst.
// Der Suchbegriff ist reiner Ansichtszustand – nicht in der URL, nicht
// gespeichert; nach einem Seitenwechsel faengt man leer an.
export const Route = createFileRoute("/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, workouts, archived } = useWorkoutsView();
  const { reactivateWorkout, isSaving } = useTemplateActions();
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");

  const zeigtSuche = workouts.length >= SUCHE_AB_WORKOUTS;
  const sucht = zeigtSuche && query.trim().length > 0;
  const gezeigteWorkouts = sucht
    ? filterWorkoutRows(workouts, query)
    : workouts;
  const gezeigteArchivierte = sucht
    ? filterWorkoutRows(archived, query)
    : archived;

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
                : "Noch keine aktiven Workouts. Lege unten ein neues an."}
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

        {gezeigteArchivierte.length > 0 && (
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
              Archivierte ({gezeigteArchivierte.length})
            </button>

            {showArchived && (
              <div className="mt-3">
                <List bordered>
                  {gezeigteArchivierte.map((w) => (
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
