import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { FieldLabel } from "@/components/ui/field-label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useZeitraumActions } from "@/hooks/useZeitraumActions";
import { ZEITRAUM_TYPEN } from "@/lib/zeitraeume";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ZeitraumRow, ZeitraumTyp } from "@/schemas";

// Popup zum Anlegen und Bearbeiten eines Zeitraums. Ohne `zeitraum` legt es neu
// an, mit `zeitraum` bearbeitet es diesen. Felder: Typ (feste Liste), Name
// (Titel im Kalender-Band), Start, Ende und eine kurze Notiz. Das Ende ist optional: der Schalter „läuft noch“
// laesst es offen (gespeichert als null), sonst ist ein Enddatum Pflicht und
// darf nicht vor dem Start liegen. Nutzt das generische Overlay-Fundament.
// Beim Bearbeiten steht unten das Loeschen: erst der dezente Anstoss, nach
// Klick die rote Rueckfrage, erst der zweite Klick loescht und schliesst.

export function ZeitraumFormModal({
  open,
  zeitraum,
  onClose,
}: {
  open: boolean;
  zeitraum: ZeitraumRow | null;
  onClose: () => void;
}): React.ReactElement {
  const { add, update, remove, isPending } = useZeitraumActions();
  const [typ, setTyp] = useState<ZeitraumTyp>("heilfasten");
  const [name, setName] = useState("");
  const [startDatum, setStartDatum] = useState(todayISO());
  const [laeuftNoch, setLaeuftNoch] = useState(false);
  const [endDatum, setEndDatum] = useState(todayISO());
  const [notiz, setNotiz] = useState("");
  const [loeschenBestaetigen, setLoeschenBestaetigen] = useState(false);

  // Beim Oeffnen den Entwurf setzen: aus dem Zeitraum (Bearbeiten) oder frische
  // Vorgaben (Anlegen).
  useEffect(() => {
    if (!open) return;
    setLoeschenBestaetigen(false);
    if (zeitraum) {
      setTyp(zeitraum.typ);
      setName(zeitraum.name ?? "");
      setStartDatum(zeitraum.start_datum);
      setLaeuftNoch(zeitraum.end_datum === null);
      setEndDatum(zeitraum.end_datum ?? zeitraum.start_datum);
      setNotiz(zeitraum.notiz ?? "");
    } else {
      setTyp("heilfasten");
      setName("");
      setStartDatum(todayISO());
      setLaeuftNoch(false);
      setEndDatum(todayISO());
      setNotiz("");
    }
  }, [open, zeitraum]);

  const endeUngueltig = !laeuftNoch && endDatum < startDatum;
  const kannSpeichern =
    startDatum !== "" && (laeuftNoch || (endDatum !== "" && !endeUngueltig));

  const speichern = async (): Promise<void> => {
    if (!kannSpeichern) return;
    const felder = {
      typ,
      startDatum,
      endDatum: laeuftNoch ? null : endDatum,
      name: name.trim() === "" ? null : name.trim(),
      notiz: notiz.trim() === "" ? null : notiz.trim(),
    };
    if (zeitraum) await update(zeitraum.id, felder);
    else await add(felder);
    onClose();
  };

  const loeschen = async (): Promise<void> => {
    if (!zeitraum) return;
    await remove(zeitraum.id);
    onClose();
  };

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={zeitraum ? "Zeitraum bearbeiten" : "Zeitraum anlegen"}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FieldLabel>Typ</FieldLabel>
          <Select
            ariaLabel="Typ"
            value={typ}
            onChange={(v) => setTyp(v as ZeitraumTyp)}
            options={ZEITRAUM_TYPEN}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Name</FieldLabel>
          <Input
            type="text"
            aria-label="Name"
            placeholder="optional – erscheint im Kalender-Band"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Start</FieldLabel>
          <Input
            type="date"
            aria-label="Startdatum"
            value={startDatum}
            onChange={(e) => setStartDatum(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setLaeuftNoch((v) => !v)}
            className="flex items-center gap-2.5 text-left"
          >
            <span
              className={cn(
                "flex size-5 flex-none items-center justify-center rounded-[6px] border transition-colors",
                laeuftNoch
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-input",
              )}
            >
              {laeuftNoch && (
                <span className="text-[13px] font-bold leading-none">✓</span>
              )}
            </span>
            <span className="text-[14px] font-medium text-foreground">
              läuft noch (kein Ende)
            </span>
          </button>

          {!laeuftNoch && (
            <>
              <FieldLabel>Ende</FieldLabel>
              <Input
                type="date"
                aria-label="Enddatum"
                value={endDatum}
                min={startDatum}
                onChange={(e) => setEndDatum(e.target.value)}
              />
              {endeUngueltig && (
                <span className="text-[12px] text-danger">
                  Das Ende darf nicht vor dem Start liegen.
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Notiz</FieldLabel>
          <Input
            type="text"
            aria-label="Notiz"
            placeholder="optional"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
          />
        </div>

        <Button
          className="mt-1 w-full"
          disabled={!kannSpeichern || isPending}
          onClick={() => void speichern()}
        >
          {zeitraum ? "Speichern" : "Anlegen"}
        </Button>

        {zeitraum &&
          (loeschenBestaetigen ? (
            <button
              type="button"
              onClick={() => void loeschen()}
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-[13px] border border-danger/40 py-3 text-[14px] font-semibold text-danger transition-[filter] hover:brightness-95 disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              Wirklich löschen?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLoeschenBestaetigen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[13px] py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" />
              Zeitraum löschen
            </button>
          ))}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 text-[14px] font-medium text-muted-foreground min-[960px]:hidden"
        >
          Abbrechen
        </button>
      </div>
    </Overlay>
  );
}
