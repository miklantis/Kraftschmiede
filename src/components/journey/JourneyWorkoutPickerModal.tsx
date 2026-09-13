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

// Ab so vielen zuweisbaren Workouts erscheint das Suchfeld. Darunter sieht man
// die Liste ohnehin auf einen Blick, und die Tastatur waere nur im Weg. Die
// Zahl steht bewusst an genau dieser Stelle: sie soll spaeter voraussichtlich
// auf 10 steigen, sobald die Bibliothek gewachsen ist.
const SUCHE_AB_WORKOUTS = 5;

// Popup zum Zuweisen der Workouts zur aktiven Journey. Auf dem generischen
// Overlay aufgesetzt (Desktop zentriert, Mobile Bodenblatt).
//
// Gezeigt wird die volle Menge der zuweisbaren Workouts (aktiv + journey-faehig)
// in fester Katalog-Reihenfolge: zugewiesene wandern bewusst NICHT nach oben,
// sonst springt die Zeile beim Umschalten unter dem Finger weg. Jeder Schalter
// speichert sofort (wie bisher in der Liste), darum gibt es kein
// Speichern/Abbrechen-Paar, sondern nur X und "Fertig" zum Schliessen.
//
// Hoehen-Aufbau (contentScrolls): Titel und Suchfeld stehen fest, nur die Liste
// dazwischen scrollt, "Fertig" sitzt unten. Mit offener Tastatur behaelt das
// Blatt seine Hoehe - sonst schrumpfte es beim Tippen mit der Trefferzahl und
// spraenge unter dem Finger weg.
//
// Das Suchfeld erscheint erst ab SUCHE_AB_WORKOUTS Eintraegen. Es wird beim
// Oeffnen zurueckgesetzt – nicht beim Schliessen, sonst waere der Sprung auf die
// volle Liste waehrend der Ausblende-Animation sichtbar.
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

  const zeigtSuche = rows.length >= SUCHE_AB_WORKOUTS;
  const shown = zeigtSuche ? filterJourneyAssignment(rows, query) : rows;

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Workouts zuweisen"
      contentScrolls
    >
      {zeigtSuche && (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Workout suchen …"
          ariaLabel="Workout suchen"
          className="mb-3 flex-none"
        />
      )}

      {shown.length === 0 ? (
        <p className="flex-none py-6 text-center text-[13px] text-muted-foreground">
          Kein passendes Workout.
        </p>
      ) : (
        <List bordered className="min-h-0 overflow-y-auto">
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

      {/* mt-auto: bleibt unten am Blatt, auch wenn die Liste kurz ist. */}
      <div className="mt-auto flex-none pt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105"
        >
          Fertig
        </button>
      </div>
    </Overlay>
  );
}
