import { List, ListRow } from "@/components/ui/list";
import { Section } from "@/components/ui/section";
import type { ReviewGroup } from "@/lib/journeyReview";

// Absolvierte Einheiten einer abgeschlossenen Journey, nach Phasen gruppiert.
// Bewusst schlicht (Nachschlagen, nicht Auswerten): je Phase eine Ueberschrift
// mit Dauer und Einheitenzahl, darunter die Einheiten in der Reihenfolge, in der
// sie stattgefunden haben. Phasen ohne Einheiten bleiben sichtbar - die Luecke
// ist selbst eine Information.
export function JourneyReviewSessions({
  groups,
}: {
  groups: ReviewGroup[];
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <Section key={g.id === "" ? "rest" : g.id} eyebrow={g.name}>
          <div className="mb-2 -mt-1 text-[13px] text-muted-foreground">
            {g.meta}
          </div>
          {g.sessions.length === 0 ? (
            <div className="rounded-[18px] bg-card px-4 py-4 text-[14px] text-muted-foreground shadow-card">
              Keine Einheiten in dieser Phase.
            </div>
          ) : (
            <List>
              {g.sessions.map((s) => (
                <ListRow key={s.id} title={s.title} subtitle={s.dateLabel} />
              ))}
            </List>
          )}
        </Section>
      ))}
    </div>
  );
}
