import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import type { CompositionMilestoneRow } from "@/schemas";
import { useCompositionMilestoneActions } from "@/hooks/useCompositionMilestoneActions";

const FEEDBACK_MS = 850;

// Anlegen/Bearbeiten eines Koerper-Meilensteins ueber das generische Overlay.
// Zwei Felder: Name und Zielwert (Einheit der Metrik). Im Bearbeiten-Modus
// zusaetzlich Loeschen (mit Rueckfrage im selben Dialog). milestone == null =>
// Anlegen; die Metrik kommt dann von der gerade gewaehlten Mess-Metrik.
function FieldLabel({ children }: { children: string }): React.ReactElement {
  return (
    <div className="mb-2 text-[12px] font-semibold tracking-[0.3px] text-muted-foreground">
      {children}
    </div>
  );
}

export function MetricMilestoneEditModal({
  metric,
  metricLabel,
  milestone,
  unit,
  open,
  onClose,
}: {
  metric: string;
  metricLabel: string;
  milestone: CompositionMilestoneRow | null;
  unit: string;
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const { add, update, remove, isPending } = useCompositionMilestoneActions();
  const isEdit = milestone !== null;

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Beim Oeffnen die Felder frisch setzen (Bearbeiten vorbefuellt, Anlegen leer).
  useEffect(() => {
    if (open) {
      setName(milestone?.name ?? "");
      setTarget(milestone != null ? String(milestone.target) : "");
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
      await add(metric, name.trim(), parsedTarget);
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
        placeholder="z. B. Unter 15 % Fett"
        disabled={saved}
        className="mb-[18px]"
      />

      <FieldLabel>{"Ziel · " + metricLabel}</FieldLabel>
      <div className="mb-[18px] flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0"
          min={0}
          step={0.1}
          disabled={saved}
          className="flex-1"
        />
        <span className="text-[14px] font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      <p className="mx-0.5 -mt-2 mb-4 text-[12px] leading-[1.5] text-muted-foreground">
        Der Meilenstein ist ein Richtwert. Er erscheint als Linie im Verlauf
        dieser Metrik, wenn du im Diagramm „Ziele“ einschaltest.
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
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] border border-destructive/40 py-3 text-[14px] font-semibold text-destructive transition-[filter] hover:brightness-95 disabled:opacity-50"
              >
                <Trash2 className="size-4" />
                Wirklich löschen?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:text-destructive"
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
