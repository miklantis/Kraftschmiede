import { useState } from "react";
import { Plus, Check } from "lucide-react";
import { AccordionItem } from "@/components/ui/accordion";
import { COMPOSITION_EXAMPLE } from "@/lib/composition";
import { useImportComposition } from "@/hooks/useImportComposition";

// Aufklappbare Karte zum Einspielen eines Mess-JSON (InBody-Skill-Format oder
// Array). Textfeld + Beispiel + Importieren; gleiche Daten werden ueberschrieben.
// Nach Erfolg kurze Bestaetigung mit Anzahl, Feld wird geleert.
export function BodyImportCard(): React.ReactElement {
  const [text, setText] = useState("");
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const { importText, isPending, error } = useImportComposition();

  const onImport = async (): Promise<void> => {
    setDoneMsg(null);
    const count = await importText(text);
    setText("");
    setDoneMsg(
      count === 1 ? "1 Messung importiert." : count + " Messungen importiert.",
    );
  };

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex size-9 flex-none items-center justify-center rounded-[11px] bg-muted text-muted-foreground">
        <Plus className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-foreground">
          Messung per JSON einfügen
        </div>
        <div className="text-[13px] text-muted-foreground">
          InBody-/BIA-Export einfügen und importieren
        </div>
      </div>
    </div>
  );

  return (
    <AccordionItem header={header}>
      <p className="mb-2.5 text-[13px] text-muted-foreground">
        Erwartet {"{ \"composition\": [ … ] }"} oder ein Array. Jede Messung
        braucht ein date; gleiche Daten werden überschrieben.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDoneMsg(null);
        }}
        spellCheck={false}
        placeholder='{ "composition": [ { "date": "2026-06-15", "weight": 79.8 } ] }'
        className="h-40 w-full resize-y rounded-[11px] border border-border bg-input px-3 py-2.5 font-mono text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
      />
      <div className="mt-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            setText(COMPOSITION_EXAMPLE);
            setDoneMsg(null);
          }}
          className="rounded-[11px] bg-muted px-3.5 py-2 text-[13px] font-semibold text-foreground/80 hover:text-foreground"
        >
          Beispiel
        </button>
        <button
          type="button"
          onClick={() => void onImport()}
          disabled={isPending || text.trim() === ""}
          className="rounded-[11px] bg-primary px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {isPending ? "Importieren …" : "Importieren"}
        </button>
        {doneMsg && (
          <span className="flex items-center gap-1 text-[13px] text-primary">
            <Check className="size-[15px]" />
            {doneMsg}
          </span>
        )}
      </div>
      {error instanceof Error && (
        <div className="mt-2 text-[13px] text-danger">{error.message}</div>
      )}
    </AccordionItem>
  );
}
