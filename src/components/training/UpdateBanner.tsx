import { useState } from "react";
import { RefreshCw, ChevronRight } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useLiveSession } from "@/hooks/useLiveSession";
import { WhatsNewSheet } from "@/components/training/WhatsNewSheet";

// Hinweis-Streifen oben auf der Trainingsseite: erscheint nur, wenn eine neue
// Huelle wartet - und NICHT waehrend einer laufenden Einheit, damit ein Update
// nie mitten ins Training draengt. Antippen oeffnet das "Was ist neu"-Popup
// (WhatsNewSheet) mit "Aktualisieren"-Knopf, der die neue Huelle uebernimmt.
// Optik im Klar-Look wie die JourneyStrip.
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
        className="flex w-full items-center gap-3 rounded-card bg-card px-4 py-3 text-left text-foreground shadow-card transition-[filter] hover:brightness-[0.99] min-[960px]:gap-[14px] min-[960px]:rounded-[18px] min-[960px]:px-5 min-[960px]:py-4"
      >
        <div className="flex size-[38px] flex-none items-center justify-center rounded-control bg-primary/12 text-primary min-[960px]:size-[42px] min-[960px]:rounded-xl">
          <RefreshCw className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-foreground min-[960px]:text-[16px]">
            Neue Version verfügbar
          </div>
          <div className="truncate text-[13px] text-muted-foreground">
            Tippen, um zu sehen, was neu ist.
          </div>
        </div>
        <ChevronRight className="size-[18px] flex-none text-[#a0a0a5]" />
      </button>

      <WhatsNewSheet
        open={open}
        onClose={() => setOpen(false)}
        showApply
        onApply={applyUpdate}
      />
    </>
  );
}
