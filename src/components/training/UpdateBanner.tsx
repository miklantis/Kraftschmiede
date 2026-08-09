import { useState } from "react";
import { RefreshCw, ChevronRight } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useLiveSession } from "@/hooks/useLiveSession";
import { WhatsNewSheet } from "@/components/training/WhatsNewSheet";

// Hinweis-Streifen oben auf der Trainingsseite: erscheint nur, wenn eine neue
// Huelle wartet - und NICHT waehrend einer laufenden Einheit, damit ein Update
// nie mitten ins Training draengt. Antippen oeffnet das "Was ist neu"-Popup
// (WhatsNewSheet) mit "Aktualisieren"-Knopf, der die neue Huelle uebernimmt.
// Optik im Klar-Look: hellgruene Flaeche mit gruenem Rahmen wie das
// "Bereit fuers Training"-Banner auf der Koerper-Seite, Icon und Pfeil bleiben.
export function UpdateBanner(): React.ReactElement | null {
  const { updateAvailable, applyUpdate } = useAppUpdate();
  const { session } = useLiveSession();
  const [open, setOpen] = useState(false);

  // Kein Hinweis ohne wartendes Update und nicht waehrend einer laufenden Einheit.
  if (!updateAvailable || session != null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[16px] border border-primary/25 bg-primary/10 px-4 py-3 text-left text-foreground transition-[filter] hover:brightness-[0.99] min-[960px]:gap-[14px] min-[960px]:px-5 min-[960px]:py-4"
      >
        <div className="flex size-[38px] flex-none items-center justify-center rounded-control bg-primary/12 text-primary min-[960px]:size-[42px] min-[960px]:rounded-xl">
          <RefreshCw className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-primary min-[960px]:text-[16px]">
            Neue Version verfügbar
          </div>
          <div className="truncate text-[13px] text-muted-foreground">
            Tippen, um zu sehen, was neu ist.
          </div>
        </div>
        <ChevronRight className="size-[18px] flex-none text-foreground-subtle" />
      </button>

      <WhatsNewSheet
        open={open}
        onClose={() => setOpen(false)}
        showApply
        onApply={() => {
          // Popup sofort schliessen (sichtbare Reaktion), dann die wartende
          // Huelle uebernehmen; applyUpdate laedt die Seite neu.
          setOpen(false);
          applyUpdate();
        }}
      />
    </>
  );
}
