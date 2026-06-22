import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export const Route = createFileRoute("/verlauf")({
  component: VerlaufPage,
});

function VerlaufPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Verlauf"
      note="Kalender, Liste und erste Charts kommen in Phase 4."
    />
  );
}
