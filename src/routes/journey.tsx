import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export const Route = createFileRoute("/journey")({
  component: JourneyPage,
});

function JourneyPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Journey"
      note="Phasen, Wochenplatzierung und Periodisierung kommen in Phase 5."
    />
  );
}
