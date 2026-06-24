import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, ChevronRight } from "lucide-react";
import { fetchLatestChangelog } from "@/lib/changelog";
import { longDateYearDE } from "@/lib/format";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { WhatsNewSheet } from "@/components/training/WhatsNewSheet";

// Versions-Panel auf der Einstellungen-Seite, direkt nach dem Konto-Block.
// Zeigt die aktuelle App-Version samt Datum (Quelle: public/changelog.json -
// dieselbe Datei wie "Was ist neu", keine zweite Pflegestelle). Antippen
// oeffnet das WhatsNewSheet. Der "Aktualisieren"-Knopf darin erscheint nur,
// wenn gerade eine neue Huelle wartet; sonst ist das Popup reine Info.
//
// Eigene Query (gecacht, beim Mount geladen) statt useChangelog: dort ist
// gcTime 0 und das Laden an "Popup offen" gekoppelt - hier soll die Version
// dagegen dauerhaft sichtbar sein.
export function AppVersionCard(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { updateAvailable, applyUpdate } = useAppUpdate();

  const { data: entry } = useQuery({
    queryKey: ["app-version"],
    queryFn: fetchLatestChangelog,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const versionText =
    entry != null
      ? `Version ${entry.version} · ${longDateYearDE(entry.date)}`
      : "Version wird geladen …";

  return (
    <div className="rounded-card bg-card shadow-card">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 p-4 text-left transition-[filter] hover:brightness-[0.99]"
      >
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-primary/12 text-primary">
          <Info className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-foreground">
            App-Version
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {versionText}
          </span>
        </span>
        <ChevronRight className="ml-auto size-[18px] flex-none text-[#a0a0a5]" />
      </button>

      <WhatsNewSheet
        open={open}
        onClose={() => setOpen(false)}
        showApply={updateAvailable}
        onApply={applyUpdate}
      />
    </div>
  );
}
