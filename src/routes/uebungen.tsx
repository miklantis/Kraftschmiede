import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { PinnedCharts } from "@/components/exercise/PinnedCharts";
import { useExercisesView } from "@/hooks/useExercisesView";
import { usePinnedView } from "@/hooks/usePinnedView";

// Uebungen – Liste. Reine Lese-/Navigationsseite: zeigt den Katalog gruppiert
// (Hauptuebungen, Assistenz, Core, Koerpergewicht, Inaktiv/Swaps) und fuehrt per
// Tippen auf die Detailseite. Mobile gestapelt, Desktop zweispaltig (V1 ub-grid).
export const Route = createFileRoute("/uebungen")({
  component: UebungenPage,
});

function UebungenPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isLoading, isError, error, groups } = useExercisesView();
  const pinned = usePinnedView();

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Übungen" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Übungen" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {error instanceof Error ? ": " + error.message : "."}
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div>
        <PageHeader title="Übungen" />
        <p className="text-sm text-muted-foreground">
          Noch keine Übungen vorhanden. Über den V1-Import in den Einstellungen
          lässt sich der Katalog übernehmen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Übungen" />
      <div className="mb-6 min-[960px]:mb-[30px]">
        <PinnedCharts cards={pinned.cards} unit={pinned.unit} />
      </div>
      <div className="columns-1 [column-gap:24px] min-[960px]:columns-2">
        {groups.map((g) => (
          <Section
            key={g.title}
            eyebrow={g.title}
            className="mb-6 break-inside-avoid"
          >
            <List bordered>
              {g.items.map((it) => (
                <ListRow
                  key={it.id}
                  title={it.name}
                  subtitle={it.sub}
                  trailing={
                    <span className="font-mono text-[14px] text-muted-foreground tabular-nums">
                      {it.meta}
                    </span>
                  }
                  chevron
                  ariaLabel={it.name + " öffnen"}
                  onClick={() =>
                    void navigate({
                      to: "/uebungen/$exerciseId",
                      params: { exerciseId: it.id },
                    })
                  }
                />
              ))}
            </List>
          </Section>
        ))}
      </div>
    </div>
  );
}
