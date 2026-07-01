import { createFileRoute } from "@tanstack/react-router";
import { WorkoutEditor } from "@/components/workout/WorkoutEditor";

// Neues Workout anlegen. Eigenstaendige Vollseite (entschachtelt mit _), damit
// sie nicht als Detail-Parameter greift. Statischer Pfad geht dem $templateId vor.
export const Route = createFileRoute("/workouts_/neu")({
  component: NewWorkoutPage,
});

function NewWorkoutPage(): React.ReactElement {
  return <WorkoutEditor templateId={null} />;
}
