import { List, ListRow } from "@/components/ui/list";
import { Section } from "@/components/ui/section";
import { WorkoutIcon } from "@/components/ui/training-icons";
import type { ReviewWorkout } from "@/lib/journeyReview";

// Abschnitt "Workouts in dieser Journey" in der Rueckschau: je trainiertem
// Workout eine Zeile mit der Zahl der darin absolvierten Einheiten, haeufigstes
// zuerst.
//
// Anders als derselbe Abschnitt auf der Journey-Seite ist das keine Bedienliste:
// keine Schalter, keine feste Reihenfolge, und was hier steht, kommt aus den
// absolvierten Einheiten statt aus der Zuordnung (ADR-0022). Ein zugewiesenes,
// aber nie trainiertes Workout fehlt deshalb - die Rueckschau ist ein Logbuch.
//
// Ohne absolvierte Einheit entfaellt der Abschnitt ganz; die Einheiten je Phase
// darunter sagen dann bereits alles.
export function JourneyReviewWorkouts({
  workouts,
}: {
  workouts: ReviewWorkout[];
}): React.ReactElement | null {
  if (workouts.length === 0) return null;

  return (
    <Section eyebrow="Workouts in dieser Journey">
      <List>
        {workouts.map((w) => (
          <ListRow
            key={w.id === "" ? "ohne-workout" : w.id}
            title={w.name}
            leading={<WorkoutIcon />}
            trailing={
              <span className="text-[13px] text-muted-foreground">{w.meta}</span>
            }
          />
        ))}
      </List>
    </Section>
  );
}
