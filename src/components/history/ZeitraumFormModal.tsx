import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useZeitraumActions } from "@/hooks/useZeitraumActions";
import { ZEITRAUM_TYPEN } from "@/lib/zeitraeume";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ZeitraumRow, ZeitraumTyp } from "@/schemas";

// Popup zum Anlegen und Bearbeiten eines Zeitraums. Ohne `zeitraum` legt es neu
// an, mit `zeitraum` bearbeitet es diesen. Felder: Typ (feste Liste), Start,
// Ende und eine kurze Notiz. Das Ende ist optional: der Schalter „läuft noch“
// laesst es offen (gespeichert als null), sonst ist ein Enddatum Pflicht und
// darf nicht vor dem Start liegen. Nutzt das generische Overlay-Fundament.

const FELD_LABEL =
  "text-[12px] font-semibold tracking-[0.3px] text-muted-foreground";

export function ZeitraumFormModal({
  open,
  zeitraum,
  onClose,
}: {
  open: boolean;
  zeitraum: ZeitraumRow | null;
  onClose: () => void;
}): React.ReactElement {
  const { add, update, isPending } = useZeitraumActions();
  const [typ, setTyp] = useState<ZeitraumTyp>("heilfasten");
  const [startDatum, setStartDatum] = useState(todayISO());
  const [laeuftNoch, setLaeuftNoch] = useState(false);
  const [endDatum, setEndDatum] = useState(todayISO());
  const [notiz, setNotiz] = useState("");

  // Beim Oeffnen den Entwurf setzen: aus dem Zeitraum (Bearbeiten) oder frische
  // Vorgaben (Anlegen).
  useEffect(() => {
    if (!open) return;
    if (zeitraum) {
      setTyp(zeitraum.typ);
      setStartDatum(zeitraum.start_datum);
      setLaeuftNoch(zeitraum.end_datum === null);
      setEndDatum(zeitraum.end_datum ?? zeitraum.start_datum);
      setNotiz(zeitraum.notiz ?? "");
    } else {
      setTyp("heilfasten");
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
      notiz: notiz.trim() === "" ? null : notiz.trim(),
    };
    if (zeitraum) await update(zeitraum.id, felder);
    else await add(felder);
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
          <span className={FELD_LABEL}>Typ</span>
          <Select
            ariaLabel="Typ"
            value={typ}
            onChange={(v) => setTyp(v as ZeitraumTyp)}
            options={ZEITRAUM_TYPEN}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className={FELD_LABEL}>Start</span>
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
              <span className={FELD_LABEL}>Ende</span>
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
          <span className={FELD_LABEL}>Notiz</span>
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
