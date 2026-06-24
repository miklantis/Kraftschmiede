import { useState } from "react";
import { RefreshCw, ChevronRight } from "lucide-react";
import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useChangelog } from "@/hooks/useChangelog";
import { useLiveSession } from "@/hooks/useLiveSession";
import { longDateYearDE } from "@/lib/format";

// Hinweis-Streifen oben auf der Trainingsseite: erscheint nur, wenn eine neue
// Huelle wartet - und NICHT waehrend einer laufenden Einheit, damit ein Update
// nie mitten ins Training draengt (Lieferung 4). Antippen oeffnet das
// "Was ist neu"-Popup (Overlay-Primitive): Versionskennung im Kopf, scrollbare
// Aenderungsliste, "Aktualisieren" unten fixiert. Schliessen ohne Uebernehmen
// ueber X / Wegtippen / Escape. "Aktualisieren" aktiviert die neue Huelle und
// laedt einmal neu. Optik im Klar-Look wie die JourneyStrip.
export function UpdateBanner(): React.ReactElement | null {
  const { updateAvailable, applyUpdate } = useAppUpdate();
  const { session } = useLiveSession();
  const [open, setOpen] = useState(false);
  // Changelog erst beim Oeffnen laden (kein Netz-Abruf ohne Bedarf).
  const { entry, isLoading, isError } = useChangelog(open);

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

      <Overlay open={open} onClose={() => setOpen(false)} title="Was ist neu">
        {entry != null && (
          <div className="mb-[18px] flex-none text-[13px] font-medium text-muted-foreground">
            Version {entry.version} · {longDateYearDE(entry.date)}
          </div>
        )}

        {isLoading && (
          <p className="mb-[18px] text-[14px] text-muted-foreground">
            Änderungen werden geladen …
          </p>
        )}
        {isError && (
          <p className="mb-[18px] text-[14px] text-muted-foreground">
            Die Änderungsliste konnte nicht geladen werden. Du kannst die neue
            Version trotzdem übernehmen.
          </p>
        )}

        {/* Liste scrollt bei vielen Eintraegen innerhalb des Popups; der Knopf
            darunter bleibt sichtbar. */}
        {entry != null && (
          <ul className="mb-5 flex max-h-[45vh] flex-col gap-2.5 overflow-y-auto">
            {entry.changes.map((change, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[14px] leading-snug text-foreground"
              >
                <span className="mt-[7px] size-1.5 flex-none rounded-full bg-primary" />
                <span className="min-w-0 flex-1">{change}</span>
              </li>
            ))}
          </ul>
        )}

        <Button size="lg" className="w-full flex-none" onClick={applyUpdate}>
          Aktualisieren
        </Button>
      </Overlay>
    </>
  );
}
