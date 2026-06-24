import { Overlay } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { useChangelog } from "@/hooks/useChangelog";
import { longDateYearDE } from "@/lib/format";

// Wiederverwendbares "Was ist neu"-Popup (Overlay-Primitive): Versionskennung
// im Kopf, scrollbare Aenderungsliste; "Aktualisieren" unten nur, wenn ein
// Update wartet (showApply). Wird an zwei Stellen genutzt:
//   - UpdateBanner (Trainingsseite): zeigt den Knopf, uebernimmt das Update.
//   - AppVersionCard (Einstellungen): reine Info, kein Knopf, solange kein
//     Update wartet.
// Schliessen ohne Uebernehmen ueber X / Wegtippen / Escape. Changelog wird erst
// beim Oeffnen geladen (open steuert den Abruf).
export function WhatsNewSheet({
  open,
  onClose,
  showApply,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  /** "Aktualisieren"-Knopf zeigen (nur sinnvoll, wenn eine neue Huelle wartet). */
  showApply: boolean;
  onApply?: () => void;
}): React.ReactElement {
  const { entry, isLoading, isError } = useChangelog(open);

  return (
    <Overlay open={open} onClose={onClose} title="Was ist neu">
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
          Die Änderungsliste konnte nicht geladen werden.
        </p>
      )}

      {/* Liste scrollt bei vielen Eintraegen innerhalb des Popups. */}
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

      {showApply && (
        // Etwas mehr Luft unter dem Knopf: das Popup ist reiner Text, da wirkt
        // der knappe Standardabstand des Overlays zu gedraengt.
        <div className="flex-none pb-3.5 min-[960px]:pb-2">
          <Button size="lg" className="w-full" onClick={onApply}>
            Aktualisieren
          </Button>
        </div>
      )}
    </Overlay>
  );
}
