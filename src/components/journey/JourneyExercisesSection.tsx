import { useNavigate } from "@tanstack/react-router";
import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { useActiveJourney } from "@/hooks/useJourney";
import { useJourneyExercises } from "@/hooks/useJourneyExercises";

// Abschnitt "Uebungen in dieser Journey": je Uebung der zugewiesenen Workouts
// eine Zeile mit der Zahl ihrer Einheiten in dieser Journey. Nur mit aktiver
// Journey sichtbar. Gruppiert wie die Uebungsseite (Hauptuebungen · Assistenz ·
// Core · Koerpergewicht), Reihenfolge aus dem Katalog.
//
// Erster Schritt von #283: die Auswahl-Logik live pruefbar machen. Aus den
// Zeilen werden spaeter Kacheln mit Verlaufschart (Schritt 2) und Coach-Block
// (Schritt 3); die Platzhalter-Zeile einer Uebung ohne Einheit haelt schon
// heute ihren Platz in der Reihenfolge frei.
export function JourneyExercisesSection(): React.ReactElement | null {
  const navigate = useNavigate();
  const journeyQ = useActiveJourney();
  const journeyId = journeyQ.data?.id ?? null;
  const { ready, groups } = useJourneyExercises(journeyId);

  if (journeyId === null) return null;

  return (
    <Section eyebrow="Übungen in dieser Journey">
      {!ready ? (
        <p className="text-[13px] text-muted-foreground">Wird geladen …</p>
      ) : groups.length === 0 ? (
        <p className="max-w-[680px] text-[13px] leading-[1.55] text-muted-foreground">
          Dieser Journey ist noch kein Workout zugewiesen. Schalte oben ein
          Workout ein, dann stehen hier seine Übungen.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-2 text-[14px] font-semibold text-foreground min-[960px]:text-[13px]">
                {g.title}
              </div>
              <List bordered>
                {g.items.map((it) => (
                  <ListRow
                    key={it.id}
                    title={it.name}
                    trailing={
                      it.sessionCount === 0 ? (
                        <span className="text-[13px] text-foreground-subtle">
                          noch keine Einheit
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">
                          {it.sessionCount === 1
                            ? "1 Einheit"
                            : it.sessionCount + " Einheiten"}
                        </span>
                      )
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
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
