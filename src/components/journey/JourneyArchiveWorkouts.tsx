import { List, ListRow } from "@/components/ui/list";
import { Section } from "@/components/ui/section";
import { WorkoutIcon } from "@/components/ui/training-icons";
import type { ArchiveWorkoutRow } from "@/lib/journeyArchiveWorkouts";

// Abschnitt "Workouts in dieser Journey" im Archiv: je trainiertem Workout eine
// Zeile mit dem eingebrannten Namen, der Zahl der Einheiten dahinter und den
// enthaltenen Uebungen darunter.
//
// Die Uebungen stehen untereinander als Aufzaehlung, nicht als eine Zeile mit
// Mittelpunkten (#487): die Zeile wuerde sonst gekuerzt, sobald das Workout
// mehr als eine Handvoll Uebungen hat - und genau dort soll die Liste sagen,
// wie das Workout damals aussah. Sie sitzt deshalb im `footer`-Platz der
// Listenzeile (volle Breite, ungekuerzt); Symbol und Zahl richten sich oben an
// der Titelzeile aus. Die Optik der Punkte ist dieselbe wie bei den
// aufgeklappten Zeilen im Trainingsverlauf (SessionLogCard).
//
// Anders als auf der laufenden Journey-Seite ist das keine Bedienliste: kein
// Zuweisen-Stift, keine Schalter, kein Klickziel. Und der Inhalt kommt aus den
// absolvierten Einheiten statt aus der heutigen Zuordnung (ADR-0022) - ein
// zugewiesenes, aber nie trainiertes Workout fehlt deshalb. Das Archiv ist ein
// Logbuch.
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
            align="top"
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
            leading={<WorkoutIcon />}
            footer={
              w.exercises.length > 0 ? (
                <ul className="flex flex-col gap-0.5">
                  {w.exercises.map((name) => (
                    <li
                      key={name}
                      className="flex items-baseline gap-2 text-[13px] text-muted-foreground"
                    >
                      <span className="flex-none text-primary/40">•</span>
                      <span className="min-w-0">{name}</span>
                    </li>
                  ))}
                </ul>
              ) : undefined
            }
          />
        ))}
      </List>
    </Section>
  );
}
