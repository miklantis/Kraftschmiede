import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { DialogFooter } from "@/components/ui/dialog-footer";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { FieldLabel } from "@/components/ui/field-label";
import { Input } from "@/components/ui/input";
import { useMessgeraetActions } from "@/hooks/useMessgeraetActions";
import { messgeraetNameVergeben } from "@/lib/messgeraete";
import type { MeasurementDeviceRow } from "@/schemas";

// Anlegen/Bearbeiten eines Messgeraets ueber das generische Overlay. Einziges
// Feld ist der Name. geraet == null => Anlegen, sonst Umbenennen; im
// Bearbeiten-Modus zusaetzlich Loeschen mit Rueckfrage im selben Dialog.
// Fussleiste wie bei den Meilenstein-Dialogen (DialogFooter).
//
// Haengen Messungen am Geraet (`anzahlMessungen` > 0), ist Loeschen gesperrt:
// statt des Knopfs steht eine ruhige Zeile mit dem Grund, Umbenennen bleibt
// moeglich. Die Datenbank sperrt das Loeschen zusaetzlich (Migration 0065).
//
// Ein Name darf nur einmal vorkommen (ohne Gross-/Kleinschreibung), damit die
// Auswahl an der Messung eindeutig bleibt; die Pruefung liegt in
// lib/messgeraete.ts, die Datenbank sichert zusaetzlich ab.
export function MessgeraetDialog({
  open,
  geraet,
  geraete,
  anzahlMessungen,
  onClose,
}: {
  open: boolean;
  geraet: MeasurementDeviceRow | null;
  geraete: readonly MeasurementDeviceRow[];
  anzahlMessungen: number;
  onClose: () => void;
}): React.ReactElement {
  const { add, update, remove, isPending } = useMessgeraetActions();
  const isEdit = geraet !== null;

  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  // Beim Oeffnen frisch setzen (Bearbeiten vorbefuellt, Anlegen leer).
  useEffect(() => {
    if (!open) return;
    setName(geraet?.name ?? "");
    setSaved(false);
    setFehler(null);
  }, [open, geraet]);

  const vergeben = messgeraetNameVergeben(name, geraete, geraet?.id ?? null);
  const canSave = name.trim() !== "" && !vergeben;

  const save = async (): Promise<void> => {
    if (!canSave) return;
    setFehler(null);
    try {
      if (geraet) await update(geraet.id, name);
      else await add(name);
      setSaved(true);
    } catch {
      setFehler("Speichern hat nicht geklappt. Bitte noch einmal versuchen.");
    }
  };

  const doDelete = async (): Promise<void> => {
    if (!geraet) return;
    setFehler(null);
    try {
      await remove(geraet.id);
      onClose();
    } catch {
      setFehler("Löschen hat nicht geklappt. Bitte noch einmal versuchen.");
    }
  };

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={isEdit ? "Messgerät bearbeiten" : "Messgerät hinzufügen"}
    >
      <FieldLabel className="mb-2">Name</FieldLabel>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. InBody 570 – Studio Mitte"
        aria-label="Name des Messgeräts"
        disabled={saved}
        className="mb-2"
      />
      <p
        className={
          "mx-0.5 mb-4 text-[12px] leading-[1.5] " +
          (vergeben ? "text-danger" : "text-muted-foreground")
        }
      >
        {vergeben
          ? "Ein Messgerät mit diesem Namen gibt es schon."
          : "Modell und Studio im Namen helfen, Geräte auseinanderzuhalten."}
      </p>

      {fehler && (
        <p className="mx-0.5 mb-3 text-[12px] leading-[1.5] text-danger">
          {fehler}
        </p>
      )}

      <DialogFooter
        saved={saved}
        savedLabel={isEdit ? "Gespeichert" : "Angelegt"}
        actionLabel={isEdit ? "Speichern" : "Anlegen"}
        onAction={() => void save()}
        onClose={onClose}
        disabled={!canSave || isPending}
      >
        {isEdit && anzahlMessungen === 0 && (
          <DeleteConfirmButton
            label="Messgerät löschen"
            onDelete={() => void doDelete()}
            open={open}
            disabled={isPending}
            className="mt-3"
          />
        )}
        {isEdit && anzahlMessungen > 0 && (
          <p className="mx-0.5 mt-3 text-center text-[12px] leading-[1.5] text-muted-foreground">
            Löschen ist gesperrt, weil{" "}
            {anzahlMessungen === 1
              ? "eine Messung"
              : `${anzahlMessungen} Messungen`}{" "}
            an diesem Gerät {anzahlMessungen === 1 ? "hängt" : "hängen"}.
            Umbenennen geht jederzeit.
          </p>
        )}
      </DialogFooter>
    </Overlay>
  );
}
