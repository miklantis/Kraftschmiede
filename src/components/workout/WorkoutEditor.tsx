import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import { SortableList } from "@/components/ui/sortable-list";
import { Section } from "@/components/ui/section";
import { MuscleMap } from "@/components/ui/muscle-map";
import { ExercisePicker } from "@/components/exercise/ExercisePicker";
import { useWorkoutEditor } from "@/hooks/useWorkoutEditor";

// Editor-Seite fuer ein Workout. templateId = null legt neu an, sonst wird das
// bestehende Workout bearbeitet. Bewusster Speichern-Schritt (bis dahin ist
// nichts geschrieben, "Zurueck" verwirft). Bearbeiten schreibt die Uebungsliste
// sauber neu; der Coach-Rechenkern bleibt unangetastet.
export function WorkoutEditor({
  templateId,
}: {
  templateId: string | null;
}): React.ReactElement {
  const navigate = useNavigate();
  const ed = useWorkoutEditor(templateId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (ed.isLoading) {
    return (
      <div>
        <BackLink to="/workouts" label="Workouts" />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }
  if (ed.isError) {
    return (
      <div>
        <BackLink to="/workouts" label="Workouts" />
        <p className="text-sm text-danger">
          Daten konnten nicht geladen werden
          {ed.error instanceof Error ? ": " + ed.error.message : "."}
        </p>
      </div>
    );
  }
  if (ed.notFound) {
    return (
      <div>
        <BackLink to="/workouts" label="Workouts" />
        <p className="text-sm text-muted-foreground">
          Dieses Workout wurde nicht gefunden.
        </p>
      </div>
    );
  }

  const onSave = async (): Promise<void> => {
    await ed.save();
    void navigate({ to: "/workouts" });
  };

  const onDelete = async (): Promise<void> => {
    await ed.deleteWorkout();
    void navigate({ to: "/workouts" });
  };

  return (
    <>
      <BackLink to="/workouts" label="Workouts" />
      <PageHeader
        title={ed.isNew ? "Neues Workout" : "Workout bearbeiten"}
        className="mb-4"
      />

      {/* Name */}
      <FieldLabel className="mb-1.5">Name</FieldLabel>
      <Input
        value={ed.name}
        onChange={(e) => ed.setName(e.target.value)}
        placeholder="z. B. Oberkörper A"
        className="h-11 text-[17px] font-medium md:text-[17px]"
        aria-label="Workout-Name"
      />
      {ed.nameState === "duplicate" && (
        <p className="mt-1.5 text-[12px] font-medium text-danger">
          Ein Workout mit diesem Namen existiert bereits.
        </p>
      )}

      {/* Journey-Faehigkeit live – schlichter Hinweistext, kein Chip */}
      <p className="mt-2 mb-5 text-[13px] text-muted-foreground">
        {ed.journeyCapable
          ? "Journey-fähig – enthält eine Kraftübung."
          : "Nicht journey-fähig – keine Kraftübung enthalten."}
      </p>

      {/* Uebungsliste */}
      <FieldLabel className="mb-1.5">Übungen</FieldLabel>
      {ed.rows.length === 0 ? (
        <p className="mb-3 rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          Noch keine Übung. Füge unten mindestens eine hinzu.
        </p>
      ) : (
        <SortableList
          className="mb-3"
          items={ed.rows}
          getKey={(row) => row.exerciseId}
          onReorder={ed.reorder}
          renderItem={(row, _i, { handleProps, isDragging }) => (
            <div className="rounded-[14px] bg-card px-2.5 py-2.5 shadow-card">
              <div className="flex items-center gap-2">
                <span
                  {...handleProps}
                  aria-label="Zum Umsortieren ziehen"
                  className="flex size-9 flex-none items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <GripVertical className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                  {row.name}
                </span>
                <button
                  type="button"
                  aria-label="Übung entfernen"
                  disabled={isDragging}
                  onClick={() => ed.removeExercise(row.exerciseId)}
                  className="flex size-9 flex-none items-center justify-center rounded-[10px] border border-danger/40 bg-card text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 className="size-[16px]" />
                </button>
              </div>
            </div>
          )}
        />
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-[18px]" />
        Übung hinzufügen
      </button>

      {/* Beanspruchte Muskeln des Entwurfs: Schwerpunkt ueber alle Uebungen der
          Liste, rechnet live mit (auch vor dem Speichern). Erscheint nur, wenn
          mindestens eine enthaltene Uebung eine Muskel-Zuordnung hat. */}
      {Object.keys(ed.muscleValues).length > 0 && (
        <Section eyebrow="Beanspruchte Muskeln" className="mb-6">
          {/* Gleiche Breite wie auf der Uebungs-Detailseite (~78 %, zentriert). */}
          <MuscleMap
            values={ed.muscleValues}
            className="mx-auto mt-1 w-[78%] max-w-[300px]"
          />
        </Section>
      )}

      {/* Fuss: Speichern (+ Loeschen beim Bearbeiten). Geloescht wird in zwei
          Stufen - ruhiger Knopf, dann rote Rueckfrage (Issue #491). Gesperrt
          ist der Knopf, solange eine Einheit nach diesem Workout laeuft oder
          es der laufenden Journey zugewiesen ist; der Grund steht darunter. */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!ed.canSave || ed.isSaving}
          className="w-full rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105 disabled:opacity-50"
        >
          Speichern
        </button>

        {!ed.isNew &&
          (confirmDelete ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground transition-[filter] hover:brightness-95"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={ed.isSaving}
                className="flex-1 rounded-[13px] border border-danger/40 bg-card py-3 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                Wirklich löschen
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={ed.deleteBlocked !== null}
                className="w-full rounded-[13px] border border-danger/40 bg-card py-3 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50 disabled:hover:bg-card"
              >
                Löschen
              </button>
              {ed.deleteBlocked !== null && (
                <p className="text-center text-[13px] text-muted-foreground">
                  {ed.deleteBlocked}
                </p>
              )}
            </>
          ))}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={ed.catalog}
        selectedIds={ed.selectedIds}
        onToggle={(id) =>
          ed.selectedIds.has(id) ? ed.removeExercise(id) : ed.addExercise(id)
        }
      />
    </>
  );
}
