import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { List } from "@/components/ui/list";
import { Switch } from "@/components/ui/switch";
import { SearchField } from "@/components/ui/search-field";
import { JourneyWorkoutRow } from "@/components/journey/JourneyWorkoutRow";
import {
  filterJourneyAssignment,
  type JourneyAssignmentRow,
} from "@/lib/workouts";

// Popup zum Zuweisen der Workouts zur aktiven Journey. Auf dem generischen
// Overlay aufgesetzt (Desktop zentriert, Mobile Bodenblatt).
//
// Gezeigt wird die volle Menge der zuweisbaren Workouts (aktiv + journey-faehig)
// in fester Katalog-Reihenfolge: zugewiesene wandern bewusst NICHT nach oben,
// sonst springt die Zeile beim Umschalten unter dem Finger weg. Jeder Schalter
// speichert sofort (wie bisher in der Liste), darum gibt es kein
// Speichern/Abbrechen-Paar, sondern nur X und "Fertig" zum Schliessen.
//
// Ueber der Liste steht ein Suchfeld (Filter nach Workout-Name, Logik in
// lib/workouts.ts). Es wird beim Oeffnen zurueckgesetzt – nicht beim Schliessen,
// sonst waere der Sprung auf die volle Liste waehrend der Ausblende-Animation
// sichtbar.
//
// Bewusst ohne eigene Datenhaltung: Zeilen und Umschalter kommen vom Aufrufer
// (JourneyWorkoutsSection), der sie ohnehin fuer die Uebersicht berechnet.
export function JourneyWorkoutPickerModal({
  open,
  onClose,
  rows,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  rows: JourneyAssignmentRow[];
  onToggle: (templateId: string, next: boolean) => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const shown = filterJourneyAssignment(rows, query);

  return (
    <Overlay open={open} onClose={onClose} title="Workouts zuweisen">
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Workout suchen …"
        ariaLabel="Workout suchen"
        className="mb-3"
      />

      {shown.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          Kein passendes Workout.
        </p>
      ) : (
        <List bordered>
          {shown.map((r) => (
            <JourneyWorkoutRow
              key={r.id}
              row={r}
              trailing={
                <Switch
                  checked={r.assigned}
                  onChange={(next) => onToggle(r.id, next)}
                  tone="primary"
                  label={r.name + " dieser Journey zuweisen"}
                />
              }
            />
          ))}
        </List>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105"
      >
        Fertig
      </button>
    </Overlay>
  );
}
