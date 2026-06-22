import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export const Route = createFileRoute("/uebungen")({
  component: UebungenPage,
});

function UebungenPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Übungen"
      note="Übungsliste, Detailseite und Muscle-Map kommen in Phase 8."
    />
  );
}
