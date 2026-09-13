import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { PageReveal } from "@/components/ui/page-reveal";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { CoachStatusPill } from "@/components/ui/coach-status-pill";
import { SearchField } from "@/components/ui/search-field";
import { PinnedCharts } from "@/components/exercise/PinnedCharts";
import { useExercisesView } from "@/hooks/useExercisesView";
import { usePinnedView } from "@/hooks/usePinnedView";

// Uebungen – Liste. Reine Lese-/Navigationsseite: zeigt den Katalog gruppiert
// (Hauptuebungen, Assistenz, Core, Koerpergewicht) und fuehrt per
// Tippen auf die Detailseite. Mobile gestapelt, Desktop zweispaltig (V1 ub-grid).
//
// Ganz oben steht ein Suchfeld ueber dem Namen. Der Suchbegriff ist reiner
// Ansichtszustand: er steht nicht in der URL und wird nicht gespeichert, nach
// einem Seitenwechsel faengt man leer an. Solange gesucht wird, treten die
// angehefteten Verlaufs-Kacheln zurueck, damit die Treffer oben stehen.
export const Route = createFileRoute("/uebungen")({
  component: UebungenPage,
});

function UebungenPage(): React.ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { isLoading, isError, error, groups, hasExercises } =
    useExercisesView(query);
  const pinned = usePinnedView();
  const sucht = query.trim().length > 0;

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

  if (!hasExercises) {
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
      <PageReveal>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Übung suchen …"
          ariaLabel="Übung suchen"
          className="mb-6 min-[960px]:mb-[30px]"
        />
        {!sucht && (
          <div className="mb-6 min-[960px]:mb-[30px]">
            <PinnedCharts cards={pinned.cards} unit={pinned.unit} />
          </div>
        )}
        {groups.length === 0 && (
          <p className="py-6 text-[14px] leading-[1.5] text-muted-foreground">
            Keine passende Übung.
          </p>
        )}
        <div
          data-reveal-flatten
          className="columns-1 [column-gap:24px] min-[960px]:columns-2"
        >
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
                    subtitle={
                      it.coachState ? (
                        <CoachStatusPill state={it.coachState} />
                      ) : undefined
                    }
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
      </PageReveal>
    </div>
  );
}
