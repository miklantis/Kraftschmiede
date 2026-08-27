import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { DialogFooter } from "@/components/ui/dialog-footer";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import type { ExerciseMilestoneRow } from "@/schemas";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";

// Anlegen/Bearbeiten eines Meilensteins ueber das generische Overlay. Zwei
// Felder: Name und Ziel-1RM (kg). Im Bearbeiten-Modus zusaetzlich Loeschen (mit
// Rueckfrage im selben Dialog). milestone == null => Anlegen.
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

  // Beim Oeffnen die Felder frisch setzen (Bearbeiten vorbefuellt, Anlegen leer).
  useEffect(() => {
    if (open) {
      setName(milestone?.name ?? "");
      setTarget(milestone != null ? String(milestone.target_rm) : "");
      setSaved(false);
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
      <FieldLabel className="mb-2">Name</FieldLabel>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Erste 100 kg"
        disabled={saved}
        className="mb-[18px]"
      />

      <FieldLabel className="mb-2">Ziel-1RM</FieldLabel>
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

      <DialogFooter
        saved={saved}
        savedLabel={isEdit ? "Gespeichert" : "Angelegt"}
        actionLabel={isEdit ? "Speichern" : "Anlegen"}
        onAction={() => void save()}
        onClose={onClose}
        disabled={!canSave || isPending}
      >
        {isEdit && (
          <DeleteConfirmButton
            label="Meilenstein löschen"
            onDelete={() => void doDelete()}
            open={open}
            disabled={isPending}
            className="mt-3"
          />
        )}
      </DialogFooter>
    </Overlay>
  );
}
