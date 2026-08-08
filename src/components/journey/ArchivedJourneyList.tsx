import { List, ListRow } from "@/components/ui/list";
import type { ArchivedJourneyView } from "@/lib/journeyArchive";

// Liste abgeschlossener Journeys unterhalb der aktiven Journey bzw. des
// Leerzustands. Bewusst schlicht: Name, Zeitraum und Dauer zum Nachschlagen –
// die Rueckschau (Phasen und Einheiten) kommt als eigener Schritt.
export function ArchivedJourneyList({
  entries,
}: {
  entries: ArchivedJourneyView[];
}): React.ReactElement {
  return (
    <List>
      {entries.map((e) => (
        <ListRow
          key={e.id}
          title={e.name}
          subtitle={[e.range, e.duration].filter((x) => x !== "").join(" · ")}
        />
      ))}
    </List>
  );
}
