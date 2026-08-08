import { useNavigate } from "@tanstack/react-router";
import { List, ListRow } from "@/components/ui/list";
import type { ArchivedJourneyView } from "@/lib/journeyArchive";

// Liste abgeschlossener Journeys unterhalb der aktiven Journey bzw. des
// Leerzustands. Bewusst schlicht: Name, Zeitraum und Dauer. Antippen oeffnet die
// Rueckschau als eigene Vollseite (wie der Vorlagen-Waehler), von der der
// Zurueck-Link wieder hierher fuehrt.
export function ArchivedJourneyList({
  entries,
}: {
  entries: ArchivedJourneyView[];
}): React.ReactElement {
  const navigate = useNavigate();
  return (
    <List>
      {entries.map((e) => (
        <ListRow
          key={e.id}
          title={e.name}
          subtitle={[e.range, e.duration].filter((x) => x !== "").join(" · ")}
          chevron
          ariaLabel={e.name + " – Rückschau öffnen"}
          onClick={() =>
            void navigate({
              to: "/journey/archiv/$journeyId",
              params: { journeyId: e.id },
            })
          }
        />
      ))}
    </List>
  );
}
