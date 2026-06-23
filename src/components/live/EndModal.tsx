import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";

// Ende-Popup. Nutzt das Overlay-Primitive. Zeigt eine Zusammenfassung und bietet
// Speichern bzw. Verwerfen.
//
// Lieferung 1: es gibt noch keine Saetze, daher beenden beide Wege die Einheit
// nur lokal. Das normalisierte Schreiben in den Verlauf (und damit der echte
// Unterschied zwischen Speichern und Verwerfen) kommt mit Lieferung 4.
export function EndModal(): React.ReactElement {
  const live = useLiveSession();
  const s = live.session;
  const open = live.ending && s != null;

  return (
    <Overlay
      open={open}
      onClose={live.closeEnd}
      title={s ? "Workout " + s.title + " beenden" : undefined}
    >
      {s && (
        <>
          <div className="mb-4 flex flex-col gap-2">
            {s.exercisesPreview.map((name, i) => (
              <div
                key={name + i}
                className="rounded-[14px] bg-secondary px-4 py-3 text-[15px] font-medium text-foreground"
              >
                {name}
              </div>
            ))}
          </div>
          <div className="mb-3.5 text-center text-xs text-muted-foreground">
            Speichern übernimmt nur erledigte Sätze in den Verlauf.
          </div>
          <Button
            onClick={live.save}
            className="h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
          >
            Speichern
          </Button>
          <Button
            variant="destructive"
            onClick={live.discard}
            className="mt-2 h-auto w-full rounded-[14px] py-3.5 text-base leading-tight"
          >
            Verwerfen
          </Button>
        </>
      )}
    </Overlay>
  );
}
