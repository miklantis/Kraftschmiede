import { Section } from "@/components/ui/section";
import { List, ListRow } from "@/components/ui/list";
import { Switch } from "@/components/ui/switch";
import { useActiveJourney } from "@/hooks/useJourney";
import { useTemplates } from "@/hooks/useTemplates";
import { useExercises } from "@/hooks/useExercises";
import { useJourneyWorkouts } from "@/hooks/useJourneyWorkouts";
import { useJourneyWorkoutActions } from "@/hooks/useJourneyWorkoutActions";
import {
  buildJourneyAssignment,
  type WorkoutExerciseInfo,
  type WorkoutInput,
} from "@/lib/workouts";

// Abschnitt "Workouts in dieser Journey": An/Aus-Schalter je zuweisbarem
// (aktivem, journey-faehigem) Workout. Jeder Schalter speichert sofort
// (natuerlicher Toggle-Fall, offline unkritisch). Nur mit aktiver Journey
// sichtbar. Bis Lieferung 5 aendert die Zuordnung noch nichts an der
// Trainingsempfehlung. Datenzugriff ueber Hooks gekapselt; die Journey-Faehigkeit
// wird aus den Uebungsprofilen abgeleitet (lib/workouts.ts).
export function JourneyWorkoutsSection(): React.ReactElement | null {
  const journeyQ = useActiveJourney();
  const templatesQ = useTemplates();
  const exercisesQ = useExercises();
  const journeyId = journeyQ.data?.id ?? null;
  const assignedQ = useJourneyWorkouts(journeyId);
  const actions = useJourneyWorkoutActions();

  if (journeyId === null) return null;

  const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
  for (const e of exercisesQ.data ?? []) {
    lookup[e.id] = { name: e.name, profile: e.profile };
  }

  const ready = Boolean(
    templatesQ.data && exercisesQ.data && assignedQ.data !== undefined,
  );
  const rows = ready
    ? buildJourneyAssignment(
        templatesQ.data as WorkoutInput[],
        lookup,
        new Set(assignedQ.data ?? []),
      )
    : [];

  return (
    <Section eyebrow="Workouts in dieser Journey">
      {rows.length === 0 ? (
        <p className="max-w-[680px] text-[13px] leading-[1.55] text-muted-foreground">
          Noch keine journey-fähigen Workouts vorhanden. Lege in der
          Workouts-Bibliothek ein Workout mit mindestens einer Kraftübung an, um
          es hier zuzuweisen.
        </p>
      ) : (
        <List bordered>
          {rows.map((r) => (
            <ListRow
              key={r.id}
              title={r.name}
              subtitle={r.summary.length > 0 ? r.summary : undefined}
              trailing={
                <Switch
                  checked={r.assigned}
                  onChange={(next) =>
                    void actions.toggle(journeyId, r.id, next)
                  }
                  tone="primary"
                  label={r.name + " dieser Journey zuweisen"}
                />
              }
            />
          ))}
        </List>
      )}
    </Section>
  );
}
