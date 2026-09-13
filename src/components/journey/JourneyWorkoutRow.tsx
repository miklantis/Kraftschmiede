import type { ReactNode } from "react";
import { ListRow } from "@/components/ui/list";
import { WorkoutIcon } from "@/components/ui/training-icons";
import type { JourneyAssignmentRow } from "@/lib/workouts";

// Eine Workout-Zeile der Journey-Seite: Workout-Icon, Name, dahinter die Zahl
// der abgeschlossenen Einheiten dieses Workouts in dieser Journey (nichts bei
// null), darunter die Uebungs-Zusammenfassung. Gemeinsam genutzt von der
// Uebersicht im Abschnitt (rein informativ, ohne Anhaengsel) und vom
// Auswahl-Popup (mit Schalter rechts) – damit beide Listen dieselbe Zeile
// zeigen und nicht auseinanderlaufen.
export function JourneyWorkoutRow({
  row,
  trailing,
}: {
  row: JourneyAssignmentRow;
  trailing?: ReactNode;
}): React.ReactElement {
  return (
    <ListRow
      title={
        row.doneCount > 0 ? (
          <>
            {row.name}{" "}
            <span
              className="font-normal text-foreground-subtle"
              title={
                row.doneCount === 1
                  ? "1 Einheit in dieser Journey"
                  : row.doneCount + " Einheiten in dieser Journey"
              }
            >
              ({row.doneCount})
            </span>
          </>
        ) : (
          row.name
        )
      }
      subtitle={row.summary.length > 0 ? row.summary : undefined}
      leading={<WorkoutIcon />}
      trailing={trailing}
    />
  );
}
