import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

// Startroute = Training (wie V1). Inhalt folgt in Phase 3.
export const Route = createFileRoute("/")({
  component: TrainingPage,
});

function TrainingPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Training"
      note="Heutiges Training, Eignung und Coach kommen in Phase 3."
    />
  );
}
