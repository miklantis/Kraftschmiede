import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export const Route = createFileRoute("/skills")({
  component: SkillsPage,
});

function SkillsPage(): React.ReactElement {
  return (
    <PagePlaceholder
      title="Skills"
      note="Skill-Manager, Equipment-Tor und Fortschritt kommen in Phase 6."
    />
  );
}
