import { useState } from "react";
import { Pencil } from "lucide-react";
import { Section } from "@/components/ui/section";
import { List } from "@/components/ui/list";
import { Button } from "@/components/ui/button";
import { JourneyWorkoutRow } from "@/components/journey/JourneyWorkoutRow";
import { JourneyWorkoutPickerModal } from "@/components/journey/JourneyWorkoutPickerModal";
import { useActiveJourney } from "@/hooks/useJourney";
import { useTemplates } from "@/hooks/useTemplates";
import { useExercises } from "@/hooks/useExercises";
import { useJourneyWorkouts } from "@/hooks/useJourneyWorkouts";
import { useJourneyWorkoutActions } from "@/hooks/useJourneyWorkoutActions";
import { useSessions } from "@/hooks/useSessions";
import {
  buildJourneyAssignment,
  countJourneyWorkoutSessions,
  type WorkoutExerciseInfo,
  type WorkoutInput,
} from "@/lib/workouts";

// Abschnitt "Workouts in dieser Journey": zeigt die der aktiven Journey
// zugewiesenen Workouts – rein informativ, ohne Schalter und ohne Klickziel.
// Zugewiesen wird im Auswahl-Popup hinter dem Stift-Knopf am Abschnittskopf;
// dort steht die volle Menge der zuweisbaren Workouts mit Schalter je Zeile.
// So bleibt die Seite kurz, auch wenn die Workout-Bibliothek waechst.
// Nur mit aktiver Journey sichtbar. Datenzugriff ueber Hooks gekapselt; die
// Journey-Faehigkeit wird aus den Uebungsprofilen abgeleitet (lib/workouts.ts).
// Hinter dem Namen steht die Zahl der abgeschlossenen Einheiten dieses Workouts
// in dieser Journey (nichts bei null); sie kommt aus den ohnehin geladenen
// Einheiten, kostet also keine zusaetzliche Abfrage.
export function JourneyWorkoutsSection(): React.ReactElement | null {
  const journeyQ = useActiveJourney();
  const templatesQ = useTemplates();
  const exercisesQ = useExercises();
  const journeyId = journeyQ.data?.id ?? null;
  const assignedQ = useJourneyWorkouts(journeyId);
  const sessionsQ = useSessions();
  const actions = useJourneyWorkoutActions();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (journeyId === null) return null;

  const lookup: Record<string, WorkoutExerciseInfo | undefined> = {};
  for (const e of exercisesQ.data ?? []) {
    lookup[e.id] = { name: e.name, profile: e.profile };
  }

  // Defensiv: nur ein echtes Array wird zum Set. Ein aelterer, kaputt
  // serialisierter Cachewert (frueher als Set abgelegt -> {}) darf nicht
  // crashen, sondern gilt als leere Zuordnung, bis der Refetch greift.
  const assignedIds = Array.isArray(assignedQ.data) ? assignedQ.data : [];
  const ready = Boolean(
    templatesQ.data && exercisesQ.data && assignedQ.data !== undefined,
  );
  // Die Zahlen haengen bewusst nicht an "ready": stehen die Einheiten noch aus,
  // erscheint die Liste trotzdem sofort und bekommt ihre Zahlen nach.
  const doneCounts = countJourneyWorkoutSessions(
    (sessionsQ.data ?? []).map((s) => ({
      journeyId: s.journey_id,
      templateId: s.template_id,
      status: s.status,
    })),
    journeyId,
  );
  // Volle Menge der zuweisbaren Workouts – Grundlage fuer das Popup; die
  // Uebersicht darunter zeigt davon nur die zugewiesenen.
  const rows = ready
    ? buildJourneyAssignment(
        templatesQ.data as WorkoutInput[],
        lookup,
        new Set(assignedIds),
        doneCounts,
      )
    : [];
  const assignedRows = rows.filter((r) => r.assigned);

  return (
    <Section
      eyebrow="Workouts in dieser Journey"
      action={
        rows.length > 0 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label="Workouts dieser Journey zuweisen"
            className="-my-1 -mr-1 flex-none p-1 text-muted-foreground transition-colors hover:text-primary"
          >
            <Pencil className="size-4" />
          </button>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="max-w-[680px] text-[13px] leading-[1.55] text-muted-foreground">
          Noch keine journey-fähigen Workouts vorhanden. Lege in der
          Workouts-Bibliothek ein Workout mit mindestens einer Kraftübung an, um
          es hier zuzuweisen.
        </p>
      ) : assignedRows.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-[680px] text-[13px] leading-[1.55] text-muted-foreground">
            Dieser Journey ist noch kein Workout zugewiesen.
          </p>
          <Button variant="outline" onClick={() => setPickerOpen(true)}>
            Workouts auswählen
          </Button>
        </div>
      ) : (
        <List bordered>
          {assignedRows.map((r) => (
            <JourneyWorkoutRow key={r.id} row={r} />
          ))}
        </List>
      )}

      <JourneyWorkoutPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        rows={rows}
        onToggle={(templateId, next) =>
          void actions.toggle(journeyId, templateId, next)
        }
      />
    </Section>
  );
}
