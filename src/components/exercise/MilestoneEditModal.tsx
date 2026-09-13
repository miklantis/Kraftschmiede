import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { DialogFooter } from "@/components/ui/dialog-footer";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/field-label";
import { SegmentedControl } from "@/components/ui/segmented";
import type { ExerciseMilestoneRow, MeilensteinBasis } from "@/schemas";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";
import { useMeilensteinBasis } from "@/hooks/useMeilensteinBasis";
import { BASIS_KURZ, BASIS_NAME, zielWert } from "@/lib/meilensteinBasis";
import { fmtWeight } from "@/lib/format";

// Anlegen/Bearbeiten eines Meilensteins ueber das generische Overlay. Drei
// Felder: Name, Art des Ziels und je nach Art ein festes Ziel-1RM oder ein
// Faktor auf einen Koerperwert. Im Bearbeiten-Modus zusaetzlich Loeschen (mit
// Rueckfrage im selben Dialog). milestone == null => Anlegen.
//
// Voreinstellung beim Anlegen ist "Koerpergewicht": die gaengigen Kraftstandards
// sind auf das Koerpergewicht bezogen, damit passen die ueblichen Faktoren
// (0,75 / 1,0 / 1,5) ohne Umrechnung.

const ARTEN: { value: MeilensteinBasis; label: string }[] = (
  ["fix", "koerpergewicht", "ffm"] as const
).map((art) => ({ value: art, label: BASIS_KURZ[art] }));

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
  const basisWerte = useMeilensteinBasis();
  const isEdit = milestone !== null;

  const [name, setName] = useState("");
  const [basis, setBasis] = useState<MeilensteinBasis>("koerpergewicht");
  const [target, setTarget] = useState("");
  const [faktor, setFaktor] = useState("");
  const [saved, setSaved] = useState(false);

  // Beim Oeffnen die Felder frisch setzen (Bearbeiten vorbefuellt, Anlegen leer).
  useEffect(() => {
    if (open) {
      setName(milestone?.name ?? "");
      setBasis(milestone?.basis ?? "koerpergewicht");
      setTarget(milestone?.target_rm != null ? String(milestone.target_rm) : "");
      setFaktor(milestone?.faktor != null ? String(milestone.faktor) : "");
      setSaved(false);
    }
  }, [open, milestone]);

  const zahl = (text: string): number =>
    Number(text.trim().replace(",", "."));
  const parsedTarget = zahl(target);
  const parsedFaktor = zahl(faktor);
  const wertOk =
    basis === "fix"
      ? !Number.isNaN(parsedTarget) && parsedTarget > 0
      : !Number.isNaN(parsedFaktor) && parsedFaktor > 0;
  const canSave = name.trim() !== "" && wertOk;

  // Vorschau des dynamischen Ziels: was ergibt der Faktor mit dem aktuellen
  // Basiswert? null heisst, im 30-Tage-Fenster liegt keine Messung.
  const vorschau =
    basis === "fix" || !wertOk
      ? null
      : zielWert({ basis, target_rm: null, faktor: parsedFaktor }, basisWerte);

  const save = async (): Promise<void> => {
    if (!canSave) return;
    const ziel =
      basis === "fix"
        ? ({ basis: "fix", targetRm: parsedTarget } as const)
        : ({ basis, faktor: parsedFaktor } as const);
    if (isEdit && milestone) {
      await update(milestone.id, name.trim(), ziel);
    } else {
      await add(exerciseId, name.trim(), ziel);
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

      <FieldLabel className="mb-2">Art des Ziels</FieldLabel>
      <SegmentedControl
        options={ARTEN}
        value={basis}
        onChange={setBasis}
        size="lg"
        surface="canvas"
        disabled={saved}
        ariaLabel="Art des Ziels"
        className="mb-[18px]"
      />

      {basis === "fix" ? (
        <>
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
            Der Fortschritt zählt gegen dein aktuelles geschätztes 1RM dieser
            Übung. Erreicht es das Ziel, wird der Meilenstein automatisch mit
            Datum als erreicht markiert.
          </p>
        </>
      ) : (
        <>
          <FieldLabel className="mb-2">Faktor</FieldLabel>
          <div className="mb-[18px] flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={faktor}
              onChange={(e) => setFaktor(e.target.value)}
              placeholder="1,0"
              min={0}
              step={0.05}
              disabled={saved}
              className="flex-1"
            />
            <span className="text-[14px] font-medium text-muted-foreground">
              × {BASIS_NAME[basis]}
            </span>
          </div>
          <p className="mx-0.5 -mt-2 mb-4 text-[12px] leading-[1.5] text-muted-foreground">
            {vorschau != null
              ? "Entspricht zurzeit " + fmtWeight(vorschau, unit) + "."
              : wertOk
                ? "In den letzten 30 Tagen liegt keine Messung für " +
                  BASIS_NAME[basis] +
                  " – der Meilenstein wartet darauf."
                : "Zum Beispiel 1,0 für einmal " + BASIS_NAME[basis] + "."}{" "}
            Das Ziel wird aus dem Durchschnitt deiner Messungen der letzten 30
            Tage gerechnet und wandert mit. Einmal erreicht, bleibt es erreicht.
          </p>
        </>
      )}

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
