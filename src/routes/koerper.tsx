import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export const Route = createFileRoute("/koerper")({
  component: KoerperPage,
});

function KoerperPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Körper"
      note="Body-Log, InBody-Composition und Verlaufscharts kommen in Phase 9."
    />
  );
}
