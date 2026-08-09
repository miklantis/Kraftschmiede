import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import type { ExerciseMilestoneRow } from "@/schemas";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";

const FEEDBACK_MS = 850;

// Anlegen/Bearbeiten eines Meilensteins ueber das generische Overlay. Zwei
// Felder: Name und Ziel-1RM (kg). Im Bearbeiten-Modus zusaetzlich Loeschen (mit
// Rueckfrage im selben Dialog). milestone == null => Anlegen.
function FieldLabel({ children }: { children: string }): React.ReactElement {
  return (
    <div className="mb-2 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
      {children}
    </div>
  );
}

export function MilestoneEditModal({
  exerciseId,
  milestone,
  unit,
  open,
  onClose,
}: {
  exerciseId: string;
  milestone: ExerciseMilestoneRow | null;
  unit: string;
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const { add, update, remove, isPending } = useMilestoneActions();
  const isEdit = milestone !== null;

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Beim Oeffnen die Felder frisch setzen (Bearbeiten vorbefuellt, Anlegen leer).
  useEffect(() => {
    if (open) {
      setName(milestone?.name ?? "");
      setTarget(milestone != null ? String(milestone.target_rm) : "");
      setSaved(false);
      setConfirmDelete(false);
    }
  }, [open, milestone]);

  const parsedTarget = Number(target.trim().replace(",", "."));
  const canSave =
    name.trim() !== "" && !Number.isNaN(parsedTarget) && parsedTarget > 0;

  const save = async (): Promise<void> => {
    if (!canSave) return;
    if (isEdit && milestone) {
      await update(milestone.id, name.trim(), parsedTarget);
    } else {
      await add(exerciseId, name.trim(), parsedTarget);
    }
    setSaved(true);
    window.setTimeout(onClose, FEEDBACK_MS);
  };

  const doDelete = async (): Promise<void> => {
    if (!milestone) return;
    await remove(milestone.id);
    onClose();
  };

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={isEdit ? "Meilenstein bearbeiten" : "Meilenstein hinzufügen"}
    >
      <FieldLabel>Name</FieldLabel>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Erste 100 kg"
        disabled={saved}
        className="mb-[18px]"
      />

      <FieldLabel>Ziel-1RM</FieldLabel>
      <div className="mb-[18px] flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0"
          min={0}
          step={2.5}
          disabled={saved}
          className="flex-1"
        />
        <span className="text-[14px] font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      <p className="mx-0.5 -mt-2 mb-4 text-[12px] leading-[1.5] text-muted-foreground">
        Der Fortschritt zählt gegen dein aktuelles geschätztes 1RM dieser Übung.
        Erreicht es das Ziel, wird der Meilenstein automatisch mit Datum als
        erreicht markiert.
      </p>

      {saved ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground">
          <Check className="size-[17px]" strokeWidth={2.6} />
          {isEdit ? "Gespeichert" : "Angelegt"}
        </div>
      ) : (
        <>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-none rounded-[13px] border border-border bg-card px-5 py-3.5 text-[15px] font-semibold text-foreground transition-[filter] hover:brightness-95"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!canSave || isPending}
              className="flex-1 rounded-[13px] bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground transition-[filter] hover:brightness-105 disabled:opacity-50"
            >
              {isEdit ? "Speichern" : "Anlegen"}
            </button>
          </div>

          {isEdit &&
            (confirmDelete ? (
              <button
                type="button"
                onClick={() => void doDelete()}
                disabled={isPending}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] border border-danger/40 py-3 text-[14px] font-semibold text-danger transition-[filter] hover:brightness-95 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                Wirklich löschen?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:text-danger"
              >
                <Trash2 className="size-4" />
                Meilenstein löschen
              </button>
            ))}
        </>
      )}
    </Overlay>
  );
}
