import { useNavigate } from "@tanstack/react-router";
import { Section } from "@/components/ui/section";
import { useActiveJourney } from "@/hooks/useJourney";
import { useJourneyExercises } from "@/hooks/useJourneyExercises";
import { useJourneySeries } from "@/hooks/useJourneySeries";
import { JourneyExerciseTile } from "./JourneyExerciseTile";
import { JourneySeriesToggles } from "./JourneySeriesToggles";

// Abschnitt "Uebungen in dieser Journey": je Uebung der zugewiesenen Workouts
// eine Kachel mit ihrem Verlauf in dieser Journey. Nur mit aktiver Journey
// sichtbar. Gruppiert wie die Uebungsseite (Hauptuebungen · Assistenz · Core ·
// Koerpergewicht), Reihenfolge aus dem Katalog.
//
// Uebungen ohne Einheit in dieser Journey stehen als schmale Platzhalter-Zeile
// an ihrem Platz: direkt nach dem Journey-Start staende sonst eine Wand leerer
// Kacheln. Mit der ersten Einheit wird daraus die volle Kachel.
export function JourneyExercisesSection(): React.ReactElement | null {
  const navigate = useNavigate();
  const journeyQ = useActiveJourney();
  const journeyId = journeyQ.data?.id ?? null;
  const { ready, groups, unit } = useJourneyExercises(journeyId);
  const { active } = useJourneySeries();

  if (journeyId === null) return null;

  const open = (exerciseId: string): void => {
    void navigate({ to: "/uebungen/$exerciseId", params: { exerciseId } });
  };
  const hasTile = groups.some((g) => g.items.some((it) => it.chart !== null));

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
        <>
          {hasTile && (
            <div className="mb-4">
              <JourneySeriesToggles />
            </div>
          )}
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <div key={g.key}>
                <div className="mb-2 text-[14px] font-semibold text-foreground min-[960px]:text-[13px]">
                  {g.title}
                </div>
                <div className="flex flex-col gap-3">
                  {g.items.map((it) =>
                    it.chart !== null ? (
                      <JourneyExerciseTile
                        key={it.id}
                        name={it.name}
                        chart={it.chart}
                        activeKeys={active}
                        unit={unit}
                        onOpen={() => open(it.id)}
                      />
                    ) : (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => open(it.id)}
                        aria-label={it.name + " öffnen"}
                        className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-card px-4 py-3 text-left shadow-card transition-colors hover:bg-primary/5 min-[960px]:px-5"
                      >
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground min-[960px]:text-[14px]">
                          {it.name}
                        </span>
                        <span className="flex-none text-[13px] text-foreground-subtle">
                          noch keine Einheit
                        </span>
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
