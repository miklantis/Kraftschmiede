import { createFileRoute } from "@tanstack/react-router";
import { WorkoutEditor } from "@/components/workout/WorkoutEditor";

// Bestehendes Workout bearbeiten. Eigenstaendige Vollseite (entschachtelt mit _),
// erreichbar durch Antippen eines Workouts in der Bibliothek (direkter Editor-
// Einstieg; es gibt keine gesonderte lesende Detailseite mehr).
export const Route = createFileRoute("/workouts_/$templateId_/bearbeiten")({
  component: EditWorkoutPage,
});

function EditWorkoutPage(): React.ReactElement {
  const { templateId } = Route.useParams();
  return <WorkoutEditor templateId={templateId} />;
}
