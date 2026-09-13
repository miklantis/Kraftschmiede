import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { FieldLabel } from "@/components/ui/field-label";
import { NoteBlock } from "@/components/ui/note-block";
import { SegmentedControl } from "@/components/ui/segmented";
import { useAddYoga } from "@/hooks/useAddYoga";
import { todayISO } from "@/lib/format";

// Yoga-Eintrag-Popup: Datum als drei Schnellwahl-Knoepfe und Dauer als Stepper.
// Keine freie Kalenderwahl – bewusst schlicht. Die Notiz laeuft ueber denselben
// Baustein wie bei allen anderen Einheiten-Arten: ohne Notiz nur ein schlanker
// "+ Notiz"-Knopf, damit die Optik schlicht bleibt.
// Die Tageswahl nutzt den app-weiten Segment-Umschalter (graue Schiene,
// weisse Markierung), nicht mehr eine eigene gruene Knopfreihe. Nutzt das
// generische Overlay-Fundament.
const DAYS = [
  { value: "0", label: "Heute" },
  { value: "1", label: "Gestern" },
  { value: "2", label: "Vorgestern" },
] as const;
const MIN_START = 80;
const STEP = 5;
const MIN_LO = 5;
const MIN_HI = 180;

// ISO-Datum fuer einen Tages-Offset zurueck von heute.
function dateForOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return todayISO(d);
}

export function YogaEntryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const [dayOffset, setDayOffset] = useState(0);
  const [minutes, setMinutes] = useState(MIN_START);
  const [notes, setNotes] = useState("");
  const { add, isPending } = useAddYoga();

  // Beim Oeffnen den Entwurf zuruecksetzen.
  useEffect(() => {
    if (open) {
      setDayOffset(0);
      setMinutes(MIN_START);
      setNotes("");
    }
  }, [open]);

  const adjust = (delta: number): void =>
    setMinutes((m) => Math.max(MIN_LO, Math.min(MIN_HI, m + delta)));

  const save = async (): Promise<void> => {
    await add(dateForOffset(dayOffset), minutes, notes.trim());
    onClose();
  };

  return (
    <Overlay open={open} onClose={onClose} title="Yoga eintragen">
      <FieldLabel>Datum</FieldLabel>
      <SegmentedControl
        options={DAYS}
        value={String(dayOffset) as "0" | "1" | "2"}
        onChange={(v) => setDayOffset(Number(v))}
        size="lg"
        surface="canvas"
        ariaLabel="Datum"
        className="mt-2 mb-[18px]"
      />

      <FieldLabel>Dauer</FieldLabel>
      <div className="mt-2 mb-5 flex items-center justify-between rounded-control bg-muted-canvas px-4 py-3">
        <button
          type="button"
          aria-label="Weniger"
          onClick={() => adjust(-STEP)}
          className="flex size-9 items-center justify-center rounded-control bg-card text-[20px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95"
        >
          −
        </button>
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-[26px] font-bold tabular-nums text-foreground min-[960px]:text-[28px]">
            {minutes}
          </span>
          <span className="text-[14px] font-medium text-muted-foreground">
            min
          </span>
        </span>
        <button
          type="button"
          aria-label="Mehr"
          onClick={() => adjust(STEP)}
          className="flex size-9 items-center justify-center rounded-control bg-card text-[20px] font-semibold text-foreground shadow-card transition-[filter] hover:brightness-95"
        >
          +
        </button>
      </div>

      {/* Notiz zur Einheit: schlanke Zeile unter der Dauer. */}
      <NoteBlock
        value={notes}
        onChange={setNotes}
        placeholder="Was ist in dieser Einheit passiert?"
        className="mb-5"
      />

      <button
        type="button"
        onClick={() => void save()}
        disabled={isPending}
        className="w-full rounded-control bg-yoga py-3 text-[15px] font-semibold text-white transition-[filter] hover:brightness-105 disabled:opacity-50"
      >
        Eintragen
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-1 w-full py-2.5 text-[14px] font-medium text-muted-foreground min-[960px]:hidden"
      >
        Abbrechen
      </button>
    </Overlay>
  );
}
