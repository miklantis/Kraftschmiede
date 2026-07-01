import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented";
import { ExercisePicker } from "@/components/exercise/ExercisePicker";
import { useWorkoutEditor } from "@/hooks/useWorkoutEditor";
import type { TemplateRole } from "@/schemas";

const ROLE_OPTIONS: Array<{ value: TemplateRole; label: string }> = [
  { value: "primary", label: "Haupt" },
  { value: "secondary", label: "Assistenz" },
  { value: "core", label: "Core" },
];

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
  const [confirmArchive, setConfirmArchive] = useState(false);

  const backTo = templateId
    ? {
        to: "/workouts/$templateId" as const,
        params: { templateId } as { templateId: string } | undefined,
        label: "Workout",
      }
    : {
        to: "/workouts" as const,
        params: undefined as { templateId: string } | undefined,
        label: "Workouts",
      };

  if (ed.isLoading) {
    return (
      <div>
        <BackLink to={backTo.to} label={backTo.label} params={backTo.params} />
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      </div>
    );
  }
  if (ed.isError) {
    return (
      <div>
        <BackLink to={backTo.to} label={backTo.label} params={backTo.params} />
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
    const id = await ed.save();
    void navigate({ to: "/workouts/$templateId", params: { templateId: id } });
  };

  const onArchive = async (): Promise<void> => {
    await ed.archive();
    void navigate({ to: "/workouts" });
  };

  return (
    <>
      <BackLink to={backTo.to} label={backTo.label} params={backTo.params} />
      <PageHeader
        title={ed.isNew ? "Neues Workout" : "Workout bearbeiten"}
        className="mb-4"
      />

      {/* Name */}
      <div className="mb-1.5 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
        Name
      </div>
      <Input
        value={ed.name}
        onChange={(e) => ed.setName(e.target.value)}
        placeholder="z. B. Oberkörper A"
        className="h-10"
        aria-label="Workout-Name"
      />
      {ed.nameState === "duplicate" && (
        <p className="mt-1.5 text-[12px] font-medium text-danger">
          Ein Workout mit diesem Namen existiert bereits.
        </p>
      )}

      {/* Journey-Faehigkeit live */}
      <div className="mt-3 mb-5 flex items-center gap-2">
        {ed.journeyCapable ? (
          <span className="rounded-[20px] bg-foreground px-2.5 py-1 text-[13px] font-medium text-background">
            journey-fähig
          </span>
        ) : (
          <span className="rounded-[20px] bg-muted px-2.5 py-1 text-[13px] font-medium text-muted-foreground">
            nicht journey-fähig
          </span>
        )}
        <span className="text-[12px] text-muted-foreground">
          {ed.journeyCapable
            ? "enthält eine Kraftübung"
            : "keine Kraftübung enthalten"}
        </span>
      </div>

      {/* Uebungsliste */}
      <div className="mb-1.5 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
        Übungen
      </div>
      {ed.rows.length === 0 ? (
        <p className="mb-3 rounded-[14px] border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          Noch keine Übung. Füge unten mindestens eine hinzu.
        </p>
      ) : (
        <div className="mb-3 flex flex-col gap-2.5">
          {ed.rows.map((row, i) => (
            <div
              key={row.exerciseId}
              className="rounded-[14px] bg-card px-3.5 py-3 shadow-card"
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span className="flex-1 text-[15px] font-semibold text-foreground">
                  {row.name}
                </span>
                <button
                  type="button"
                  aria-label="Nach oben"
                  disabled={i === 0}
                  onClick={() => ed.moveUp(i)}
                  className="flex size-8 flex-none items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-[filter] hover:brightness-95 disabled:opacity-30"
                >
                  <ChevronUp className="size-[18px]" />
                </button>
                <button
                  type="button"
                  aria-label="Nach unten"
                  disabled={i === ed.rows.length - 1}
                  onClick={() => ed.moveDown(i)}
                  className="flex size-8 flex-none items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-[filter] hover:brightness-95 disabled:opacity-30"
                >
                  <ChevronDown className="size-[18px]" />
                </button>
                <button
                  type="button"
                  aria-label="Übung entfernen"
                  onClick={() => ed.removeExercise(row.exerciseId)}
                  className="flex size-8 flex-none items-center justify-center rounded-[10px] border border-danger/40 bg-card text-danger transition-colors hover:bg-danger/10"
                >
                  <Trash2 className="size-[16px]" />
                </button>
              </div>
              <SegmentedControl
                options={ROLE_OPTIONS}
                value={row.role}
                onChange={(v) => ed.setRole(row.exerciseId, v)}
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-[18px]" />
        Übung hinzufügen
      </button>

      {/* Fuss: Speichern (+ Archivieren beim Bearbeiten) */}
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
          (confirmArchive ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmArchive(false)}
                className="flex-1 rounded-[13px] border border-border bg-card py-3 text-[15px] font-semibold text-foreground transition-[filter] hover:brightness-95"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void onArchive()}
                disabled={ed.isSaving}
                className="flex-1 rounded-[13px] border border-danger/40 bg-card py-3 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
              >
                Wirklich archivieren
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmArchive(true)}
              className="w-full rounded-[13px] border border-danger/40 bg-card py-3 text-[15px] font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              Archivieren
            </button>
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
