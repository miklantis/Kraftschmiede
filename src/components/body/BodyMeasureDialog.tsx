import { useEffect, useState } from "react";
import { Overlay } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCompositionActions } from "@/hooks/useCompositionActions";
import type { CompositionFelder } from "@/hooks/useCompositionActions";
import { todayISO } from "@/lib/format";
import type { CompositionRow } from "@/schemas";

// Popup zum Anlegen und Bearbeiten einer Koerpermessung. Ohne `row` legt es neu
// an (alle Felder leer, Datum = heute), mit `row` bearbeitet es diesen Eintrag
// (Felder mit den Ist-Werten vorbefuellt). Nur das Datum ist Pflicht; alle
// Werte sind optional und duerfen leer bleiben – ein leer geraeumtes Feld
// entfernt den Wert beim Speichern bewusst.
//
// Es gilt ein Eintrag pro Tag (unique user_id,date). Beim Anlegen mit einem
// bereits belegten Datum weist der Dialog freundlich darauf hin, statt den
// vorhandenen Tag still zu ueberschreiben (belegte Tage kommen ueber
// `belegteDaten`). Beim Bearbeiten ist das eigene Datum davon ausgenommen.

const FELD_LABEL =
  "text-[12px] font-semibold tracking-[0.3px] text-muted-foreground";

// Wertfelder der Messung mit Label und Einheit, in Eingabe-Reihenfolge. Deckt
// die composition-Spalten ab (inkl. der Wasserwerte ECW/ICW).
const WERT_FELDER: ReadonlyArray<{
  key: keyof Omit<CompositionFelder, "date">;
  label: string;
  suffix: string;
}> = [
  { key: "weight", label: "Gewicht", suffix: "kg" },
  { key: "body_fat_kg", label: "Körperfett", suffix: "kg" },
  { key: "body_fat_pct", label: "Körperfett", suffix: "%" },
  { key: "skeletal_muscle_kg", label: "Skelettmuskelmasse (SMM)", suffix: "kg" },
  { key: "tbw_kg", label: "Gesamtkörperwasser (TBW)", suffix: "kg" },
  { key: "ecw_kg", label: "Extrazellulärwasser (ECW)", suffix: "kg" },
  { key: "icw_kg", label: "Intrazellulärwasser (ICW)", suffix: "kg" },
  { key: "phase_angle", label: "Phasenwinkel", suffix: "°" },
  { key: "visceral_fat", label: "Viszeralfett", suffix: "" },
];

type WertKey = (typeof WERT_FELDER)[number]["key"];

// Text-Entwurf je Wertfeld (leerer String = kein Wert).
type WerteEntwurf = Record<WertKey, string>;

const LEER_ENTWURF: WerteEntwurf = {
  weight: "",
  body_fat_kg: "",
  body_fat_pct: "",
  skeletal_muscle_kg: "",
  tbw_kg: "",
  ecw_kg: "",
  icw_kg: "",
  phase_angle: "",
  visceral_fat: "",
};

function textVon(value: number | null): string {
  return value == null ? "" : String(value);
}

// Text -> Zahl|null. Leerer/nur-Leerzeichen-Text ist null; Komma gilt als
// Dezimaltrenner. Ungueltiges bleibt null (die UI sperrt das Speichern vorab).
function zahlVon(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function BodyMeasureDialog({
  open,
  row,
  belegteDaten,
  onClose,
}: {
  open: boolean;
  row: CompositionRow | null;
  belegteDaten: string[];
  onClose: () => void;
}): React.ReactElement {
  const { add, update, isPending } = useCompositionActions();
  const [date, setDate] = useState(todayISO());
  const [werte, setWerte] = useState<WerteEntwurf>(LEER_ENTWURF);

  // Beim Oeffnen den Entwurf setzen: aus dem Eintrag (Bearbeiten) oder frisch
  // (Anlegen, Datum = heute).
  useEffect(() => {
    if (!open) return;
    if (row) {
      setDate(row.date);
      setWerte({
        weight: textVon(row.weight),
        body_fat_kg: textVon(row.body_fat_kg),
        body_fat_pct: textVon(row.body_fat_pct),
        skeletal_muscle_kg: textVon(row.skeletal_muscle_kg),
        tbw_kg: textVon(row.tbw_kg),
        ecw_kg: textVon(row.ecw_kg),
        icw_kg: textVon(row.icw_kg),
        phase_angle: textVon(row.phase_angle),
        visceral_fat: textVon(row.visceral_fat),
      });
    } else {
      setDate(todayISO());
      setWerte(LEER_ENTWURF);
    }
  }, [open, row]);

  // Ein anderer Eintrag belegt dieses Datum schon (eigenes Datum ausgenommen).
  const datumKollision =
    date !== "" &&
    date !== row?.date &&
    belegteDaten.includes(date);

  // Mindestens ein Wertfeld muss eine gueltige Zahl enthalten oder leer sein;
  // ungueltige Eingabe (Buchstaben) sperrt das Speichern.
  const werteUngueltig = WERT_FELDER.some(({ key }) => {
    const t = werte[key].trim();
    return t !== "" && zahlVon(t) === null;
  });

  const kannSpeichern = date !== "" && !datumKollision && !werteUngueltig;

  const speichern = async (): Promise<void> => {
    if (!kannSpeichern) return;
    const felder: CompositionFelder = {
      date,
      weight: zahlVon(werte.weight),
      body_fat_kg: zahlVon(werte.body_fat_kg),
      body_fat_pct: zahlVon(werte.body_fat_pct),
      skeletal_muscle_kg: zahlVon(werte.skeletal_muscle_kg),
      tbw_kg: zahlVon(werte.tbw_kg),
      ecw_kg: zahlVon(werte.ecw_kg),
      icw_kg: zahlVon(werte.icw_kg),
      phase_angle: zahlVon(werte.phase_angle),
      visceral_fat: zahlVon(werte.visceral_fat),
    };
    if (row) await update(row.id, felder);
    else await add(felder);
    onClose();
  };

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={row ? "Messung bearbeiten" : "Messung hinzufügen"}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className={FELD_LABEL}>Datum</span>
          <Input
            type="date"
            aria-label="Datum"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full min-w-0 max-w-full"
          />
          {datumKollision && (
            <span className="text-[12px] text-danger">
              Für diesen Tag gibt es bereits eine Messung. Bearbeite den
              vorhandenen Eintrag oder wähle ein anderes Datum.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-4 min-[520px]:grid-cols-2">
          {WERT_FELDER.map(({ key, label, suffix }) => (
            <div key={key} className="flex flex-col gap-2">
              <span className={FELD_LABEL}>
                {label}
                {suffix !== "" && (
                  <span className="ml-1 font-normal text-muted-foreground/70">
                    ({suffix})
                  </span>
                )}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={suffix === "" ? label : label + " in " + suffix}
                placeholder="optional"
                value={werte[key]}
                onChange={(e) =>
                  setWerte((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <Button
          className="mt-1 w-full"
          disabled={!kannSpeichern || isPending}
          onClick={() => void speichern()}
        >
          {row ? "Speichern" : "Hinzufügen"}
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
