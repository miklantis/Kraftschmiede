import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";

// Start-Popup (vor dem Workout). Nutzt das Overlay-Primitive (Desktop zentriert,
// Mobile Bodenblatt). Zeigt eine Vorschau der Einheit; "Los geht's" laesst das
// Popup ausfahren und danach das Panel hereinfahren (Uebergang im Store
// orchestriert). Lieferung 1: die Vorschau listet die Uebungsnamen; die
// Satz-Chips (Wdh x kg) kommen mit dem Coach in Lieferung 2.
export function StartModal(): React.ReactElement {
  const live = useLiveSession();
  const p = live.pending;

  return (
    <Overlay
      open={p != null}
      onClose={live.cancelStart}
      title={p ? "Workout " + p.title + " starten" : undefined}
    >
      {p && (
        <>
          <div className="mb-3 text-[13px] text-muted-foreground">
            {p.exercisesPreview.length} Übungen · Vorschau
          </div>
          <div className="mb-4 flex flex-col gap-2">
            {p.exercisesPreview.map((name, i) => (
              <div
                key={name + i}
                className="rounded-[14px] bg-secondary px-4 py-3 text-[15px] font-medium text-foreground"
              >
                {name}
              </div>
            ))}
          </div>
          <Button
            onClick={live.confirmStart}
            className="h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
          >
            Los geht’s
          </Button>
          <Button
            variant="outline"
            onClick={live.cancelStart}
            className="mt-2 h-auto w-full rounded-[14px] py-3.5 text-base leading-tight min-[960px]:hidden"
          >
            Abbrechen
          </Button>
        </>
      )}
    </Overlay>
  );
}
