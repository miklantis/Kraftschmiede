import { List, ListRow } from "@/components/ui/list";
import { Section } from "@/components/ui/section";
import { WorkoutIcon } from "@/components/ui/training-icons";
import type { ArchiveWorkoutRow } from "@/lib/journeyArchiveWorkouts";

// Abschnitt "Workouts in dieser Journey" im Archiv: je trainiertem Workout eine
// Zeile mit dem eingebrannten Namen, der Zahl der Einheiten dahinter und den
// enthaltenen Uebungen darunter – dieselbe Zeilenform wie auf der laufenden
// Journey-Seite (JourneyWorkoutRow).
//
// Anders als dort ist das keine Bedienliste: kein Zuweisen-Stift, keine
// Schalter, kein Klickziel. Und der Inhalt kommt aus den absolvierten Einheiten
// statt aus der heutigen Zuordnung (ADR-0022) – ein zugewiesenes, aber nie
// trainiertes Workout fehlt deshalb. Das Archiv ist ein Logbuch.
//
// Ohne absolvierte Einheit entfaellt der Abschnitt ganz.
export function JourneyArchiveWorkouts({
  workouts,
}: {
  workouts: ArchiveWorkoutRow[];
}): React.ReactElement | null {
  if (workouts.length === 0) return null;

  return (
    <Section eyebrow="Workouts in dieser Journey">
      <List bordered>
        {workouts.map((w) => (
          <ListRow
            key={w.id === "" ? "ohne-workout" : w.id}
            title={
              <>
                {w.name}{" "}
                <span
                  className="font-normal text-foreground-subtle"
                  title={w.meta + " in dieser Journey"}
                >
                  ({w.count})
                </span>
              </>
            }
            subtitle={w.summary.length > 0 ? w.summary : undefined}
            leading={<WorkoutIcon />}
          />
        ))}
      </List>
    </Section>
  );
}
